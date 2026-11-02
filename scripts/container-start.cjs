const { readFileSync } = require('node:fs');
const read = (name) => readFileSync(`/run/config/${name}`, 'utf8').trim();
process.env.DATABASE_URL ||= `postgresql://clena:${read('db_password')}@db:5432/clena`;
process.env.JWT_ACCESS_SECRET ||= read('access_secret');
process.env.JWT_REFRESH_SECRET ||= read('refresh_secret');
process.env.SEED_PASSWORD ||= read('demo_password');
require('../backend/dist/main.js');
