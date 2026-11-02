# Manual de operación

## 1. Requisitos y arranque

Docker Engine/Desktop con Compose y contenedores Linux. Puertos libres: 8080 (web) y 3000 (API solo loopback). Para desarrollo/pruebas fuera del contenedor: Node.js 24 y npm.

```sh
docker compose up -d --build
docker compose ps
```

Los contenedores `db` y `backend` deben reportar healthy. Abre http://localhost:8080 y http://localhost:3000/docs. El servicio `init` debe finalizar con código 0: es una tarea de inicialización, no un servidor continuo.

La inicialización genera cuatro valores aleatorios: contraseña PostgreSQL, secretos access/refresh diferentes y contraseña demo. Se guardan en el volumen `config`. Los datos quedan en `database`. No hay secretos fijos en la aplicación.

```sh
docker compose exec backend cat /run/config/demo_password
```

Ese comando revela la contraseña de demostración al operador; no la copies a GitHub, capturas ni grabaciones públicas. Los usuarios demo aparecen en el README.

## 2. Variables

| Variable           | Uso                                                                            |
| ------------------ | ------------------------------------------------------------------------------ |
| DATABASE_URL       | Conexión PostgreSQL; Docker la construye a partir del archivo de configuración |
| JWT_ACCESS_SECRET  | Secreto de firma access, mínimo 32 caracteres                                  |
| JWT_REFRESH_SECRET | Secreto refresh distinto del anterior, mínimo 32 caracteres                    |
| SEED_PASSWORD      | Contraseña demo, mínimo 12 caracteres; requerida solo al ejecutar semilla      |
| SEED_DEMO          | `true` solo en demostración; activa la semilla al iniciar                      |
| SCHEDULER_ENABLED  | `false` desactiva el cron en pruebas; activo por defecto                       |
| PORT               | Puerto del backend, 3000 por defecto                                           |
| FRONTEND_ORIGIN    | Origen permitido CORS; `http://localhost:8080` en Compose                      |
| DB_SSL             | `true` para conexión PostgreSQL con TLS y certificado verificable              |
| WEB_PORT           | Puerto publicado por Nginx, 8080 por defecto en Compose                        |

`.env.example` describe el modo local sin Docker. Copia sus valores a `backend/.env`, genera secretos y proporciona una PostgreSQL existente. No uses los textos REEMPLAZAR en un despliegue real. `npm run dev:api` se ejecuta en el workspace backend y carga ese `.env`.

## 3. Operación cotidiana

```sh
docker compose logs --tail=100 backend
docker compose logs --tail=100 db
docker compose stop
docker compose up -d
```

Comprueba `/health`, los errores HTTP 5xx y el evento `overdue_evaluated`. Revisa también fechas de lecturas; `/health` comprueba la base, no la conexión de sensores. La interfaz se actualiza al abrir pantallas o pulsar Actualizar, no mediante streaming.

No ejecutes `docker compose down -v` sobre una instalación con información que deba conservarse: elimina volúmenes. El reinicio normal no necesita ese comando.

## 4. Respaldo PostgreSQL

Frecuencia propuesta: diaria y antes de cada cambio de versión. Confirmar retención, ubicación y responsable con CLENA. Guardar una copia cifrada fuera del servidor y practicar la restauración.

Los siguientes comandos evitan redirecciones binarias que pueden corromper un dump en Windows PowerShell:

```sh
docker compose exec db pg_dump -U clena -d clena -Fc -f /tmp/clena-backup.dump
docker compose cp db:/tmp/clena-backup.dump ./clena-backup.dump
```

Tras guardar la copia en el almacén de respaldo, elimina el dump del directorio de trabajo si contiene datos reales. Nunca lo subas al repositorio. El volumen `config` contiene secretos y también requiere custodia restringida; un dump de la base no incluye ese volumen.

## 5. Probar restauración en una base separada

```sh
docker compose cp ./clena-backup.dump db:/tmp/clena-restore.dump
docker compose exec db createdb -U clena clena_restore_check
docker compose exec db pg_restore -U clena -d clena_restore_check --no-owner /tmp/clena-restore.dump
docker compose exec db psql -U clena -d clena_restore_check -c "SELECT count(*) FROM records;"
```

Esto crea una base nueva para comprobar el respaldo. No sustituye la base operativa. Para una recuperación real, detener escrituras, verificar el respaldo, acordar una ventana de mantenimiento y documentar el punto de recuperación antes de reemplazar datos. No se incluye una orden de sobreescritura automática de producción.

## 6. Migraciones y actualización

Las migraciones versionadas se ejecutan al iniciar backend; `synchronize:false` siempre. Antes de actualizar:

1. Revisar PR aprobado, CI y cambios de esquema.
2. Realizar respaldo y confirmar que se puede restaurar.
3. Construir/iniciar la versión aprobada con `docker compose up -d --build`.
4. Verificar salud, login, inventario e ingesta.

No modificar una migración ya aplicada. La primera crea el esquema; la segunda requiere la extensión PostgreSQL `pg_trgm`. Confirmar soporte/permisos en servicios administrados. En despliegues con varias réplicas, ejecutar migraciones como tarea única antes de iniciar las réplicas.

## 7. Pruebas y simulación

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e:docker
npx playwright install chromium
npm run test:browser
```

`test:e2e:docker` crea un contenedor PostgreSQL temporal con credenciales aleatorias, ejecuta siete escenarios y elimina exclusivamente ese contenedor al terminar. La suite rechaza una URL de base que no incluya `test`.

El simulador requiere `SENSOR_PASSWORD` por entorno, usa `personal@clena.example` de forma predeterminada y registra doce lecturas cada cinco segundos. Consulta el README para PowerShell. No lo apuntes a una colección real con datos sintéticos.

## 8. Despliegue público pendiente

No hay un proveedor, dominio ni cuenta de hosting suministrados. Para publicar el demo:

1. Provisionar un servidor con Docker y almacenamiento persistente.
2. Transferir la versión revisada; no transferir secretos por Git.
3. Configurar `FRONTEND_ORIGIN` con el origen HTTPS real y `WEB_PORT` según el proxy.
4. Colocar un proxy TLS delante de Nginx; publicar únicamente HTTP(S). Mantener PostgreSQL privado y la API interna.
5. Ejecutar Compose y verificar health, autenticación y flujos de conservación desde otra red.
6. Registrar URL, responsable, política de respaldo y fecha real en README y acta de entrega.

Para una demo académica, mantener datos sintéticos. Para operación institucional usar `SEED_DEMO=false`, alta inicial controlada de administración, política de contraseñas, revisión de privacidad y licencia y rangos aprobados. El prototipo no incorpora recuperación de contraseña por correo; acordar el procedimiento de soporte antes de operar con cuentas reales.

## 9. Alta inicial sin semilla de demostración

Usa `scripts/create-admin.cjs` mediante el contenedor, con variables `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_CONSENT=true` entregadas por un canal seguro. El script invoca el caso de uso de registro y no escribe contraseña en logs. Debe ejecutarse solo por el operador después de obtener consentimiento y nunca incluir claves en un archivo versionado.

La contraseña se puede pasar desde una variable del entorno del operador con `docker compose exec -e ADMIN_PASSWORD ...`; evita escribirla literalmente en el historial de consola. El script requiere `SEED_DEMO=false` para un entorno limpio y no modifica usuarios existentes.

Una vez definidas esas variables en el entorno del operador:

```sh
docker compose exec -e ADMIN_NAME -e ADMIN_EMAIL -e ADMIN_PASSWORD -e ADMIN_CONSENT backend node scripts/create-admin.cjs
```

## 10. Soporte y límites

Los secretos del volumen permanecen iguales al reiniciar. Rotarlos invalida tokens existentes; coordinar cierre de sesiones y configuración PostgreSQL si se cambia su contraseña. No basta con editar arbitrariamente el archivo de password de una base ya inicializada.

Las cuentas inactivas se conservan anónimas por integridad del historial. Confirmar con la institución los periodos de retención, borrado y backups. El prototipo no garantiza por sí solo cumplimiento legal ni tratamiento adecuado para toda colección documental.
