# Arquitectura

## Regla de dependencia

```text
HTTP / React
     │
Presentación (NestJS: controller, DTO, guard, filtro)
     │ invoca
Aplicación (casos de uso)
     │ utiliza
Dominio (entidades, reglas, interfaces Repository/Runtime/Security)
     ▲ implementa
Infraestructura (PgRepository, SystemRuntime, JwtSecurity)
     │
PostgreSQL / TypeORM / bcrypt / JWT

app.module.ts = raíz de composición; conoce las implementaciones
para unirlas mediante REPOSITORY, RUNTIME y SECURITY.
```

El dominio y la aplicación no importan NestJS, TypeORM ni componentes de presentación. `Runtime` permite sustituir reloj/identificadores en las pruebas. `Security` abstrae hash, firma y verificación. El puerto `Repository` tipa cada tabla con su entidad y admite transacciones. Se usan objetos de dominio planos: los métodos de infraestructura copian las filas y no devuelven QueryBuilder, EntityManager ni entidades con decoradores ORM.

## Casos de uso

| Archivo                       | Clases                                                                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application/auth.ts`         | RegisterUser, Login, RefreshSession, Authenticate, Logout, DeleteAccount                                                                                                                        |
| `application/conservation.ts` | CreateDeposit, UpdateDeposit, CreateRecord, UpdateRecord, ArchiveRecord, RegisterInspection, IngestReading, EvaluateOverdue, AssignTask, UpdateTask, ListItems, GetRecord, GetDashboard, Health |

Cada clase representa una acción. Los controladores no consultan PostgreSQL directamente. La aplicación determina las reglas de flujo y llama las funciones puras de `domain/model.ts`.

## Decisiones técnicas

1. **NestJS + React + PostgreSQL:** son obligatorios en el taller. TypeORM implementa el puerto de persistencia; `EntitySchema` mantiene decoradores fuera del dominio.
2. **REST versionado:** clientes usan `/api/v1`; un cambio incompatible futuro puede introducir otra versión.
3. **Monorepo npm workspaces:** una instalación y un lockfile reproducen backend y frontend.
4. **Transacciones:** inspección, estado del expediente y alertas se confirman juntos. Rotación de refresh también es atómica.
5. **Concurrencia:** `pg_advisory_xact_lock(731903)` serializa las transiciones del MVP, incluso con más de un proceso. Los índices únicos parciales son una segunda defensa. Este bloqueo global limita el rendimiento a gran escala; se puede evolucionar a bloqueos por agregado.
6. **Evaluación de vencimientos:** tarea cada minuto y endpoint manual, sin necesidad de IoT. Al iniciar se evalúan los vencimientos acumulados.
7. **Alertas persistentes:** conservan apertura y resolución; una nueva recurrencia crea una nueva alerta. Las lecturas normales resuelven la alerta ambiental solo si no son anteriores a la medición vigente.
8. **Tareas independientes del riesgo:** terminar trabajo no prueba recuperación. El archivista registra una inspección y el sensor una medición para comprobar condiciones.
9. **Sesiones revocables:** access JWT 15 minutos, refresh JWT 7 días; se guarda digest SHA-256 del refresh. El backend consulta sesión y usuario activo en cada petición. Logout y eliminación revocan inmediatamente el acceso.
10. **Contraseñas:** bcrypt coste 12. Validación HTTP de 12–72 caracteres al registrar.
11. **Frontend:** React Router y cliente fetch; sesión en `sessionStorage`, rotación automática al recibir 401. La política CSP de Nginx restringe fuentes de scripts. Para un despliegue institucional que lo requiera, evolucionar a cookies HttpOnly con protección CSRF.
12. **Paginación:** 20 registros por defecto, 100 máximo; UI principal de 10 por página. La búsqueda `ILIKE` usa índices GIN trigram para consultas parciales. Las columnas ordenables están en una lista explícita; no se interpola SQL arbitrario.
13. **Archivo lógico:** borrar físicamente el inventario rompería trazabilidad; el administrador lo retira del inventario activo conservando el historial.
14. **Acceso público restringido:** el rol requerido por el taller existe pero no expone fondos documentales del archivo.
15. **Configuración Docker:** secretos aleatorios en volumen; base no publicada al host. La API local se publica solo en loopback, el frontend en el puerto configurado.

## Flujo de errores y observabilidad

El filtro global convierte errores de negocio, validación y persistencia a `{statusCode,message,path,timestamp}`. Los errores internos no revelan SQL ni credenciales. Los logs HTTP incluyen identificador, método, ruta, código y duración. No registran cuerpos, contraseñas ni tokens. `/health` verifica conexión real a PostgreSQL y devuelve 503 si falla.

## Límites conocidos del MVP

- Listados de selección de depósitos y responsables cargan los primeros 100. Si la institución supera ese volumen, requieren búsqueda paginada en el selector.
- El dashboard toma las últimas ocho lecturas globales; un depósito sin mediciones recientes puede no aparecer. El historial completo está en Monitoreo ambiental.
- No hay alarma por sensor desconectado; debe revisarse la fecha de lectura.
- Cambiar umbrales aplica a la siguiente lectura; no reinterpreta datos históricos.
- No hay notificaciones externas, adjuntos, recuperación de contraseña por correo ni MFA.
- La tarea programada recorre expedientes activos; para grandes fondos conviene evaluación por lotes.
- El rate limiting usa memoria por instancia (120 solicitudes/minuto); un clúster requiere almacén compartido y política institucional de acceso.

Estas limitaciones no se ocultan en la entrega ni se confunden con funcionalidades implementadas.

## Referencias

- [Documentación de NestJS](https://docs.nestjs.com/).
- [Migraciones TypeORM](https://typeorm.io/docs/migrations/why/).
