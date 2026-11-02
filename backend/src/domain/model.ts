export type Role = 'ADMIN' | 'STAFF' | 'PUBLIC';
export type Condition = 'OPTIMO' | 'REGULAR' | 'CRITICO';
export interface Base {
  id: string;
  createdAt: Date;
}
export interface User extends Base {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  consentAt: Date;
  active: boolean;
}
export interface Session extends Base {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}
export interface Deposit extends Base {
  name: string;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
}
export interface RecordFile extends Base {
  code: string;
  title: string;
  depositId: string;
  shelf: string;
  box: string;
  description: string;
  inspectionDays: number;
  nextInspectionAt: Date;
  condition: Condition;
  archived: boolean;
}
export interface Inspection extends Base {
  recordId: string;
  inspectorId: string;
  condition: Condition;
  notes: string;
  pests: boolean;
  wear: boolean;
  moisture: boolean;
}
export interface Reading extends Base {
  depositId: string;
  sensorId: string;
  temperature: number;
  humidity: number;
  measuredAt: Date;
}
export interface Alert extends Base {
  kind: 'CRITICAL' | 'OVERDUE' | 'ENVIRONMENT';
  priority: number;
  recordId: string | null;
  depositId: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt: Date | null;
  key: string;
}
export interface Task extends Base {
  alertId: string;
  assigneeId: string;
  title: string;
  dueAt: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  resolution: string;
  completedAt: Date | null;
}
export interface Tables {
  users: User;
  sessions: Session;
  deposits: Deposit;
  records: RecordFile;
  inspections: Inspection;
  readings: Reading;
  alerts: Alert;
  tasks: Task;
}
export type Table = keyof Tables;
export interface ListQuery {
  page: number;
  limit: number;
  q?: string;
  sort: string;
  order: 'ASC' | 'DESC';
  status?: string;
  recordId?: string;
  depositId?: string;
  role?: string;
  alertId?: string;
  archived?: boolean;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export class BusinessError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireFound<T>(value: T | null, name: string): T {
  if (!value) throw new BusinessError(404, `${name} no encontrado`);
  return value;
}
export function checkRange(
  d: Pick<Deposit, 'tempMin' | 'tempMax' | 'humidityMin' | 'humidityMax'>,
): void {
  if (d.tempMin >= d.tempMax || d.humidityMin >= d.humidityMax)
    throw new BusinessError(400, 'El mínimo debe ser menor al máximo');
}
export function outsideRange(r: Pick<Reading, 'temperature' | 'humidity'>, d: Deposit): boolean {
  return (
    r.temperature < d.tempMin ||
    r.temperature > d.tempMax ||
    r.humidity < d.humidityMin ||
    r.humidity > d.humidityMax
  );
}
export function nextInspection(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86400000);
}
export function isOverdue(record: RecordFile, now: Date): boolean {
  return !record.archived && record.nextInspectionAt < now;
}
export function assertTaskTransition(
  from: Task['status'],
  to: Task['status'],
  resolution: string,
): void {
  const allowed = { PENDING: ['IN_PROGRESS', 'DONE'], IN_PROGRESS: ['DONE'], DONE: [] };
  if (!(allowed[from] as string[]).includes(to))
    throw new BusinessError(409, 'Transición de tarea no permitida');
  if (to === 'DONE' && resolution.trim().length < 10)
    throw new BusinessError(400, 'Describe la intervención realizada (mínimo 10 caracteres)');
}
