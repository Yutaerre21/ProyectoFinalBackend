import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const password = randomBytes(24).toString('hex');
const id = execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '-d',
    '-p',
    '127.0.0.1::5432',
    '-e',
    'POSTGRES_USER=clena',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-e',
    'POSTGRES_DB=clena_test',
    'postgres:17-alpine',
  ],
  { encoding: 'utf8' },
).trim();
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (
      spawnSync('docker', ['exec', id, 'pg_isready', '-U', 'clena', '-d', 'clena_test'], {
        stdio: 'ignore',
      }).status === 0
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ready) throw new Error('PostgreSQL de prueba no inició');
  const mapping = execFileSync('docker', ['port', id, '5432'], { encoding: 'utf8' }).trim();
  const port = mapping.split(':').at(-1);
  const result = spawnSync(
    process.execPath,
    ['node_modules/jest/bin/jest.js', '--config', 'backend/test/jest-e2e.json', '--runInBand'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://clena:${password}@localhost:${port}/clena_test`,
        JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
        JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
        SEED_DEMO: 'false',
        SCHEDULER_ENABLED: 'false',
      },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  execFileSync('docker', ['stop', id], { stdio: 'ignore' });
}
