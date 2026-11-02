// Node >=22. No necesita hardware. Credenciales solo mediante variables de entorno.
const base = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const email = process.env.SENSOR_EMAIL ?? 'personal@clena.example';
const password = process.env.SENSOR_PASSWORD;
if (!password)
  throw new Error('Define SENSOR_PASSWORD con la contraseña del usuario de simulación');
const count = Number(process.env.SENSOR_COUNT ?? 12),
  interval = Number(process.env.SENSOR_INTERVAL_MS ?? 5000);
if (
  !Number.isInteger(count) ||
  count < 1 ||
  count > 10000 ||
  !Number.isFinite(interval) ||
  interval < 1000
)
  throw new Error('SENSOR_COUNT: 1–10000; SENSOR_INTERVAL_MS: mínimo 1000');
let accessToken = '';
async function request(path, body) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
}
async function login() {
  accessToken = (await request('/auth/login', { email, password })).accessToken;
}
await login();
const deposits = (await request('/deposits?limit=100')).items;
const deposit = process.env.SENSOR_DEPOSIT_ID
  ? deposits.find((d) => d.id === process.env.SENSOR_DEPOSIT_ID)
  : deposits[0];
if (!deposit) throw new Error('No existe el depósito seleccionado');
for (let i = 0; i < count; i++) {
  if (i > 0) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    if ((i * interval) % 600000 < interval) await login();
  }
  const anomaly = i % 4 === 2;
  const temperature = Number(
    (
      (deposit.tempMin + deposit.tempMax) / 2 +
      (anomaly ? deposit.tempMax - deposit.tempMin + 2 : Math.random() - 0.5)
    ).toFixed(1),
  );
  const humidity = Number(
    Math.min(
      100,
      (deposit.humidityMin + deposit.humidityMax) / 2 +
        (anomaly ? deposit.humidityMax - deposit.humidityMin + 3 : Math.random() * 2 - 1),
    ).toFixed(1),
  );
  const result = await request('/readings', {
    depositId: deposit.id,
    sensorId: 'SIM-A-01',
    temperature,
    humidity,
    measuredAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ sequence: i + 1, id: result.id, temperature, humidity, anomaly }));
}
