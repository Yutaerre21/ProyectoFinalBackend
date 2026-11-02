import { MigrationInterface, QueryRunner } from 'typeorm';
export class Initial1791417600000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
CREATE TABLE users (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, name varchar(100) NOT NULL, email varchar(254) UNIQUE NOT NULL, "passwordHash" varchar NOT NULL, role varchar NOT NULL CHECK(role IN ('ADMIN','STAFF','PUBLIC')), "consentAt" timestamptz NOT NULL, active boolean NOT NULL);
CREATE TABLE sessions (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, "userId" uuid NOT NULL REFERENCES users(id), "tokenHash" varchar NOT NULL, "expiresAt" timestamptz NOT NULL);
CREATE INDEX sessions_user_idx ON sessions("userId");
CREATE TABLE deposits (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, name varchar(100) UNIQUE NOT NULL, "tempMin" double precision NOT NULL, "tempMax" double precision NOT NULL, "humidityMin" double precision NOT NULL, "humidityMax" double precision NOT NULL, CHECK("tempMin" < "tempMax"), CHECK("humidityMin" < "humidityMax"), CHECK("humidityMin" >= 0 AND "humidityMax" <= 100));
CREATE TABLE records (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, code varchar(40) UNIQUE NOT NULL, title varchar(200) NOT NULL, "depositId" uuid NOT NULL REFERENCES deposits(id), shelf varchar(50) NOT NULL, box varchar(50) NOT NULL, description text NOT NULL, "inspectionDays" integer NOT NULL CHECK("inspectionDays" BETWEEN 1 AND 365), "nextInspectionAt" timestamptz NOT NULL, condition varchar NOT NULL CHECK(condition IN ('OPTIMO','REGULAR','CRITICO')), archived boolean NOT NULL);
CREATE INDEX records_deposit_idx ON records("depositId");
CREATE INDEX records_due_idx ON records("nextInspectionAt") WHERE NOT archived;
CREATE INDEX records_condition_idx ON records(condition);
CREATE INDEX records_title_idx ON records(lower(title) text_pattern_ops);
CREATE TABLE inspections (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, "recordId" uuid NOT NULL REFERENCES records(id), "inspectorId" uuid NOT NULL REFERENCES users(id), condition varchar NOT NULL CHECK(condition IN ('OPTIMO','REGULAR','CRITICO')), notes text NOT NULL, pests boolean NOT NULL, wear boolean NOT NULL, moisture boolean NOT NULL);
CREATE INDEX inspections_history_idx ON inspections("recordId", "createdAt" DESC);
CREATE TABLE readings (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, "depositId" uuid NOT NULL REFERENCES deposits(id), "sensorId" varchar(80) NOT NULL, temperature double precision NOT NULL CHECK(temperature BETWEEN -50 AND 80), humidity double precision NOT NULL CHECK(humidity BETWEEN 0 AND 100), "measuredAt" timestamptz NOT NULL);
CREATE INDEX readings_deposit_date_idx ON readings("depositId", "measuredAt" DESC);
CREATE TABLE alerts (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, kind varchar NOT NULL CHECK(kind IN ('CRITICAL','OVERDUE','ENVIRONMENT')), priority integer NOT NULL CHECK(priority BETWEEN 1 AND 3), "recordId" uuid REFERENCES records(id), "depositId" uuid NOT NULL REFERENCES deposits(id), message text NOT NULL, status varchar NOT NULL CHECK(status IN ('OPEN','RESOLVED')), "resolvedAt" timestamptz, key varchar NOT NULL);
CREATE UNIQUE INDEX alerts_open_key_idx ON alerts(key) WHERE status='OPEN';
CREATE INDEX alerts_priority_idx ON alerts(status,priority,"createdAt");
CREATE TABLE tasks (id uuid PRIMARY KEY, "createdAt" timestamptz NOT NULL, "alertId" uuid NOT NULL REFERENCES alerts(id), "assigneeId" uuid NOT NULL REFERENCES users(id), title varchar(200) NOT NULL, "dueAt" timestamptz NOT NULL, status varchar NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','DONE')), resolution text NOT NULL, "completedAt" timestamptz);
CREATE UNIQUE INDEX tasks_active_alert_idx ON tasks("alertId") WHERE status <> 'DONE';
CREATE INDEX tasks_assignee_idx ON tasks("assigneeId");
CREATE INDEX tasks_status_due_idx ON tasks(status,"dueAt");
CREATE INDEX users_role_idx ON users(role) WHERE active;
  `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TABLE tasks, alerts, readings, inspections, records, deposits, sessions, users',
    );
  }
}
