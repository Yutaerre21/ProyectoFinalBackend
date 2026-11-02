import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { RegisterUser } from '../src/application/auth';
describe('API real con PostgreSQL y migraciones', () => {
  let app: INestApplication;
  let admin: string;
  let staff: string;
  let visitor: string;
  let staffId: string;
  let depositId: string;
  let recordId: string;
  let alertId: string;
  const password = 'Test-password-2026!';
  const suffix = Date.now();
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test'))
      throw new Error(
        'E2E requiere una DATABASE_URL que contenga test para impedir usar datos reales',
      );
    process.env.SEED_DEMO = 'false';
    process.env.SCHEDULER_ENABLED = 'false';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const register = app.get(RegisterUser);
    for (const role of ['ADMIN', 'STAFF', 'PUBLIC'] as const) {
      const email = `${role.toLowerCase()}-${suffix}@example.com`;
      const u = await register.execute(
        { name: `Demo ${role}`, email, password, consent: true },
        role,
      );
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(201);
      if (role === 'ADMIN') admin = login.body.accessToken;
      if (role === 'STAFF') {
        staff = login.body.accessToken;
        staffId = u.id;
      }
      if (role === 'PUBLIC') visitor = login.body.accessToken;
    }
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('salud, Swagger, autorización y errores uniformes', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    const docs = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(docs.body.paths['/api/v1/readings'].post).toBeDefined();
    const denied = await request(app.getHttpServer()).get('/api/v1/records').expect(401);
    expect(denied.body).toMatchObject({ statusCode: 401, path: '/api/v1/records' });
    await request(app.getHttpServer())
      .get('/api/v1/records')
      .auth(visitor, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/deposits')
      .auth(staff, { type: 'bearer' })
      .send({})
      .expect(403);
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/records')
      .auth(staff, { type: 'bearer' })
      .send({ title: 'X', unexpected: true })
      .expect(400);
    expect(Array.isArray(invalid.body.message)).toBe(true);
  });
  it('inventario CRUD, filtros, paginación y restricciones de unicidad', async () => {
    const d = await request(app.getHttpServer())
      .post('/api/v1/deposits')
      .auth(admin, { type: 'bearer' })
      .send({
        name: `Depósito ${suffix}`,
        tempMin: 18,
        tempMax: 24,
        humidityMin: 40,
        humidityMax: 60,
      })
      .expect(201);
    depositId = d.body.id;
    const payload = {
      code: `TEST-${suffix}`,
      title: 'Actas de prueba',
      depositId,
      shelf: 'E1',
      box: 'C1',
      description: 'Datos ficticios',
      inspectionDays: 30,
    };
    const r = await request(app.getHttpServer())
      .post('/api/v1/records')
      .auth(staff, { type: 'bearer' })
      .send(payload)
      .expect(201);
    recordId = r.body.id;
    await request(app.getHttpServer())
      .post('/api/v1/records')
      .auth(staff, { type: 'bearer' })
      .send(payload)
      .expect(409);
    await request(app.getHttpServer())
      .put(`/api/v1/records/${recordId}`)
      .auth(staff, { type: 'bearer' })
      .send({ ...payload, box: 'C2' })
      .expect(200);
    const list = await request(app.getHttpServer())
      .get(`/api/v1/records?q=TEST-${suffix}&limit=1&page=1&sort=title&order=ASC&archived=false`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].box).toBe('C2');
    await request(app.getHttpServer())
      .get('/api/v1/records?sort=invalid')
      .auth(staff, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/records?limit=1000')
      .auth(staff, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/records/not-a-uuid')
      .auth(staff, { type: 'bearer' })
      .expect(400);
  });
  it('inspección crítica concurrente no duplica alertas; conserva historial', async () => {
    const payload = {
      condition: 'CRITICO',
      notes: 'Humedad y desgaste observados en la inspección',
      pests: false,
      wear: true,
      moisture: true,
    };
    await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(`/api/v1/records/${recordId}/inspections`)
          .auth(staff, { type: 'bearer' })
          .send(payload)
          .expect(201),
      ),
    );
    const alerts = await request(app.getHttpServer())
      .get(`/api/v1/alerts?recordId=${recordId}&status=OPEN`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(alerts.body.total).toBe(1);
    alertId = alerts.body.items[0].id;
    const history = await request(app.getHttpServer())
      .get(`/api/v1/records/${recordId}/inspections`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(history.body.total).toBe(2);
  });
  it('ingesta fuera de rango, lectura atrasada y recuperación', async () => {
    const reading = {
      depositId,
      sensorId: 'TEST-SIM',
      temperature: 28,
      humidity: 70,
      measuredAt: new Date().toISOString(),
    };
    await request(app.getHttpServer())
      .post('/api/v1/readings')
      .auth(staff, { type: 'bearer' })
      .send({ ...reading, humidity: 101 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/readings')
      .auth(visitor, { type: 'bearer' })
      .send(reading)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/readings')
      .auth(staff, { type: 'bearer' })
      .send(reading)
      .expect(201);
    let list = await request(app.getHttpServer())
      .get(`/api/v1/alerts?depositId=${depositId}&status=OPEN`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(list.body.items.some((a: { kind: string }) => a.kind === 'ENVIRONMENT')).toBe(true);
    await request(app.getHttpServer())
      .post('/api/v1/readings')
      .auth(staff, { type: 'bearer' })
      .send({ ...reading, temperature: 22, humidity: 50, measuredAt: new Date().toISOString() })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/readings')
      .auth(staff, { type: 'bearer' })
      .send({ ...reading, measuredAt: new Date(Date.now() - 10000).toISOString() })
      .expect(201);
    list = await request(app.getHttpServer())
      .get(`/api/v1/alerts?depositId=${depositId}&status=OPEN`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(list.body.items.some((a: { kind: string }) => a.kind === 'ENVIRONMENT')).toBe(false);
  });
  it('intervención, prevención de duplicados y evidencia de resolución', async () => {
    const payload = {
      alertId,
      assigneeId: staffId,
      title: 'Aislar y evaluar expediente',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    };
    const task = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .auth(admin, { type: 'bearer' })
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .auth(admin, { type: 'bearer' })
      .send(payload)
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${task.body.id}`)
      .auth(staff, { type: 'bearer' })
      .send({ status: 'DONE', resolution: '' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${task.body.id}`)
      .auth(staff, { type: 'bearer' })
      .send({ status: 'IN_PROGRESS', resolution: '' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${task.body.id}`)
      .auth(staff, { type: 'bearer' })
      .send({ status: 'DONE', resolution: 'Se documentó y completó la intervención' })
      .expect(200);
    const alerts = await request(app.getHttpServer())
      .get(`/api/v1/alerts?recordId=${recordId}&status=OPEN`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(alerts.body.total).toBe(1);
    await request(app.getHttpServer())
      .post(`/api/v1/records/${recordId}/inspections`)
      .auth(staff, { type: 'bearer' })
      .send({
        condition: 'OPTIMO',
        notes: 'Nueva inspección verifica la recuperación',
        pests: false,
        wear: false,
        moisture: false,
      })
      .expect(201);
  });
  it('vencimientos reales, archivo lógico y dashboard', async () => {
    await app
      .get(DataSource)
      .query('UPDATE records SET "nextInspectionAt"=NOW()-INTERVAL \'1 day\' WHERE id=$1', [
        recordId,
      ]);
    await request(app.getHttpServer())
      .post('/api/v1/alerts/evaluate')
      .auth(staff, { type: 'bearer' })
      .expect(201);
    const alerts = await request(app.getHttpServer())
      .get(`/api/v1/alerts?recordId=${recordId}&status=OPEN`)
      .auth(staff, { type: 'bearer' })
      .expect(200);
    expect(alerts.body.items[0].kind).toBe('OVERDUE');
    await request(app.getHttpServer())
      .delete(`/api/v1/records/${recordId}`)
      .auth(staff, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/records/${recordId}`)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    const dash = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(
      dash.body.prioritizedAlerts.every((a: { recordId: string }) => a.recordId !== recordId),
    ).toBe(true);
  });
  it('registro público no escala rol y refresh es de un solo uso', async () => {
    const payload = {
      name: 'Visitante nuevo',
      email: `nuevo-${suffix}@example.com`,
      password,
      consent: true,
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...payload, role: 'ADMIN' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...payload, consent: false })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);
    expect(created.body.role).toBe('PUBLIC');
    expect(created.body.passwordHash).toBeUndefined();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: payload.email, password })
      .expect(201);
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/v1/auth/account')
      .auth(refreshed.body.accessToken, { type: 'bearer' })
      .send({ password })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(refreshed.body.accessToken, { type: 'bearer' })
      .expect(401);
  });
});
