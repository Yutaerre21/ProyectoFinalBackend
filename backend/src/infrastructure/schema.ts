import { EntitySchema, EntitySchemaColumnOptions } from 'typeorm';
import { Table } from '../domain/model';
const str: EntitySchemaColumnOptions = { type: 'varchar' };
const num: EntitySchemaColumnOptions = { type: 'double precision' };
const date: EntitySchemaColumnOptions = { type: 'timestamptz' };
const uuid: EntitySchemaColumnOptions = { type: 'uuid' };
const bool: EntitySchemaColumnOptions = { type: 'boolean' };
const columns: Record<Table, Record<string, EntitySchemaColumnOptions>> = {
  users: { name: str, email: str, passwordHash: str, role: str, consentAt: date, active: bool },
  sessions: { userId: uuid, tokenHash: str, expiresAt: date },
  deposits: { name: str, tempMin: num, tempMax: num, humidityMin: num, humidityMax: num },
  records: {
    code: str,
    title: str,
    depositId: uuid,
    shelf: str,
    box: str,
    description: { type: 'text' },
    inspectionDays: { type: 'integer' },
    nextInspectionAt: date,
    condition: str,
    archived: bool,
  },
  inspections: {
    recordId: uuid,
    inspectorId: uuid,
    condition: str,
    notes: { type: 'text' },
    pests: bool,
    wear: bool,
    moisture: bool,
  },
  readings: { depositId: uuid, sensorId: str, temperature: num, humidity: num, measuredAt: date },
  alerts: {
    kind: str,
    priority: { type: 'integer' },
    recordId: { ...uuid, nullable: true },
    depositId: uuid,
    message: { type: 'text' },
    status: str,
    resolvedAt: { ...date, nullable: true },
    key: str,
  },
  tasks: {
    alertId: uuid,
    assigneeId: uuid,
    title: str,
    dueAt: date,
    status: str,
    resolution: { type: 'text' },
    completedAt: { ...date, nullable: true },
  },
};
export const schemas = Object.fromEntries(
  Object.entries(columns).map(([name, fields]) => [
    name,
    new EntitySchema({
      name,
      tableName: name,
      columns: { id: { ...uuid, primary: true }, createdAt: date, ...fields },
    }),
  ]),
) as Record<Table, EntitySchema>;
