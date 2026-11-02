import { Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as auth from './application/auth';
import * as conservation from './application/conservation';
import { createDataSource, PgRepository } from './infrastructure/database';
import { JwtSecurity, SystemRuntime } from './infrastructure/security';
import { seed } from './infrastructure/seed';
import {
  AuthController,
  ConservationController,
  HealthController,
} from './presentation/controllers';
import { AccessGuard } from './presentation/http';
import { Repository, Runtime, Security } from './domain/ports';
export const REPOSITORY = Symbol('Repository');
export const RUNTIME = Symbol('Runtime');
export const SECURITY = Symbol('Security');
const authProviders = [auth.RegisterUser, auth.Login, auth.RefreshSession, auth.Authenticate].map(
  (useCase) => ({
    provide: useCase,
    useFactory: (repo: Repository, rt: Runtime, s: Security) => new useCase(repo, rt, s),
    inject: [REPOSITORY, RUNTIME, SECURITY],
  }),
);
const conservationProviders = [
  conservation.CreateDeposit,
  conservation.CreateRecord,
  conservation.UpdateRecord,
  conservation.ArchiveRecord,
  conservation.RegisterInspection,
  conservation.IngestReading,
  conservation.EvaluateOverdue,
  conservation.AssignTask,
  conservation.UpdateTask,
  conservation.GetDashboard,
].map((useCase) => ({
  provide: useCase,
  useFactory: (repo: Repository, rt: Runtime) => new useCase(repo, rt),
  inject: [REPOSITORY, RUNTIME],
}));
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [AuthController, ConservationController, HealthController],
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        const ds = createDataSource();
        await ds.initialize();
        await ds.runMigrations();
        return ds;
      },
    },
    {
      provide: REPOSITORY,
      useFactory: (ds: DataSource) => new PgRepository(ds),
      inject: [DataSource],
    },
    { provide: RUNTIME, useClass: SystemRuntime },
    {
      provide: SECURITY,
      useFactory: () =>
        new JwtSecurity(process.env.JWT_ACCESS_SECRET ?? '', process.env.JWT_REFRESH_SECRET ?? ''),
    },
    ...authProviders,
    ...conservationProviders,
    ...[
      auth.Logout,
      conservation.ListItems,
      conservation.GetRecord,
      conservation.Health,
      conservation.UpdateDeposit,
    ].map((useCase) => ({
      provide: useCase,
      useFactory: (r: Repository) => new useCase(r),
      inject: [REPOSITORY],
    })),
    {
      provide: auth.DeleteAccount,
      useFactory: (r: Repository, s: Security) => new auth.DeleteAccount(r, s),
      inject: [REPOSITORY, SECURITY],
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private logger = new Logger('Scheduler');
  private busy = false;
  constructor(
    private ds: DataSource,
    private overdue: conservation.EvaluateOverdue,
  ) {}
  async onModuleInit() {
    if (process.env.SEED_DEMO === 'true') await seed(new PgRepository(this.ds));
    if (process.env.SCHEDULER_ENABLED !== 'false') {
      await this.run();
      this.timer = setInterval(() => void this.run(), 60000);
      this.timer.unref();
    }
  }
  private async run() {
    if (this.busy) return;
    this.busy = true;
    try {
      const result = await this.overdue.execute();
      this.logger.log({ event: 'overdue_evaluated', ...result });
    } catch {
      this.logger.error({ event: 'overdue_evaluation_failed' });
    } finally {
      this.busy = false;
    }
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.ds.isInitialized) await this.ds.destroy();
  }
}
