# Modelo de datos — PostgreSQL 17

## Relaciones

```text
USER 1 ─────── N SESSION
USER 1 ─────── N INSPECTION (inspectorId)
USER 1 ─────── N TASK (assigneeId)

DEPOSIT 1 ──── N RECORD
DEPOSIT 1 ──── N READING
DEPOSIT 1 ──── N ALERT
RECORD  1 ──── N INSPECTION
RECORD  1 ──── N ALERT (recordId opcional en ALERT)
ALERT   1 ──── N TASK (máximo una activa)
```

Representación visual: [modelo-er.svg](modelo-er.svg).

Todas las tablas tienen `id UUID PRIMARY KEY` y `createdAt TIMESTAMPTZ NOT NULL`. Las fechas se guardan como instantes; la interfaz las presenta en el huso horario del navegador.

## Diccionario

| Tabla       | Campos propios                                                                                         | Integridad                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| users       | name, email, passwordHash, role, consentAt, active                                                     | email único; rol ADMIN/STAFF/PUBLIC; no se exponen hashes              |
| sessions    | userId, tokenHash, expiresAt                                                                           | FK usuario; digest del refresh; eliminación física al revocar          |
| deposits    | name, tempMin, tempMax, humidityMin, humidityMax                                                       | nombre único; mínimo menor que máximo; humedad 0–100                   |
| records     | code, title, depositId, shelf, box, description, inspectionDays, nextInspectionAt, condition, archived | código único; FK depósito; periodicidad 1–365; estado válido           |
| inspections | recordId, inspectorId, condition, notes, pests, wear, moisture                                         | FK expediente y usuario; historial append-only desde la API            |
| readings    | depositId, sensorId, temperature, humidity, measuredAt                                                 | FK depósito; temperatura -50 a 80; humedad 0–100                       |
| alerts      | kind, priority, recordId nullable, depositId, message, status, resolvedAt nullable, key                | tipo CRITICAL/OVERDUE/ENVIRONMENT; prioridad 1–3; estado OPEN/RESOLVED |
| tasks       | alertId, assigneeId, title, dueAt, status, resolution, completedAt nullable                            | FK alerta y usuario; estado PENDING/IN_PROGRESS/DONE                   |

`recordId` es nulo en alertas ambientales, porque la medición representa el depósito y no una pieza individual. La humedad observada visualmente en una inspección se guarda en `moisture`; la humedad relativa medida se guarda en `readings.humidity`. No son el mismo dato.

## Índices y migraciones

`1791417600000-Initial.ts` crea tablas, claves foráneas, checks e índices:

- Correo de usuario, nombre de depósito y código de expediente: unicidad.
- Expedientes: depósito, condición y próxima inspección de activos.
- Inspecciones: expediente + fecha descendente.
- Lecturas: depósito + fecha de medición descendente.
- Alertas: estado + prioridad + fecha y **clave única donde status=OPEN**.
- Tareas: responsable, estado + vencimiento y **alertId único donde status<>DONE**.
- Sesiones: usuario; usuarios: rol para cuentas activas.

`1791417600001-SearchIndexes.ts` habilita `pg_trgm` y agrega índices GIN para las columnas buscables con `ILIKE`. En hosting administrado debe estar permitida esa extensión.

Las migraciones se ejecutan al iniciar. `synchronize` permanece desactivado. Para nuevas estructuras se crea una migración nueva; no se modifica una ya aplicada a un entorno compartido.

## Conservación del historial

Archivar un expediente cambia `archived` sin borrar sus relaciones. Eliminar una cuenta anonimiza nombre/correo y desactiva el usuario, manteniendo sus FK para que el historial conserve integridad. No se guardan datos de visitantes ni inventarios reales en semillas.

## Semilla demostrativa

Tres cuentas ficticias, dos depósitos, cuatro expedientes y casos de inspección crítica, condición normal, alerta ambiental e inspección vencida. La semilla se omite si la cuenta demo principal ya existe. Para producción debe usarse `SEED_DEMO=false` y un proceso institucional de alta inicial.
