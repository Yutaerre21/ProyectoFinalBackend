# Product Backlog P3 — propuesta para validación con G7

Las estimaciones son orientativas y deben ajustarse con el Development Team. Los identificadores HU son locales; **no representan números de Issues ya creados**. Cada historia debe convertirse en Issue con sus criterios, puntos, prioridad y milestone.

| ID   | Historia                                                                                                 | Puntos | Prioridad | Sprint propuesto |
| ---- | -------------------------------------------------------------------------------------------------------- | -----: | --------- | ---------------- |
| HU01 | Como personal quiero iniciar/cerrar sesión para acceder de manera segura.                                |      5 | Alta      | 1                |
| HU02 | Como administrador quiero gestionar acceso por roles para proteger el inventario.                        |      3 | Alta      | 1                |
| HU03 | Como administrador quiero registrar depósitos y rangos para contextualizar el monitoreo.                 |      3 | Alta      | 1                |
| HU04 | Como archivista quiero registrar y consultar expedientes para localizar su caja y estantería.            |      5 | Alta      | 1                |
| HU05 | Como archivista quiero actualizar datos y retirar expedientes del inventario activo sin perder historia. |      3 | Media     | 1                |
| HU06 | Como restaurador quiero registrar inspecciones para documentar el estado y los hallazgos.                |      5 | Alta      | 2                |
| HU07 | Como archivista quiero consultar el historial para conocer la evolución del expediente.                  |      3 | Alta      | 2                |
| HU08 | Como restaurador quiero alertas de estado crítico para priorizar atención.                               |      3 | Alta      | 2                |
| HU09 | Como archivista quiero alertas de inspecciones vencidas para evitar revisiones olvidadas.                |      3 | Alta      | 2                |
| HU10 | Como personal quiero recibir temperatura y humedad mediante API para detectar cambios ambientales.       |      5 | Alta      | 2                |
| HU11 | Como equipo quiero simular sensores para demostrar el flujo sin hardware.                                |      2 | Alta      | 2                |
| HU12 | Como coordinador quiero un tablero priorizado para identificar riesgos abiertos.                         |      5 | Alta      | 2                |
| HU13 | Como coordinador quiero asignar intervenciones para que cada alerta tenga responsable y plazo.           |      5 | Alta      | 3                |
| HU14 | Como restaurador quiero registrar avance y resultado de mis tareas para demostrar la intervención.       |      3 | Alta      | 3                |
| HU15 | Como titular quiero consentir el uso de datos y eliminar mi cuenta para controlar mis datos personales.  |      3 | Alta      | 3                |
| HU16 | Como operador quiero instalar y respaldar el sistema con manuales para mantenerlo sin el equipo.         |      5 | Alta      | 3                |
| HU17 | Como equipo quiero pruebas y CI en cada PR para detectar regresiones antes de fusionar.                  |      5 | Alta      | 1–3              |
| HU18 | Como cliente G7 quiero probar una demo pública para aceptar la solución entregada.                       |      3 | Alta      | 3                |

## Criterios por historia

### HU01 — Autenticación

- Dado un usuario activo y credenciales correctas, cuando inicia sesión, recibe access token de 15 min y refresh de 7 días.
- Dadas credenciales incorrectas, se devuelve 401 sin revelar cuál dato falló.
- Cuando se usa refresh, el token anterior queda revocado; no puede reutilizarse.
- Cuando cierra sesión, sus tokens dejan de servir para consultar la API.

### HU02 — Roles

- Solo ADMIN puede crear cuentas institucionales y configurar depósitos.
- STAFF puede operar conservación; PUBLIC solo gestiona su cuenta.
- Acceder por URL directa o HTTP no elude la autorización.
- Los listados de usuarios no devuelven passwordHash ni tokenHash.

### HU03 — Depósitos

- Se exige nombre y rangos numéricos; mínimo debe ser menor que máximo.
- Humedad se limita a 0–100 %; la configuración se persiste.
- Los nuevos rangos aplican a la siguiente lectura y no cambian el historial.

### HU04 — Inventario

- Se exigen código único, título, depósito existente, estantería, caja y periodicidad 1–365 días.
- Un código duplicado devuelve 409; una referencia inválida es rechazada.
- Se busca por código/título y se filtra estado; resultados paginados y ordenables.
- La creación queda pendiente de primera inspección.

### HU05 — Actualización y archivo

- Personal modifica ubicación/metadatos sin eliminar inspecciones anteriores.
- Solo ADMIN archiva; el expediente desaparece del listado activo.
- Expediente archivado no acepta nuevas inspecciones; historial sigue disponible.

### HU06 — Inspecciones

- Se exige estado válido, observaciones de 10–2000 caracteres y presencia/ausencia de humedad, plagas y desgaste.
- El inspector es el usuario autenticado, no un ID enviado por el cliente.
- Inspección, nuevo estado, fecha de próxima revisión y alertas se actualizan en una transacción.

### HU07 — Historial

- La ficha muestra inspecciones de ese expediente, ordenadas por fecha y paginadas.
- No existe endpoint que permita editar o borrar una inspección registrada.

### HU08 — Riesgo crítico

- Una inspección CRITICO abre prioridad 1.
- Repetir una inspección crítica no duplica la alerta abierta.
- Una nueva inspección no crítica resuelve la alerta; el historial de alertas conserva esa resolución.

### HU09 — Vencimientos

- Si nextInspectionAt es anterior a la fecha actual, el expediente activo genera prioridad 3.
- La tarea programada evalúa al iniciar y cada 60 segundos; existe ejecución manual.
- Repetir evaluación es idempotente; inspeccionar de nuevo resuelve el vencimiento.

### HU10 — Ingesta y alertas ambientales

- Se exige sesión de personal, depósito existente, sensor, temperatura, humedad y fecha ISO.
- Humedad 0–100 %, temperatura -50–80 °C; valores fuera de esos límites son inválidos.
- Medición aceptada: últimas 24 horas y tolerancia de reloj futuro hasta 60 segundos.
- Salida de rango del depósito genera prioridad 2; límites exactos están dentro de rango.
- Lecturas atrasadas se guardan sin modificar la condición vigente; una lectura normal posterior resuelve.

### HU11 — Simulación

- El script autentica una cuenta autorizada y envía lecturas normales/anómalas a la API real.
- Cantidad e intervalo son configurables; no incluye contraseñas en código.
- Sus mediciones aparecen en historial y activan/resuelven alertas.

### HU12 — Dashboard

- Muestra expedientes activos, alertas abiertas, tareas pendientes e inspecciones vencidas.
- Alertas se ordenan por prioridad y luego antigüedad.
- Se accede al expediente desde una alerta y al historial desde el monitoreo.
- Los estados vacíos y errores se muestran sin inventar métricas.

### HU13 — Asignación

- Se exige alerta abierta, responsable institucional activo, título y vencimiento futuro.
- No se asigna a un usuario PUBLIC ni a una cuenta inactiva.
- Solo una tarea no terminada puede estar asociada a la alerta.

### HU14 — Ejecución

- Responsable o ADMIN avanza PENDING → IN_PROGRESS → DONE; también puede cerrar desde PENDING con resultado documentado.
- Se rechazan retrocesos y cambios por otros miembros del personal.
- DONE exige al menos diez caracteres de evidencia textual.
- La alerta no se cierra solo por completar la tarea; se comprueba mediante inspección/lectura.

### HU15 — Datos personales

- Registro exige consentimiento verdadero; la fecha se conserva.
- Mi cuenta permite confirmar contraseña y anonimizar datos, revocando sesiones.
- El último administrador no puede eliminarse hasta crear otro administrador.

### HU16 — Operación

- Compose levanta los tres servicios y migraciones sin pasos manuales adicionales.
- Existen manual de despliegue y comandos de respaldo/restauración.
- Secretos se generan fuera del código; la semilla es ficticia.
- Antes de producción se valida la restauración y se registran responsables.

### HU17 — Calidad

- PR dispara lint, unitarias, e2e PostgreSQL y build.
- Dominio y aplicación cumplen al menos 70 % de cobertura.
- Main requiere aprobación de un compañero y checks antes de fusionar (configuración remota pendiente).

### HU18 — Aceptación

- Se dispone de URL pública operativa con TLS.
- G7 presencia demo, prueba los criterios del producto y registra observaciones reales.
- Defectos bloqueantes se corrigen y el representante firma un acta fechada coherente con Issues/PRs.

## Definition of Ready

Historia comprendida por el equipo, criterios observables, dependencias identificadas, datos de ejemplo autorizados y prioridad discutida con el PO/G7.

## Definition of Done

Código comprendido por sus autores, criterios comprobados, pruebas pertinentes y CI verdes, documentación actualizada y PR revisado/fusionado. Solo entonces la tarjeta pasa a Done. La existencia del código local por sí sola no es evidencia de un sprint completado.
