# Verificación técnica local

Validación realizada el **8 de octubre de 2026**, con datos ficticios. Estos resultados son de ejecución local; no se presentan como checks de GitHub ya ejecutados ni como aceptación de G7.

| Comprobación                 | Resultado                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `npm ci` desde lockfile      | Instalación correcta                                                                     |
| `npm run lint`               | ESLint y TypeScript sin errores en backend/frontend                                      |
| `npm test`                   | 3 suites, 15 pruebas aprobadas                                                           |
| Cobertura dominio/aplicación | 100 % líneas, 100 % sentencias, 100 % funciones, 97,91 % ramas                           |
| `npm run test:e2e:docker`    | 7 escenarios aprobados con PostgreSQL 17 real y migraciones                              |
| `npm run build`              | Backend y frontend compilados                                                            |
| Docker Compose               | Base y backend saludables; frontend responde HTTP 200                                    |
| `/health`                    | `{status: "ok", database: "up"}`                                                         |
| `npm run test:browser`       | Login, inventario, inspección, viewport 390 px, logout y restricción pública comprobados |
| Respaldo/restauración        | pg_dump formato custom y pg_restore en base separada; 4 expedientes recuperados          |
| Dependencias                 | Instalación final auditada sin vulnerabilidades reportadas por npm                       |
| Accesibilidad automática     | Axe WCAG 2 A/AA y 2.1 AA: 0 infracciones detectadas en el dashboard probado              |
| Simulador real               | 4 lecturas enviadas a la API: dos normales, una anómala y una de recuperación            |

## Escenarios e2e

1. Salud, Swagger, autorización y error uniforme.
2. Crear/editar inventario, paginación, filtros y código duplicado.
3. Inspecciones críticas simultáneas sin duplicación de alerta; historial preservado.
4. Ingesta ambiental, entradas inválidas, recuperación y lectura atrasada.
5. Asignación, prevención de tareas duplicadas, avance y resultado obligatorio.
6. Vencimiento, archivo lógico y consistencia del dashboard.
7. Registro público sin escalamiento, refresh de un solo uso y eliminación de cuenta.

## Reproducibilidad

- Las unitarias usan reloj y repositorio de prueba detrás de los puertos; no necesitan servicios externos.
- E2E crea una instancia PostgreSQL temporal. La suite no usa la base de demostración.
- Playwright utiliza cuentas y expedientes ficticios del Compose local. La prueba añade una inspección demostrativa al expediente DEMO-003.
- Se revisaron visualmente las capturas de dashboard, móvil y la primera página del PDF.
- Los reportes detallados de cobertura se generan en `backend/coverage`; no se versionan.

## Límites de esta evidencia

Una cobertura alta no demuestra que todo requisito institucional esté validado. No se ha realizado una auditoría de seguridad, accesibilidad completa, prueba de carga ni ensayo con usuarios reales. CI está definido en YAML, pero su ejecución remota depende de publicar el repositorio. La disponibilidad pública, el acuerdo de licencia y la aceptación del cliente siguen pendientes.
