import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const password =
  process.env.DEMO_PASSWORD ??
  execFileSync('docker', ['compose', 'exec', '-T', 'backend', 'cat', '/run/config/demo_password'], {
    encoding: 'utf8',
  }).trim();
test('inicio, inventario, inspección y móvil', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('admin@clena.example');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Una mirada al archivo' })).toBeVisible();
  await expect(page.getByText('Expedientes activos', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/capturas/dashboard.png', fullPage: true });
  await page.getByRole('link', { name: 'Expedientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expedientes bajo cuidado' })).toBeVisible();
  await page.getByLabel('Buscar expediente').fill('DEMO-003');
  await page.getByRole('link', { name: 'Mapas históricos · colección de ejemplo' }).click();
  await page.getByRole('button', { name: 'Registrar inspección', exact: true }).click();
  await page.getByLabel('Estado de conservación').selectOption('OPTIMO');
  await page
    .getByLabel('Hallazgos y observaciones')
    .fill('Revisión de prueba de navegador, sin daños nuevos.');
  await page.getByRole('button', { name: 'Registrar inspección', exact: true }).last().click();
  await expect(
    page.getByText('Revisión de prueba de navegador, sin daños nuevos.').first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Vista general' }).click();
  await expect(page.getByText('Expedientes activos', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/capturas/movil.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('cuenta pública no ve el inventario', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('publico@clena.example');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido a Conserva' })).toBeVisible();
  await page.goto('/records');
  await expect(page.getByRole('heading', { name: 'Bienvenido a Conserva' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Expedientes', exact: true })).toHaveCount(0);
});
