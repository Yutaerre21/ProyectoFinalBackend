import { createDataSource, PgRepository } from './database';
import { SystemRuntime, JwtSecurity } from './security';
import { RegisterUser } from '../application/auth';
import {
  CreateDeposit,
  CreateRecord,
  RegisterInspection,
  IngestReading,
  EvaluateOverdue,
} from '../application/conservation';
import { Repository } from '../domain/ports';
export async function seed(repo: Repository) {
  const rt = new SystemRuntime();
  const security = new JwtSecurity(
    process.env.JWT_ACCESS_SECRET ?? '',
    process.env.JWT_REFRESH_SECRET ?? '',
  );
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('SEED_PASSWORD debe tener al menos 12 caracteres');
  if ((await repo.find('users', { email: 'admin@clena.example' })).length) return;
  const register = new RegisterUser(repo, rt, security);
  await register.execute(
    { name: 'Administración demo', email: 'admin@clena.example', password, consent: true },
    'ADMIN',
  );
  const staff = await register.execute(
    { name: 'Elena Martínez (demo)', email: 'personal@clena.example', password, consent: true },
    'STAFF',
  );
  await register.execute({
    name: 'Visitante demo',
    email: 'publico@clena.example',
    password,
    consent: true,
  });
  const deposit = await new CreateDeposit(repo, rt).execute({
    name: 'Depósito A · Documental',
    tempMin: 18,
    tempMax: 24,
    humidityMin: 40,
    humidityMax: 60,
  });
  await new CreateDeposit(repo, rt).execute({
    name: 'Depósito B · Hemeroteca',
    tempMin: 18,
    tempMax: 24,
    humidityMin: 40,
    humidityMax: 60,
  });
  for (const [i, title] of [
    'Actas del Concejo · colección de ejemplo',
    'Correspondencia portuaria · ejemplo',
    'Mapas históricos · colección de ejemplo',
    'Prensa regional · colección de ejemplo',
  ].entries()) {
    const r = await new CreateRecord(repo, rt).execute({
      code: `DEMO-${String(i + 1).padStart(3, '0')}`,
      title,
      depositId: deposit.id,
      shelf: `E-0${i + 1}`,
      box: `C-0${i + 1}`,
      description:
        'Material ficticio para la demostración académica. No pertenece al inventario real del CLENA.',
      inspectionDays: 30,
    });
    if (i !== 3)
      await new RegisterInspection(repo, rt).execute(r.id, staff.id, {
        condition: i === 0 ? 'CRITICO' : i === 1 ? 'REGULAR' : 'OPTIMO',
        notes:
          i === 0
            ? 'Se observa humedad simulada y desgaste en bordes.'
            : 'Revisión de demostración completada.',
        pests: false,
        wear: i === 0,
        moisture: i === 0,
      });
    else
      await repo.save('records', {
        ...r,
        nextInspectionAt: new Date(rt.now().getTime() - 2 * 86400000),
      });
  }
  await new IngestReading(repo, rt).execute({
    depositId: deposit.id,
    sensorId: 'SIM-A-01',
    temperature: 26.4,
    humidity: 68.2,
    measuredAt: rt.now(),
  });
  await new EvaluateOverdue(repo, rt).execute();
}
if (require.main === module) {
  const ds = createDataSource();
  ds.initialize()
    .then(async () => {
      await ds.runMigrations();
      await seed(new PgRepository(ds));
    })
    .finally(() => (ds.isInitialized ? ds.destroy() : undefined))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
