import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
const shot = (name: string) => path.join(process.cwd(), 'docs/pc2/capturas', name + '.png');
async function login(page: Page, email = 'cliente@servicehub.test') {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('ServiceHub123!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir menú de cuenta' })).toBeVisible();
}
test('Home, catálogo, URL, pipe y responsive sin desbordamiento', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Conectemos personas e ideas.' })).toBeVisible();
  await expect(page.locator('sh-service-card')).toHaveCount(8);
  await expect(page.locator('.category-card')).toHaveCount(6);
  await page.screenshot({ path: shot('01-home-desktop'), fullPage: true });
  await page.getByRole('link', { name: 'Explorar todos los servicios' }).click();
  await expect(page).toHaveURL(/\/servicios/);
  await expect(page.getByText('18 resultados')).toBeVisible();
  await expect(page.locator('.card-stat').first()).toBeVisible();
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.locator('sh-service-card')).toHaveCount(8);
  await page.screenshot({ path: shot('02-catalogo-pagina-2'), fullPage: true });
  await page.goto('/servicios?q=DISEÑO');
  await expect(page.locator('sh-service-card').first()).toBeVisible();
  await page.goto('/servicios/servicio-3');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Una identidad visual');
  await expect(page.locator('.package-price')).toContainText('110.00');
  await page.screenshot({ path: shot('03-detalle-paquetes-pipe'), fullPage: true });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.category-card')).toHaveCount(6);
    await page.screenshot({ path: shot('04-home-' + width), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/servicios/servicio-3');
    await expect(page.locator('.package-price')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: shot('05-detalle-' + width), fullPage: true });
  }
  expect(errors).toEqual([]);
});
test('Modal de acceso conserva intención, foco, listas y revocación', async ({ page }) => {
  await page.goto('/servicios');
  const favorite = page.getByRole('button', { name: /Guardar .* en listas/ }).first();
  await favorite.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(favorite).toBeFocused();
  await favorite.click();
  await page.getByLabel('Correo electrónico').fill('cliente@servicehub.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('ServiceHub123!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Guardar en una lista' })).toBeVisible();
  await page.getByLabel('Nueva lista').fill('Mi proyecto PC2');
  await page.getByRole('button', { name: 'Crear y guardar' }).click();
  await expect(page.getByLabel('Mi proyecto PC2', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await page.goto('/listas');
  await expect(page.getByRole('heading', { name: 'Mi proyecto PC2' })).toBeVisible();
  await page.screenshot({ path: shot('06-listas'), fullPage: true });
});
test('Formulario reactivo, CRUD profesional y validación visible', async ({ page }) => {
  await login(page, 'profesional@servicehub.test');
  await page.goto('/servicios/nuevo');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Completa la información');
  await page.screenshot({ path: shot('07-formulario-validacion'), fullPage: true });
  await page.getByLabel('Título del servicio').fill('Instalación de muebles para tu estudio');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('hogar');
  await page.getByRole('combobox', { name: 'Modalidad', exact: true }).selectOption('presencial');
  await page.getByLabel('Región', { exact: true }).fill('Lima');
  await page.getByLabel('Zonas de atención').fill('Miraflores y Surco');
  await page.getByLabel('Etiquetas', { exact: true }).fill('hogar, muebles');
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Instalo tus muebles y repisas con cuidado, revisando medidas, nivel y fijaciones.');
  await page.getByLabel('Qué necesitas del cliente').fill('Medidas y fotos del espacio.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const scopes = page.getByLabel('Alcance', { exact: true });
  for (let i = 0; i < 3; i++)
    await scopes.nth(i).fill('Instalación y nivelación del mobiliario acordado.');
  await page.screenshot({ path: shot('08-formulario-paquetes'), fullPage: true });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar servicio', exact: true }).click();
  await expect(page).toHaveURL(/mis-servicios/);
  const row = page.getByRole('row').filter({ hasText: 'Instalación de muebles para tu estudio' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(row).toContainText('Pausado');
  await page.reload();
  await expect(row).toContainText('Pausado');
  await page.screenshot({ path: shot('09-mis-servicios-crud'), fullPage: true });
});
test('Contratación con extras, pago fallido, pedido y movimientos', async ({ page }) => {
  await login(page);
  await page.goto('/servicios/servicio-3');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Configura tu servicio' })).toBeVisible();
  await page.getByLabel(/Cantidad de/).fill('2');
  await page.getByLabel(/Versión adicional/).check();
  await page.getByRole('button', { name: 'Continuar al resumen' }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator('.total-row')).toContainText('245.00');
  await page
    .getByLabel('¿Qué necesita saber el profesional?')
    .fill('Necesito una identidad visual para mi emprendimiento.');
  await page.getByLabel('Resultado de prueba').selectOption('failure');
  await page.getByRole('button', { name: 'Confirmar y pagar' }).click();
  await expect(page.getByRole('status')).toContainText('El pago no fue aprobado');
  await page.getByLabel('Resultado de prueba').selectOption('success');
  await page.screenshot({ path: shot('10-checkout'), fullPage: true });
  await page.getByRole('button', { name: 'Confirmar y pagar' }).click();
  await expect(page).toHaveURL(/pedidos\//);
  await expect(page.getByText('Tu contratación está confirmada.')).toBeVisible();
  await page.screenshot({ path: shot('11-pedido-snapshot'), fullPage: true });
  await page.goto('/movimientos');
  await expect(page.getByRole('table')).toContainText('245.00');
  await page.screenshot({ path: shot('12-movimientos'), fullPage: true });
});
test('Dos sesiones: mensaje, oferta, contratación y entrega confirmada', async ({ browser }) => {
  const cc = await browser.newContext({
    baseURL: 'http://127.0.0.1:4300',
    viewport: { width: 1440, height: 1000 },
  });
  const pc = await browser.newContext({
    baseURL: 'http://127.0.0.1:4300',
    viewport: { width: 1440, height: 1000 },
  });
  const client = await cc.newPage(),
    provider = await pc.newPage();
  await login(client);
  await login(provider, 'profesional@servicehub.test');
  await client.goto('/mensajes/conversacion-demo');
  await provider.goto('/mensajes/conversacion-demo');
  await client
    .getByRole('textbox', { name: 'Escribe tu mensaje' })
    .fill('Hola, necesito una propuesta para dos repisas de madera.');
  await client.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(
    provider
      .locator('.message-text')
      .filter({ hasText: 'Hola, necesito una propuesta para dos repisas de madera.' }),
  ).toBeVisible({ timeout: 12000 });
  await provider.getByRole('button', { name: 'Crear oferta', exact: true }).click();
  await provider
    .getByRole('combobox', { name: 'Servicio', exact: true })
    .selectOption('servicio-1');
  await provider.getByLabel('Título', { exact: true }).fill('Dos repisas para el estudio');
  await provider
    .getByLabel('Alcance acordado')
    .fill('Instalación y nivelación de dos repisas en pared de concreto.');
  await provider.getByLabel('Importe total (S/)').fill('140');
  await provider.getByRole('combobox', { name: 'Pago', exact: true }).selectOption('onsite');
  await provider.getByLabel('Vigencia (fecha y hora Lima)').fill('2027-10-01T12:00');
  await provider.getByRole('button', { name: 'Enviar oferta', exact: true }).click();
  await expect(provider.getByRole('dialog')).toHaveCount(0);
  const offer = client.locator('.chat-offer').filter({ hasText: 'Dos repisas para el estudio' });
  await expect(offer).toBeVisible({ timeout: 12000 });
  await client.screenshot({ path: shot('13-chat-oferta'), fullPage: true });
  await offer.getByRole('link', { name: 'Revisar y contratar' }).click();
  await client
    .getByLabel('¿Qué necesita saber el profesional?')
    .fill('Pared de concreto y medidas listas.');
  await client.getByLabel('Fecha y hora solicitada (Lima)').fill('2027-09-01T10:00');
  await client.getByLabel('Dirección o punto de atención').fill('Av. Ejemplo 123, Lima');
  await client.getByRole('button', { name: 'Confirmar contratación', exact: true }).click();
  await expect(client).toHaveURL(/pedidos\//);
  const orderUrl = client.url();
  await provider.goto(orderUrl);
  await provider.getByRole('button', { name: 'Iniciar trabajo' }).click();
  await provider.getByRole('button', { name: 'Marcar entrega realizada' }).click();
  await client.reload();
  await client.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
  await expect(client.getByText('Completado', { exact: true }).first()).toBeVisible();
  await client
    .getByLabel('Tu reseña')
    .fill('Todo quedó muy bien. Excelente comunicación y atención.');
  await client.getByRole('button', { name: 'Publicar reseña' }).click();
  await expect(client.getByRole('heading', { name: 'Reseña del pedido' })).toBeVisible();
  await client.screenshot({ path: shot('14-entrega-resena'), fullPage: true });
  await client.goto('/mensajes/conversacion-demo');
  await client.setViewportSize({ width: 390, height: 844 });
  await expect(client.getByRole('textbox', { name: 'Escribe tu mensaje' })).toBeVisible();
  expect(
    await client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await client.getByRole('button', { name: 'Ver resumen', exact: true }).click();
  await expect(client.getByRole('dialog', { name: 'Resumen de la conversación' })).toBeVisible();
  await client.keyboard.press('Escape');
  await expect(client.getByRole('dialog')).toHaveCount(0);
  await client.screenshot({ path: shot('15-chat-390'), fullPage: true });
  await cc.close();
  await pc.close();
});

test('Registro conserva el paquete; onboarding guarda progreso y habilita al profesional', async ({
  page,
  browser,
}) => {
  await page.goto('/servicios/servicio-3');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Regístrate', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Cliente Nuevo PC2');
  await page.getByLabel('Correo electrónico').fill('cliente-e2e@servicehub.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('ServiceHub123!');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL(/bienvenida/);
  await page.getByRole('button', { name: /Quiero contratar/ }).click();
  await expect(page.getByRole('dialog', { name: 'Configura tu servicio' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('110.00');
  await page.keyboard.press('Escape');
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4300' });
  const provider = await context.newPage();
  await provider.goto('/acceso?register=1&intent=provider');
  await provider.getByLabel('Nombre', { exact: true }).fill('Profesional Nuevo PC2');
  await provider.getByLabel('Correo electrónico').fill('profesional-e2e@servicehub.test');
  await provider.getByLabel('Contraseña', { exact: true }).fill('ServiceHub123!');
  await provider.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(
    provider.getByRole('heading', { name: 'Muéstranos lo que sabes hacer.' }),
  ).toBeVisible();
  await provider.getByLabel('A qué te dedicas').fill('Reparación de computadoras');
  await provider.getByRole('button', { name: 'Guardar progreso', exact: true }).click();
  await expect(provider.getByText('Progreso guardado. Puedes retomarlo después.')).toBeVisible();
  await provider.goto('/mis-servicios');
  await expect(provider).toHaveURL(/bienvenida/);
  await expect(provider.getByLabel('A qué te dedicas')).toHaveValue('Reparación de computadoras');
  await provider.getByRole('combobox', { name: 'Región', exact: true }).selectOption('Lima');
  await provider
    .getByLabel('Acerca de ti')
    .fill('Reparo computadoras y acompaño a mis clientes en el uso responsable de sus equipos.');
  await provider.getByLabel('Habilidades', { exact: true }).fill('Diagnóstico, reparación');
  await provider.screenshot({ path: shot('16-onboarding'), fullPage: true });
  await provider.getByRole('button', { name: 'Completar perfil', exact: true }).click();
  await expect(provider).toHaveURL(/mis-servicios/);
  await provider.reload();
  await expect(provider.getByRole('heading', { name: 'Mis servicios' })).toBeVisible();
  await context.close();
});
