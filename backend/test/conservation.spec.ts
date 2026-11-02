import * as C from '../src/application/conservation';
import { RegisterUser } from '../src/application/auth';
import { FakeSecurity, MemoryRepository, TestRuntime } from './memory';
import { Deposit, RecordFile } from '../src/domain/model';
describe('Casos de uso de conservación', () => {
  let repo: MemoryRepository;
  let rt: TestRuntime;
  let deposit: Deposit;
  let record: RecordFile;
  let staffId: string;
  const input = {
    code: 'EXP-001',
    title: 'Archivo de prueba',
    shelf: 'E1',
    box: 'C1',
    description: 'Ficticio',
    inspectionDays: 30,
  };
  const inspection = {
    condition: 'CRITICO' as const,
    notes: 'Humedad y deterioro visibles',
    pests: false,
    wear: true,
    moisture: true,
  };
  beforeEach(async () => {
    repo = new MemoryRepository();
    rt = new TestRuntime();
    deposit = await new C.CreateDeposit(repo, rt).execute({
      name: 'A',
      tempMin: 18,
      tempMax: 24,
      humidityMin: 40,
      humidityMax: 60,
    });
    record = await new C.CreateRecord(repo, rt).execute({ ...input, depositId: deposit.id });
    staffId = (
      await new RegisterUser(repo, rt, new FakeSecurity()).execute(
        { name: 'Staff', email: 'staff@example.com', password: 'pass', consent: true },
        'STAFF',
      )
    ).id;
  });
  it('crea y edita depósitos y expedientes; rechaza referencias inválidas', async () => {
    expect(record.nextInspectionAt).toEqual(rt.now());
    expect(record.condition).toBe('REGULAR');
    await new C.UpdateDeposit(repo).execute(deposit.id, { ...deposit, tempMax: 25 });
    expect((await repo.get('deposits', deposit.id))?.tempMax).toBe(25);
    await expect(
      new C.CreateRecord(repo, rt).execute({ ...input, depositId: 'no' }),
    ).rejects.toThrow('Depósito');
    const update = new C.UpdateRecord(repo, rt);
    const r = await update.execute(record.id, {
      ...input,
      depositId: deposit.id,
      title: 'Nuevo título',
    });
    expect(r.title).toBe('Nuevo título');
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, inspection);
    const changed = await update.execute(record.id, {
      ...input,
      depositId: deposit.id,
      inspectionDays: 7,
    });
    expect(changed.nextInspectionAt.getTime() - rt.now().getTime()).toBe(7 * 86400000);
    expect((await new C.GetRecord(repo).execute(record.id)).id).toBe(record.id);
  });
  it('abre alerta crítica sin duplicar y conserva historial inmutable', async () => {
    const inspect = new C.RegisterInspection(repo, rt);
    await inspect.execute(record.id, staffId, inspection);
    await inspect.execute(record.id, staffId, {
      ...inspection,
      notes: 'Nueva observación del riesgo',
    });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(1);
    expect(await repo.find('inspections', {})).toHaveLength(2);
    await inspect.execute(record.id, staffId, { ...inspection, condition: 'OPTIMO' });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(0);
    expect((await repo.get('records', record.id))?.condition).toBe('OPTIMO');
    await inspect.execute(record.id, staffId, inspection);
    expect(await repo.find('alerts', {})).toHaveLength(2);
  });
  it('evalúa vencimientos de forma idempotente y los resuelve al inspeccionar', async () => {
    const evaluate = new C.EvaluateOverdue(repo, rt);
    expect((await evaluate.execute()).overdue).toBe(0);
    rt.advance(1);
    expect((await evaluate.execute()).overdue).toBe(1);
    await evaluate.execute();
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(1);
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, {
      ...inspection,
      condition: 'REGULAR',
    });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(0);
  });
  it('una lectura normal resuelve riesgo y una atrasada no cambia el vigente', async () => {
    const ingest = new C.IngestReading(repo, rt);
    const base = {
      depositId: deposit.id,
      sensorId: 'SIM',
      temperature: 28,
      humidity: 70,
      measuredAt: rt.now(),
    };
    await ingest.execute(base);
    rt.advance(1000);
    await ingest.execute({ ...base, measuredAt: rt.now() });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(1);
    await ingest.execute({
      ...base,
      temperature: 22,
      humidity: 50,
      measuredAt: new Date(rt.now().getTime() - 500),
    });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(1);
    rt.advance(1000);
    await ingest.execute({ ...base, temperature: 22, humidity: 50, measuredAt: rt.now() });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(0);
    await ingest.execute({ ...base, measuredAt: new Date(rt.now().getTime() - 500) });
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(0);
    await expect(
      ingest.execute({ ...base, measuredAt: new Date(rt.now().getTime() + 61000) }),
    ).rejects.toThrow('24 horas');
    await expect(
      ingest.execute({ ...base, measuredAt: new Date(rt.now().getTime() - 86400001) }),
    ).rejects.toThrow('24 horas');
    await expect(ingest.execute({ ...base, depositId: 'missing' })).rejects.toThrow('Depósito');
  });
  it('archiva sin borrar historial y rechaza nuevas inspecciones o edición', async () => {
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, inspection);
    await new C.ArchiveRecord(repo, rt).execute(record.id);
    expect(await repo.find('alerts', { status: 'OPEN' })).toHaveLength(0);
    expect(await repo.find('inspections', {})).toHaveLength(1);
    await expect(
      new C.RegisterInspection(repo, rt).execute(record.id, staffId, inspection),
    ).rejects.toThrow('archivado');
    await expect(
      new C.UpdateRecord(repo, rt).execute(record.id, { ...input, depositId: deposit.id }),
    ).rejects.toThrow('archivado');
    rt.advance(50 * 86400000);
    expect((await new C.EvaluateOverdue(repo, rt).execute()).overdue).toBe(0);
  });
  it('asigna, valida responsable y fecha, impide duplicados y controla transiciones', async () => {
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, inspection);
    const alert = (await repo.find('alerts', {}))[0];
    const assign = new C.AssignTask(repo, rt);
    const input = {
      alertId: alert.id,
      assigneeId: staffId,
      title: 'Inspeccionar y documentar',
      dueAt: new Date(rt.now().getTime() + 86400000),
    };
    await expect(assign.execute({ ...input, dueAt: rt.now() })).rejects.toThrow('futuro');
    const publicId = (
      await new RegisterUser(repo, rt, new FakeSecurity()).execute({
        name: 'Público',
        email: 'public@example.com',
        password: 'x',
        consent: true,
      })
    ).id;
    await expect(assign.execute({ ...input, assigneeId: publicId })).rejects.toThrow(
      'personal activo',
    );
    await repo.save('users', { ...(await repo.get('users', publicId))!, active: false });
    await expect(assign.execute({ ...input, assigneeId: publicId })).rejects.toThrow(
      'personal activo',
    );
    const task = await assign.execute(input);
    await expect(assign.execute(input)).rejects.toThrow('tarea activa');
    const update = new C.UpdateTask(repo, rt);
    await expect(
      update.execute(
        task.id,
        { status: 'IN_PROGRESS', resolution: '' },
        { id: 'otro', role: 'STAFF' },
      ),
    ).rejects.toThrow('responsable');
    await update.execute(
      task.id,
      { status: 'IN_PROGRESS', resolution: '' },
      { id: staffId, role: 'STAFF' },
    );
    await update.execute(
      task.id,
      { status: 'DONE', resolution: 'Se realizó revisión y estabilización' },
      { id: 'admin', role: 'ADMIN' },
    );
    expect((await repo.get('alerts', alert.id))?.status).toBe('OPEN');
    expect((await repo.get('tasks', task.id))?.completedAt).toEqual(rt.now());
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, {
      ...inspection,
      condition: 'OPTIMO',
    });
    await expect(assign.execute(input)).rejects.toThrow('resuelta');
  });
  it('dashboard, listados sin secretos y salud', async () => {
    await new C.RegisterInspection(repo, rt).execute(record.id, staffId, inspection);
    rt.advance(31 * 86400000);
    await new C.EvaluateOverdue(repo, rt).execute();
    const alert = (await repo.find('alerts', {}))[0];
    await new C.AssignTask(repo, rt).execute({
      alertId: alert.id,
      assigneeId: staffId,
      title: 'Revisar',
      dueAt: new Date(rt.now().getTime() + 1000),
    });
    const dash = await new C.GetDashboard(repo, rt).execute();
    expect(dash).toMatchObject({
      records: 1,
      critical: 1,
      openAlerts: 2,
      pendingTasks: 1,
      overdue: 1,
    });
    expect(dash.prioritizedAlerts[0].priority).toBe(1);
    const list = new C.ListItems(repo);
    expect(
      (await list.execute('users', { page: 1, limit: 10, sort: 'createdAt', order: 'DESC' }))
        .items[0],
    ).not.toHaveProperty('passwordHash');
    expect(
      (await list.execute('records', { page: 1, limit: 10, sort: 'createdAt', order: 'DESC' }))
        .total,
    ).toBe(1);
    expect(await new C.Health(repo).execute()).toEqual({ status: 'ok', database: 'up' });
    repo.health = async () => false;
    await expect(new C.Health(repo).execute()).rejects.toThrow('no disponible');
  });
});
