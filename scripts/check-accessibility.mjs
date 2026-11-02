import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on('pageerror', error => console.error('Browser error:', error.stack));
try {
  await page.goto('http://localhost:8080/login');
  const password = execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'backend', 'cat', '/run/config/demo_password'],
    { encoding: 'utf8' },
  ).trim();
  await page.getByLabel('Correo electrónico').fill('admin@clena.example');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByRole('heading', { name: 'Una mirada al archivo' }).waitFor();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  console.log(
    JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
      null,
      2,
    ),
  );
  process.exitCode = results.violations.length ? 1 : 0;
} finally {
  await browser.close();
}
