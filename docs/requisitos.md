# Requisitos y trazabilidad

La fuente de requisitos es el PDF del usuario. Las siguientes decisiones operativas son propuestas de implementación para validar con G7.

| ID   | Requisito                                 | Implementación / verificación                                                 |
| ---- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| RF01 | Inventario y ubicación física             | CreateRecord/UpdateRecord/ArchiveRecord; pantalla Expedientes; e2e inventario |
| RF02 | Inspecciones e historial por expediente   | RegisterInspection y endpoints anidados; historial en ficha                   |
| RF03 | Alerta por estado crítico                 | Clave CRITICAL:recordId; unitarias y e2e concurrencia                         |
| RF04 | Inspección vencida                        | EvaluateOverdue, reloj del servidor, ciclo de 60 s y endpoint manual          |
| RF05 | Alerta ambiental fuera de rango           | IngestReading + outsideRange, alerta por depósito                             |
| RF06 | Ingesta y simulador                       | POST /api/v1/readings; scripts/simulate.mjs                                   |
| RF07 | Dashboard priorizado                      | GetDashboard, orden prioridad 1–3 y antigüedad                                |
| RF08 | Asignación de intervenciones              | AssignTask/UpdateTask; responsable activo, plazo, resolución                  |
| RT01 | NestJS y Clean Architecture               | domain/application sin imports externos; composición por tokens               |
| RT02 | React TS y PostgreSQL >=15                | React 19; PostgreSQL 17 en Compose y CI                                       |
| RT03 | REST /api/v1 y Swagger /docs              | controllers.ts, bootstrap.ts y export OpenAPI                                 |
| RT04 | JWT access/refresh y hash                 | JwtSecurity, bcrypt, sesiones revocables, rotación                            |
| RT05 | ADMIN/STAFF/PUBLIC                        | guard backend y StaffOnly frontend; e2e 403                                   |
| RT06 | DTOs y errores uniformes                  | class-validator, ValidationPipe y ErrorFilter                                 |
| RT07 | Paginación/filtros/orden                  | ListDto, listas {items,total,page,limit}, allowlist de sort                   |
| RT08 | Config por entorno, sin secretos          | .env.example; inicialización aleatoria Docker; .gitignore                     |
| RT09 | Logs y salud                              | ConsoleLogger JSON, registro HTTP, scheduler, /health                         |
| RT10 | Modelo ER/migraciones/semillas/índices    | docs/modelo-datos.md; dos migraciones; seed.ts                                |
| RT11 | Frontend responsive y accesible           | CSS adaptable, labels, foco, estados con texto, prueba móvil                  |
| RT12 | Unitarias >=70 % y e2e                    | Jest con umbral, pruebas PostgreSQL real y Playwright                         |
| RT13 | CI y contenedores                         | .github/workflows/ci.yml; Dockerfile y compose.yaml                           |
| RT14 | Privacidad/consentimiento/eliminar cuenta | PrivacyPage, consentAt, DeleteAccount                                         |
| RE01 | URL pública                               | Pendiente de hosting y dominio; instancia local comprobada                    |
| RE02 | Backlog validado y tablero GitHub         | Propuesta local lista; validación y creación remota pendientes                |
| RE03 | Ceremonias Teams y aportes individuales   | Pendientes reales; no se generan actas ficticias                              |
| RE04 | Aceptación final G7/CLENA                 | Pendiente de demo y firma                                                     |

## Criterios de aceptación del producto

1. El personal encuentra un expediente y su ubicación desde el inventario.
2. Una inspección crítica queda en el historial y genera una sola alerta activa, incluso ante peticiones concurrentes.
3. Una medición fuera de los rangos configurados aparece en el historial y activa riesgo ambiental.
4. Una medición normal posterior resuelve el riesgo; una antigua no lo resuelve indebidamente.
5. Un expediente sin inspección vigente aparece como vencido tras la evaluación periódica/manual.
6. Se puede asignar una intervención a personal activo y documentar su resultado.
7. Una cuenta pública no obtiene inventario, lecturas, alertas ni tareas, aunque acceda directamente a la API.
8. `docker compose up -d --build` arranca el sistema con datos ficticios, sin manipulación manual de la base.

## Preguntas de validación con G7

- ¿Qué constituye un expediente y qué código único utiliza hoy el archivo?
- ¿Qué depósitos existen y cómo se nombran estanterías/cajas?
- ¿Quién establece periodicidad y umbrales para cada colección?
- ¿Qué observaciones distinguen Óptimo, Regular y Crítico?
- ¿Qué orden de prioridad requieren los incidentes combinados?
- ¿Quién puede asignar intervenciones y aprobar su finalización?
- ¿Cuánto tiempo deben conservarse cuentas, sesiones, lecturas y evidencias?
- ¿Dónde se alojará la solución y quién será responsable de backups y soporte?

No hay respuestas institucionales inventadas a estas preguntas.
