import { OpenAPIObject } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
const string: SchemaObject = { type: 'string' },
  number: SchemaObject = { type: 'number' },
  boolean: SchemaObject = { type: 'boolean' },
  date: SchemaObject = { type: 'string', format: 'date-time' },
  id: SchemaObject = { type: 'string', format: 'uuid' };
const object = (properties: Record<string, SchemaObject>): SchemaObject => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
});
const entity = (properties: Record<string, SchemaObject>) =>
  object({ id, createdAt: date, ...properties });
const enumeration = (values: string[]): SchemaObject => ({ type: 'string', enum: values });
export function documentResponses(doc: OpenAPIObject) {
  const User = entity({
    name: string,
    email: { type: 'string', format: 'email' },
    role: enumeration(['ADMIN', 'STAFF', 'PUBLIC']),
    active: boolean,
  });
  const Deposit = entity({
    name: string,
    tempMin: number,
    tempMax: number,
    humidityMin: number,
    humidityMax: number,
  });
  const Record = entity({
    code: string,
    title: string,
    depositId: id,
    shelf: string,
    box: string,
    description: string,
    inspectionDays: { type: 'integer' },
    nextInspectionAt: date,
    condition: enumeration(['OPTIMO', 'REGULAR', 'CRITICO']),
    archived: boolean,
  });
  const Inspection = entity({
    recordId: id,
    inspectorId: id,
    condition: enumeration(['OPTIMO', 'REGULAR', 'CRITICO']),
    notes: string,
    pests: boolean,
    wear: boolean,
    moisture: boolean,
  });
  const Reading = entity({
    depositId: id,
    sensorId: string,
    temperature: number,
    humidity: number,
    measuredAt: date,
  });
  const Alert = entity({
    kind: enumeration(['CRITICAL', 'ENVIRONMENT', 'OVERDUE']),
    priority: { type: 'integer', minimum: 1, maximum: 3 },
    recordId: { ...id, nullable: true },
    depositId: id,
    message: string,
    status: enumeration(['OPEN', 'RESOLVED']),
    resolvedAt: { ...date, nullable: true },
    key: string,
  });
  const Task = entity({
    alertId: id,
    assigneeId: id,
    title: string,
    dueAt: date,
    status: enumeration(['PENDING', 'IN_PROGRESS', 'DONE']),
    resolution: string,
    completedAt: { ...date, nullable: true },
  });
  const ref = (name: string): SchemaObject =>
    ({ $ref: `#/components/schemas/${name}` }) as SchemaObject;
  const schemas = {
    User,
    Deposit,
    Record,
    Inspection,
    Reading,
    Alert,
    Task,
    SessionTokens: object({ accessToken: string, refreshToken: string, user: ref('User') }),
    ErrorResponse: object({
      statusCode: { type: 'integer' },
      message: { oneOf: [string, { type: 'array', items: string }] },
      path: string,
      timestamp: date,
    }),
    Dashboard: object({
      records: number,
      critical: number,
      openAlerts: number,
      pendingTasks: number,
      overdue: number,
      prioritizedAlerts: { type: 'array', items: ref('Alert') },
      recentReadings: { type: 'array', items: ref('Reading') },
    }),
  };
  doc.components ??= {};
  doc.components.schemas = { ...doc.components.schemas, ...schemas };
  const resources: Record<string, string> = {
    deposits: 'Deposit',
    records: 'Record',
    inspections: 'Inspection',
    readings: 'Reading',
    alerts: 'Alert',
    tasks: 'Task',
    users: 'User',
  };
  for (const [path, pathItem] of Object.entries(doc.paths))
    for (const verb of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = pathItem?.[verb];
      if (!op) continue;
      const parts = path.split('/'),
        last = parts.at(-1)!;
      const resource = last === '{id}' ? parts.at(-2)! : last;
      let schema: SchemaObject = object({ message: string });
      if (resources[resource]) {
        schema = ref(resources[resource]);
        if (verb === 'get' && last !== '{id}')
          schema = object({
            items: { type: 'array', items: schema },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          });
      }
      if (['login', 'refresh'].includes(last)) schema = ref('SessionTokens');
      if (['register', 'me'].includes(last)) schema = ref('User');
      if (last === 'dashboard') schema = ref('Dashboard');
      if (last === 'evaluate') schema = object({ evaluatedAt: date, overdue: { type: 'integer' } });
      if (last === 'health') schema = object({ status: string, database: string });
      const status = verb === 'post' ? '201' : '200';
      op.responses[status] = {
        description: 'Operación completada',
        content: { 'application/json': { schema } },
      };
      for (const code of ['400', '401', '403', '404', '409', '429', '500'])
        op.responses[code] = {
          description: (
            {
              '400': 'Entrada inválida',
              '401': 'Sesión inválida',
              '403': 'Acceso denegado',
              '404': 'Recurso inexistente',
              '409': 'Conflicto de estado o duplicado',
              '429': 'Límite de solicitudes',
              '500': 'Error interno',
            } as Record<string, string>
          )[code],
          content: { 'application/json': { schema: ref('ErrorResponse') } },
        };
    }
}
