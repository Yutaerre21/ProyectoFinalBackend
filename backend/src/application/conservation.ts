import {
  Alert,
  BusinessError,
  checkRange,
  Deposit,
  Inspection,
  isOverdue,
  ListQuery,
  nextInspection,
  outsideRange,
  Reading,
  RecordFile,
  requireFound,
  Table,
  Task,
  assertTaskTransition,
} from '../domain/model';
import { Repository, Runtime } from '../domain/ports';
import { publicUser } from './auth';
type NewDeposit = Omit<Deposit, 'id' | 'createdAt'>;
type NewRecord = Pick<
  RecordFile,
  'code' | 'title' | 'depositId' | 'shelf' | 'box' | 'description' | 'inspectionDays'
>;
async function openAlert(
  repo: Repository,
  rt: Runtime,
  input: Omit<Alert, 'id' | 'createdAt' | 'status' | 'resolvedAt'>,
) {
  const existing = (await repo.find('alerts', { key: input.key, status: 'OPEN' }))[0];
  return repo.save('alerts', {
    ...input,
    id: existing?.id ?? rt.id(),
    createdAt: existing?.createdAt ?? rt.now(),
    status: 'OPEN',
    resolvedAt: null,
  });
}
async function resolve(repo: Repository, rt: Runtime, key: string) {
  for (const alert of await repo.find('alerts', { key, status: 'OPEN' }))
    await repo.save('alerts', { ...alert, status: 'RESOLVED', resolvedAt: rt.now() });
}
export class CreateDeposit {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute(input: NewDeposit) {
    checkRange(input);
    return this.repo.save('deposits', { ...input, id: this.rt.id(), createdAt: this.rt.now() });
  }
}
export class UpdateDeposit {
  constructor(private repo: Repository) {}
  async execute(id: string, input: NewDeposit) {
    checkRange(input);
    return this.repo.save('deposits', {
      ...requireFound(await this.repo.get('deposits', id), 'Depósito'),
      ...input,
    });
  }
}
export class CreateRecord {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  async execute(input: NewRecord) {
    requireFound(await this.repo.get('deposits', input.depositId), 'Depósito');
    return this.repo.save('records', {
      ...input,
      id: this.rt.id(),
      createdAt: this.rt.now(),
      condition: 'REGULAR',
      archived: false,
      nextInspectionAt: this.rt.now(),
    });
  }
}
export class UpdateRecord {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  async execute(id: string, input: NewRecord) {
    return this.repo.transaction(async (repo) => {
      const record = requireFound(await repo.get('records', id), 'Expediente');
      if (record.archived) throw new BusinessError(409, 'Expediente archivado');
      requireFound(await repo.get('deposits', input.depositId), 'Depósito');
      const history = await repo.list('inspections', {
        page: 1,
        limit: 1,
        sort: 'createdAt',
        order: 'DESC',
        recordId: id,
      });
      const updated = await repo.save('records', {
        ...record,
        ...input,
        nextInspectionAt: history.items[0]
          ? nextInspection(history.items[0].createdAt, input.inspectionDays)
          : record.nextInspectionAt,
      });
      for (const a of await repo.find('alerts', { recordId: id, status: 'OPEN' }))
        await repo.save('alerts', { ...a, depositId: input.depositId });
      if (!isOverdue(updated, this.rt.now())) await resolve(repo, this.rt, `OVERDUE:${id}`);
      return updated;
    });
  }
}
export class ArchiveRecord {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute(id: string) {
    return this.repo.transaction(async (repo) => {
      const record = requireFound(await repo.get('records', id), 'Expediente');
      await resolve(repo, this.rt, `CRITICAL:${id}`);
      await resolve(repo, this.rt, `OVERDUE:${id}`);
      return repo.save('records', { ...record, archived: true });
    });
  }
}
export class RegisterInspection {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute(
    recordId: string,
    inspectorId: string,
    input: Pick<Inspection, 'condition' | 'notes' | 'pests' | 'wear' | 'moisture'>,
  ) {
    return this.repo.transaction(async (repo) => {
      const record = requireFound(await repo.get('records', recordId), 'Expediente');
      if (record.archived)
        throw new BusinessError(409, 'No se puede inspeccionar un expediente archivado');
      const inspection = await repo.save('inspections', {
        ...input,
        id: this.rt.id(),
        createdAt: this.rt.now(),
        recordId,
        inspectorId,
      });
      await repo.save('records', {
        ...record,
        condition: input.condition,
        nextInspectionAt: nextInspection(this.rt.now(), record.inspectionDays),
      });
      await resolve(repo, this.rt, `OVERDUE:${recordId}`);
      if (input.condition === 'CRITICO')
        await openAlert(repo, this.rt, {
          kind: 'CRITICAL',
          priority: 1,
          recordId,
          depositId: record.depositId,
          key: `CRITICAL:${recordId}`,
          message: `${record.code}: inspección en estado crítico. ${input.notes}`,
        });
      else await resolve(repo, this.rt, `CRITICAL:${recordId}`);
      return inspection;
    });
  }
}
export class IngestReading {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  async execute(
    input: Pick<Reading, 'depositId' | 'sensorId' | 'temperature' | 'humidity'> & {
      measuredAt: Date;
    },
  ) {
    if (
      input.measuredAt.getTime() > this.rt.now().getTime() + 60000 ||
      input.measuredAt.getTime() < this.rt.now().getTime() - 86400000
    )
      throw new BusinessError(
        400,
        'La lectura debe corresponder a las últimas 24 horas y no estar en el futuro',
      );
    return this.repo.transaction(async (repo) => {
      const deposit = requireFound(await repo.get('deposits', input.depositId), 'Depósito');
      const previous = (
        await repo.list('readings', {
          page: 1,
          limit: 1,
          sort: 'measuredAt',
          order: 'DESC',
          depositId: input.depositId,
        })
      ).items[0];
      const reading = await repo.save('readings', {
        ...input,
        id: this.rt.id(),
        createdAt: this.rt.now(),
      });
      // Las lecturas atrasadas quedan en el historial sin sobrescribir el estado vigente.
      if (!previous || input.measuredAt >= previous.measuredAt) {
        if (outsideRange(reading, deposit))
          await openAlert(repo, this.rt, {
            kind: 'ENVIRONMENT',
            priority: 2,
            recordId: null,
            depositId: deposit.id,
            key: `ENVIRONMENT:${deposit.id}`,
            message: `${deposit.name}: ${reading.temperature} °C / ${reading.humidity} % HR fuera del rango configurado`,
          });
        else await resolve(repo, this.rt, `ENVIRONMENT:${deposit.id}`);
      }
      return reading;
    });
  }
}
export class EvaluateOverdue {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute() {
    return this.repo.transaction(async (repo) => {
      let count = 0;
      for (const record of await repo.find('records', { archived: false }))
        if (isOverdue(record, this.rt.now())) {
          await openAlert(repo, this.rt, {
            kind: 'OVERDUE',
            priority: 3,
            recordId: record.id,
            depositId: record.depositId,
            key: `OVERDUE:${record.id}`,
            message: `${record.code}: inspección vencida desde ${record.nextInspectionAt.toISOString().slice(0, 10)}`,
          });
          count++;
        }
      return { evaluatedAt: this.rt.now(), overdue: count };
    });
  }
}
export class AssignTask {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute(input: Pick<Task, 'alertId' | 'assigneeId' | 'title'> & { dueAt: Date }) {
    return this.repo.transaction(async (repo) => {
      const alert = requireFound(await repo.get('alerts', input.alertId), 'Alerta');
      if (alert.status !== 'OPEN') throw new BusinessError(409, 'La alerta ya está resuelta');
      const user = requireFound(await repo.get('users', input.assigneeId), 'Responsable');
      if (!user.active || user.role === 'PUBLIC')
        throw new BusinessError(400, 'El responsable debe ser personal activo del CLENA');
      if (input.dueAt <= this.rt.now())
        throw new BusinessError(400, 'La fecha de entrega debe estar en el futuro');
      if ((await repo.find('tasks', { alertId: input.alertId })).some((t) => t.status !== 'DONE'))
        throw new BusinessError(409, 'Esta alerta ya tiene una tarea activa');
      return repo.save('tasks', {
        ...input,
        id: this.rt.id(),
        createdAt: this.rt.now(),
        status: 'PENDING',
        resolution: '',
        completedAt: null,
      });
    });
  }
}
export class UpdateTask {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  execute(
    id: string,
    input: { status: Task['status']; resolution: string },
    actor: { id: string; role: string },
  ) {
    return this.repo.transaction(async (repo) => {
      const task = requireFound(await repo.get('tasks', id), 'Tarea');
      if (actor.role !== 'ADMIN' && task.assigneeId !== actor.id)
        throw new BusinessError(
          403,
          'Solo el responsable o un administrador puede actualizar esta tarea',
        );
      assertTaskTransition(task.status, input.status, input.resolution);
      // Finalizar una tarea no implica que el riesgo haya desaparecido: se requiere una nueva medición/inspección.
      return repo.save('tasks', {
        ...task,
        ...input,
        completedAt: input.status === 'DONE' ? this.rt.now() : null,
      });
    });
  }
}
export class ListItems {
  constructor(private repo: Repository) {}
  async execute(table: Exclude<Table, 'sessions'>, query: ListQuery) {
    if (table === 'users') {
      const result = await this.repo.list('users', query);
      return { ...result, items: result.items.map(publicUser) };
    }
    return this.repo.list(table, query);
  }
}
export class GetRecord {
  constructor(private repo: Repository) {}
  async execute(id: string) {
    return requireFound(await this.repo.get('records', id), 'Expediente');
  }
}
export class GetDashboard {
  constructor(
    private repo: Repository,
    private rt: Runtime,
  ) {}
  async execute() {
    const [records, alerts, tasks, readings] = await Promise.all([
      this.repo.find('records', { archived: false }),
      this.repo.find('alerts', { status: 'OPEN' }),
      this.repo.find('tasks', {}),
      this.repo.list('readings', { page: 1, limit: 8, sort: 'measuredAt', order: 'DESC' }),
    ]);
    return {
      records: records.length,
      critical: records.filter((r) => r.condition === 'CRITICO').length,
      openAlerts: alerts.length,
      pendingTasks: tasks.filter((t) => t.status !== 'DONE').length,
      overdue: records.filter((r) => isOverdue(r, this.rt.now())).length,
      prioritizedAlerts: alerts
        .sort((a, b) => a.priority - b.priority || a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, 8),
      recentReadings: readings.items,
    };
  }
}
export class Health {
  constructor(private repo: Repository) {}
  async execute() {
    if (!(await this.repo.health())) throw new BusinessError(503, 'Base de datos no disponible');
    return { status: 'ok', database: 'up' };
  }
}
