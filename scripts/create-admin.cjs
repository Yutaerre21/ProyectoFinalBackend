const { readFileSync } = require('node:fs');
const read = (name) => readFileSync(`/run/config/${name}`, 'utf8').trim();
process.env.DATABASE_URL ||= `postgresql://clena:${read('db_password')}@db:5432/clena`;
const { createDataSource, PgRepository } = require('../backend/dist/infrastructure/database.js');
const { JwtSecurity, SystemRuntime } = require('../backend/dist/infrastructure/security.js');
const { RegisterUser } = require('../backend/dist/application/auth.js');
async function main() {
  const {
    ADMIN_NAME: name,
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD: password,
    ADMIN_CONSENT: consent,
  } = process.env;
  if (
    !name ||
    name.trim().length < 2 ||
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !password ||
    password.length < 12 ||
    password.length > 72 ||
    consent !== 'true'
  )
    throw new Error(
      'Define ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (12–72 caracteres) y ADMIN_CONSENT=true',
    );
  const ds = createDataSource();
  await ds.initialize();
  try {
    await ds.runMigrations();
    await new RegisterUser(
      new PgRepository(ds),
      new SystemRuntime(),
      new JwtSecurity(read('access_secret'), read('refresh_secret')),
    ).execute({ name, email, password, consent: true }, 'ADMIN');
    console.log('Administrador creado. No se imprimen credenciales.');
  } finally {
    await ds.destroy();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
