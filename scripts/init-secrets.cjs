const { existsSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
for (const name of ['db_password', 'access_secret', 'refresh_secret', 'demo_password']) {
  const path = `/config/${name}`;
  if (!existsSync(path)) writeFileSync(path, randomBytes(32).toString('hex'), { mode: 0o644 });
}
console.log('Configuración inicial creada o conservada. Los secretos no se imprimen en los logs.');
