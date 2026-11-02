# Demo y sustentación — 10 a 12 minutos

## Preparación

- Verificar `docker compose ps`, abrir aplicación y Swagger.
- Obtener contraseña demo fuera de la grabación.
- Usar exclusivamente expedientes ficticios.
- Confirmar que haya una alerta crítica, una ambiental y una por vencimiento en la semilla.

## Recorrido

1. **Problema y usuarios (1 min):** explicar revisión esporádica y necesidad de trazabilidad para archivistas/restauradores.
2. **Dashboard (1 min):** explicar indicadores y prioridades. Aclarar que los rangos mostrados son ejemplos para validar.
3. **Inventario (1 min):** buscar DEMO-003, mostrar depósito/estantería/caja y periodicidad.
4. **Inspección (2 min):** registrar Crítico, humedad visible y observaciones; abrir historial y alerta. Repetir la inspección para explicar por qué no se duplica el riesgo abierto.
5. **Intervención (1 min):** asignar al personal demo con vencimiento futuro; mostrar estado y resultado requerido.
6. **Monitoreo (1 min):** ejecutar el simulador o registrar una lectura anómala, revisar alerta ambiental; registrar una normal posterior y observar resolución.
7. **Comprobación de recuperación (1 min):** completar tarea; mostrar que la alerta crítica persiste hasta registrar una inspección no crítica.
8. **Seguridad (1 min):** login con cuenta pública y demostrar que no accede al inventario; enseñar Swagger y error 403.
9. **Arquitectura/calidad (2 min):** seguir controller → RegisterInspection → Repository → PgRepository; mostrar migración, test y CI cuando el repositorio ya esté publicado.

## Preguntas individuales sugeridas

- ¿Por qué el dominio no importa NestJS?
- ¿Dónde se controla el rol y por qué ocultar un botón no basta?
- ¿Qué ocurre si dos inspecciones críticas llegan al mismo tiempo?
- ¿Qué diferencia hay entre completar una tarea y comprobar recuperación?
- ¿Por qué se guarda measuredAt además de createdAt?
- ¿Cómo se rota un refresh token y se evita reutilizarlo?
- ¿Cómo se restaura una copia sin sobrescribir accidentalmente la base activa?
- ¿Qué parte del sistema debes modificar para agregar una regla nueva?

Cada integrante debe responder sobre código que haya comprendido y aportado, y poder modificarlo durante la sustentación.
