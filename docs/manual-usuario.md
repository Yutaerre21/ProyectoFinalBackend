# Manual de usuario — Conserva

## Ingresar

Abre la URL de Conserva. En esta instalación: http://localhost:8080. Escribe tu correo y contraseña. El administrador proporciona las cuentas institucionales; el registro abierto crea una cuenta pública sin acceso al inventario.

No compartas tu contraseña. Cierra sesión con el icono de salida junto al perfil. Una sesión vencida te devuelve al inicio de sesión si no puede renovarse.

## Revisar el tablero

Vista general muestra expedientes activos, alertas abiertas, intervenciones pendientes e inspecciones vencidas. Usa **Actualizar** para consultar el estado más reciente. Las alertas se presentan primero por prioridad y después por antigüedad:

1. Estado crítico del expediente.
2. Lectura ambiental fuera del rango configurado.
3. Inspección vencida.

La fecha de las lecturas permite saber cuándo se midió. El tablero no garantiza que un sensor siga conectado; revisa la hora y abre Monitoreo ambiental si necesitas el historial completo.

## Registrar un expediente

1. Entra a **Expedientes → Nuevo expediente**.
2. Completa código único, título, depósito, estantería, caja y periodicidad de inspección.
3. Añade una descripción sin datos personales innecesarios y guarda.
4. Realiza la primera inspección. El estado inicial Regular no sustituye una evaluación; el nuevo expediente queda pendiente de revisión inmediata.

Busca por código o título. Filtra por estado y utiliza los controles de paginación. Abre el nombre del expediente para ver detalle e historial. **Editar expediente** actualiza sus datos. Solo administración puede archivarlo; archivar conserva la historia, pero lo retira del inventario activo.

## Registrar una inspección

1. Abre la ficha del expediente y selecciona **Registrar inspección**.
2. Elige Óptimo, Regular o Crítico según el criterio acordado por el archivo.
3. Marca humedad visible, indicios de plagas y/o desgaste cuando corresponda.
4. Describe hallazgos concretos (mínimo diez caracteres).
5. Guarda y comprueba la nueva entrada del historial.

El sistema registra automáticamente quién inspeccionó y cuándo. Una inspección crítica genera o actualiza una alerta. Una posterior no crítica resuelve esa alerta. La próxima revisión se calcula a partir de la nueva inspección y la periodicidad del expediente.

Las inspecciones registradas no se editan desde la aplicación. Si hubo un error, registra una nueva inspección que explique la corrección para mantener trazabilidad.

## Monitorear temperatura y humedad

En **Monitoreo ambiental**, filtra por depósito y revisa valor, sensor y hora. Usa **Registrar lectura** para una medición manual o demostrativa; el simulador también usa esta API.

La temperatura se expresa en °C y la humedad relativa en %. Una lectura fuera del rango configurado genera una alerta ambiental. Una medición normal posterior la resuelve. Una lectura antigua permanece en el historial sin borrar el riesgo vigente.

No interpretes los umbrales de demostración como recomendaciones de conservación. El administrador debe configurarlos con la aprobación del personal competente.

## Atender una alerta

1. Abre **Alertas** y revisa las abiertas.
2. Consulta el expediente cuando la alerta tenga uno asociado.
3. Selecciona **Asignar intervención**.
4. Describe la acción, elige personal responsable y define fecha límite futura.

El sistema impide dos tareas activas para la misma alerta. Si ya tiene una, revísala en **Intervenciones**. Las alertas ambientales pertenecen a un depósito, no a un documento individual.

## Ejecutar una intervención

En **Intervenciones**, el responsable o un administrador puede pasar la tarea a En curso y después a Completada. Para completar, describe lo que hiciste y el resultado (mínimo diez caracteres). No escribas solamente «listo».

Completar la tarea no elimina automáticamente la alerta. Registra una nueva inspección o verifica una lectura ambiental posterior para comprobar que el riesgo terminó. Si sigue activo, se puede asignar una nueva intervención tras completar la anterior.

## Administración

- **Depósitos y umbrales:** crear/editar depósito y límites. Mínimo debe ser menor que máximo. Los cambios aplican a la siguiente lectura.
- **Usuarios:** crear cuentas con rol ADMIN, STAFF o PUBLIC. Registra consentimiento real del titular antes de marcar su aceptación.
- **Mi cuenta:** consultar perfil, aviso de privacidad y eliminación. Eliminar anonimiza nombre/correo y revoca sesiones. No borra la historia institucional. El último administrador debe crear otro administrador antes de eliminarse.

## Problemas frecuentes

| Mensaje / situación                  | Acción                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| Credenciales incorrectas             | Verifica correo y contraseña; solicita ayuda al administrador        |
| No tienes permiso                    | Tu rol no permite esa operación                                      |
| Código ya registrado                 | Busca el expediente existente o corrige el código                    |
| Tarea activa existente               | Abre Intervenciones para ver la asignación vigente                   |
| Fecha debe estar en el futuro        | Corrige el vencimiento de la intervención                            |
| No se pudo completar la operación    | Conserva los datos del formulario y contacta al operador si persiste |
| La alerta sigue tras completar tarea | Registra la comprobación posterior del riesgo                        |
| No aparecen nuevos datos             | Presiona Actualizar; verifica conectividad y fecha de medición       |

Las cuentas y expedientes con nombres «demo» o «ejemplo» son ficticios.
