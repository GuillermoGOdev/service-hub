const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../app.cjs');
const { seed } = require('../seed.cjs');
let dir, dbFile, server, base, db, app;
const cookies = {};
async function request(method, url, body, who) {
  const r = await fetch(base + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookies[who] ? { cookie: cookies[who] } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data, headers: r.headers };
}
async function login(who, email) {
  const r = await request('POST', '/auth/login', { email, password: 'ServiceHub123!' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  cookies[who] = r.headers.get('set-cookie').split(';')[0];
}
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'servicehub-api-'));
  dbFile = path.join(dir, 'db.json');
  fs.writeFileSync(dbFile, JSON.stringify(seed()));
  ({ app, db } = createApp({ dbFile, uploadDir: path.join(dir, 'uploads'), quiet: true }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  await login('client', 'cliente@servicehub.test');
  await login('provider', 'profesional@servicehub.test');
  await login('other', 'pro2@servicehub.test');
});
after(async () => {
  await new Promise((r) => server.close(r));
  const target = path.resolve(dir);
  assert.ok(
    target.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
      path.basename(target).startsWith('servicehub-api-'),
  );
  fs.rmSync(target, { recursive: true, force: true });
});
test('JSON Server real: paginación, headers y privacidad de rutas alternativas', async () => {
  const r = await request('GET', '/services?_page=2&_limit=8&_sort=title&_order=asc');
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 8);
  assert.equal(r.headers.get('x-total-count'), '18');
  assert.ok(r.headers.get('link'));
  for (const url of [
    '/db',
    '/users',
    '/users/cliente',
    '/services/servicio-1?_expand=user',
    '/conversations/conversacion-demo/messages',
  ])
    assert.ok((await request('GET', url, null, 'client')).status >= 400, url);
  const people = await request('GET', '/people/pro-1');
  assert.equal(people.status, 200);
  assert.equal(people.data.email, undefined);
  assert.equal(people.data.passwordHash, undefined);
  assert.equal((await request('GET', '/orders')).status, 401);
  assert.equal((await request('GET', '/orders', null, 'other')).data.length, 0);
  assert.equal((await request('GET', '/favoriteLists/lista-demo', null, 'other')).status, 403);
  assert.equal(
    (await request('GET', '/favoriteLists?userId=cliente', null, 'other')).data.length,
    0,
  );
});
test('Registro, hash, progreso reanudable y bloqueo de capacidades', async () => {
  const r = await request('POST', '/auth/register', {
    name: 'Prueba Nueva',
    email: 'nueva@servicehub.test',
    password: 'ServiceHub123!',
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.passwordHash, undefined);
  cookies.new = r.headers.get('set-cookie').split(';')[0];
  assert.equal(r.data.providerEnabled, false);
  assert.equal((await request('POST', '/services', { title: 'No autorizado' }, 'new')).status, 403);
  assert.equal(
    (await request('PATCH', '/users/' + r.data.id, { providerEnabled: true }, 'new')).status,
    404,
  );
  let profile = await request(
    'PUT',
    '/account/profile',
    { name: 'Prueba Nueva', headline: 'Edición', complete: false },
    'new',
  );
  assert.equal(profile.status, 200);
  assert.equal(profile.data.completed, false);
  assert.equal(
    (await request('PUT', '/account/profile', { name: 'Prueba Nueva', complete: true }, 'new'))
      .status,
    400,
  );
  profile = await request(
    'PUT',
    '/account/profile',
    {
      name: 'Prueba Nueva',
      headline: 'Edición de contenidos',
      region: 'Lima',
      about: 'Me dedico a crear contenidos claros para pequeñas empresas.',
      skills: ['Edición'],
      languages: [{ name: 'Español', level: 'avanzado' }],
      complete: true,
    },
    'new',
  );
  assert.equal(profile.status, 200);
  assert.equal((await request('GET', '/auth/me', null, 'new')).data.providerEnabled, true);
});
test('CRUD de servicios GET POST PATCH DELETE: propiedad y persistencia después de reabrir', async () => {
  const original = seed().services[0];
  const r = await request(
    'POST',
    '/services',
    { ...original, title: 'Servicio de integración', status: 'draft', providerId: 'pro-2' },
    'provider',
  );
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.providerId, 'pro-1');
  const sid = r.data.id;
  assert.equal((await request('GET', '/services/' + sid)).status, 403);
  assert.equal(
    (await request('PATCH', '/services/' + sid, { title: 'Edición ajena' }, 'other')).status,
    403,
  );
  assert.equal(
    (
      await request(
        'PATCH',
        '/services/' + sid,
        { title: 'Servicio editado', status: 'published' },
        'provider',
      )
    ).status,
    200,
  );
  assert.equal((await request('GET', '/services/' + sid)).data.title, 'Servicio editado');
  assert.equal(
    (await request('PATCH', '/services/' + sid, { status: 'paused' }, 'provider')).status,
    200,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(dbFile, 'utf8')).services.find((s) => s.id === sid).status,
    'paused',
  );
  const reopened = createApp({ dbFile, uploadDir: path.join(dir, 'uploads'), quiet: true });
  assert.equal(reopened.db.get('services').find({ id: sid }).value().status, 'paused');
  await request('PATCH', '/services/' + sid, { status: 'draft' }, 'provider');
  assert.equal((await request('DELETE', '/services/' + sid, null, 'provider')).status, 200);
  assert.equal((await request('GET', '/services/' + sid, null, 'provider')).status, 404);
});
test('Checkout directo: total servidor, fallo de pago, idempotencia y snapshot', async () => {
  const body = {
    serviceId: 'servicio-3',
    packageId: 'paquete-1',
    quantity: 2,
    extraIds: ['extra-1'],
    paymentMode: 'platform',
  };
  const q = await request('POST', '/checkout/quote', body, 'client');
  assert.equal(q.status, 200);
  assert.equal(q.data.totalCents, 24500);
  const confirm = {
    ...body,
    requirements: 'Necesito una identidad para mi negocio.',
    expectedTotalCents: 24500,
    idempotencyKey: 'test-direct-123',
    paymentResult: 'failure',
  };
  const count = db.get('orders').size().value();
  assert.equal((await request('POST', '/checkout/confirm', confirm, 'client')).status, 402);
  assert.equal(db.get('orders').size().value(), count);
  assert.equal(
    (
      await request(
        'POST',
        '/checkout/confirm',
        { ...confirm, paymentResult: 'success', expectedTotalCents: 1 },
        'client',
      )
    ).status,
    409,
  );
  const rs = await Promise.all(
    [1, 2].map(() =>
      request('POST', '/checkout/confirm', { ...confirm, paymentResult: 'success' }, 'client'),
    ),
  );
  assert.equal(rs[0].data.id, rs[1].data.id);
  assert.equal(db.get('orders').size().value(), count + 1);
  assert.equal(db.get('payments').filter({ orderId: rs[0].data.id }).size().value(), 1);
  assert.equal(rs[0].data.snapshot.unitPriceCents, 11000);
  assert.equal(rs[0].data.totalCents, 24500);
  assert.equal(
    (
      await request(
        'POST',
        '/checkout/quote',
        { serviceId: 'servicio-1', packageId: 'paquete-1' },
        'provider',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        'POST',
        '/checkout/quote',
        { serviceId: 'servicio-3', packageId: 'paquete-1' },
        'provider',
      )
    ).status,
    200,
  );
});
test('Solicitud → conversación única → oferta → checkout → máximo un pedido', async () => {
  const r = await request(
    'POST',
    '/requests',
    {
      serviceId: 'servicio-1',
      packageId: 'paquete-2',
      text: 'Necesito instalar tres repisas de madera.',
    },
    'client',
  );
  assert.equal(r.status, 201);
  assert.equal(r.data.conversationId, 'conversacion-demo');
  const c = await request('POST', '/conversations/open', { providerId: 'pro-1' }, 'client');
  assert.equal(c.data.id, 'conversacion-demo');
  const o = await request(
    'POST',
    '/offers',
    {
      conversationId: c.data.id,
      serviceId: 'servicio-1',
      title: 'Instalación personalizada',
      scope: 'Instalar y nivelar tres repisas en sala.',
      totalCents: 18000,
      days: 4,
      paymentMode: 'onsite',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    'provider',
  );
  assert.equal(o.status, 201, JSON.stringify(o.data));
  assert.equal(
    (await request('POST', '/checkout/quote', { offerId: o.data.id }, 'client')).status,
    200,
  );
  assert.equal(db.get('offers').find({ id: o.data.id }).value().status, 'pending');
  const body = {
    offerId: o.data.id,
    requirements: 'Pared de concreto, sala principal.',
    requestedAt: new Date(Date.now() + 86400000).toISOString(),
    address: 'Av. Ejemplo 123, Lima',
    expectedTotalCents: 18000,
    idempotencyKey: 'offer-request-123',
  };
  const result = await Promise.all(
    [1, 2].map((n) =>
      request(
        'POST',
        '/checkout/confirm',
        { ...body, idempotencyKey: 'offer-request-' + n },
        'client',
      ),
    ),
  );
  assert.equal(result[0].data.id, result[1].data.id);
  assert.equal(result[0].data.paymentStatus, 'pending');
  assert.equal(db.get('offers').find({ id: o.data.id }).value().status, 'accepted');
  assert.equal(db.get('payments').filter({ orderId: result[0].data.id }).size().value(), 0);
  assert.equal(
    (await request('POST', '/offers/' + o.data.id + '/action', { action: 'withdraw' }, 'provider'))
      .status,
    409,
  );
});
test('Estados de pedido, ajuste, reseña y pago presencial independiente', async () => {
  const b = {
    serviceId: 'servicio-1',
    packageId: 'paquete-1',
    paymentMode: 'onsite',
    quantity: 1,
    expectedTotalCents: 6000,
    requirements: 'Instalar en mi sala principal.',
    requestedAt: new Date(Date.now() + 86400000).toISOString(),
    address: 'Lima, dirección de prueba',
    idempotencyKey: 'onsite-state-123',
  };
  const { data: o } = await request('POST', '/checkout/confirm', b, 'client');
  assert.ok(o.id);
  const act = (action, who, note = '') =>
    request('POST', `/orders/${o.id}/action`, { action, note }, who);
  assert.equal((await act('start', 'client')).status, 409);
  assert.equal((await act('complete', 'provider')).status, 409);
  assert.equal((await act('start', 'provider')).status, 200);
  assert.equal((await act('deliver', 'provider')).status, 200);
  assert.equal(
    (await act('adjust', 'client', 'Ajustar la altura de una repisa.')).data.status,
    'in_progress',
  );
  await act('deliver', 'provider');
  const complete = await act('complete', 'client');
  assert.equal(complete.data.status, 'completed');
  assert.equal(complete.data.paymentStatus, 'pending');
  assert.equal((await act('complete', 'client')).status, 200);
  await act('payment_report', 'client');
  assert.equal((await act('payment_confirm', 'provider')).data.paymentStatus, 'confirmed');
  assert.equal(db.get('payments').filter({ orderId: o.id }).size().value(), 1);
  const review = await request(
    'POST',
    '/reviews',
    { orderId: o.id, rating: 5, comment: 'Un servicio excelente y bien coordinado.' },
    'client',
  );
  assert.equal(review.status, 201);
  assert.equal(
    (
      await request(
        'POST',
        '/reviews',
        { orderId: o.id, rating: 5, comment: 'Otra reseña duplicada.' },
        'client',
      )
    ).status,
    409,
  );
  assert.equal(
    (await request('PATCH', '/reviews/' + review.data.id, { response: 'Muchas gracias' }, 'other'))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        'PATCH',
        '/reviews/' + review.data.id,
        { response: 'Muchas gracias por tu confianza.' },
        'provider',
      )
    ).status,
    200,
  );
});
test('Cancelación: reseñar solo tras inicio, sin falsificar actor o evento', async () => {
  assert.equal(
    (
      await request(
        'POST',
        '/reviews',
        { orderId: 'pedido-demo-4', rating: 4, comment: 'No debería permitirse esta reseña.' },
        'client',
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        'POST',
        '/reviews',
        { orderId: 'pedido-demo-2', rating: 4, comment: 'Tampoco mientras siga en curso.' },
        'client',
      )
    ).status,
    403,
  );
  await request(
    'POST',
    '/orders/pedido-demo-2/action',
    { action: 'cancel', note: 'Cambió la necesidad del proyecto.' },
    'client',
  );
  const r = await request(
    'POST',
    '/reviews',
    {
      orderId: 'pedido-demo-2',
      rating: 4,
      comment: 'Buena comunicación durante el trabajo.',
      customerId: 'pro-2',
    },
    'client',
  );
  assert.equal(r.status, 201);
  assert.equal(r.data.cancelled, true);
  assert.equal(r.data.customerId, 'cliente');
  assert.equal(
    (await request('PATCH', '/orders/pedido-demo-2', { status: 'completed' }, 'client')).status,
    405,
  );
});
test('Listas: varias listas, conteo único, enlaces revocables y CRUD privado', async () => {
  const { data: l } = await request(
    'POST',
    '/favoriteLists',
    { name: 'Mi segunda lista', description: 'Para comparar', userId: 'pro-2' },
    'client',
  );
  assert.equal(l.userId, 'cliente');
  await request('POST', `/favoriteLists/${l.id}/items`, { serviceId: 'servicio-1' }, 'client');
  await request('POST', `/favoriteLists/${l.id}/items`, { serviceId: 'servicio-1' }, 'client');
  assert.equal(
    (await request('GET', `/favoriteLists/${l.id}`, null, 'client')).data.serviceIds.length,
    1,
  );
  assert.equal((await request('GET', '/metrics')).data['servicio-1'].savedCount, 1);
  const shared = await request('POST', `/favoriteLists/${l.id}/share`, {}, 'client');
  assert.equal(
    (await request('GET', '/shared-lists/' + shared.data.shareToken)).data.services.length,
    1,
  );
  await request('POST', `/favoriteLists/${l.id}/share`, { revoke: true }, 'client');
  assert.equal((await request('GET', '/shared-lists/' + shared.data.shareToken)).status, 404);
  await request(
    'POST',
    `/favoriteLists/${l.id}/items`,
    { serviceId: 'servicio-1', remove: true },
    'client',
  );
  assert.equal(
    (await request('GET', '/favoriteLists/lista-demo', null, 'client')).data.serviceIds.includes(
      'servicio-1',
    ),
    true,
  );
  assert.equal((await request('DELETE', `/favoriteLists/${l.id}`, null, 'client')).status, 200);
});
test('Mensajes, etiquetas y guardados personales, sin borrar a la contraparte', async () => {
  const r = await request(
    'POST',
    '/messages',
    { conversationId: 'conversacion-demo', text: 'Un mensaje de integración', authorId: 'pro-2' },
    'client',
  );
  assert.equal(r.status, 201);
  assert.equal(r.data.authorId, 'cliente');
  assert.equal(
    (await request('GET', '/messages?conversationId=conversacion-demo', null, 'other')).data.length,
    0,
  );
  const l = await request(
    'POST',
    '/userConversationLabels',
    { name: 'Seguimiento', description: 'Revisar mañana' },
    'client',
  );
  assert.equal(l.status, 201);
  await request(
    'PUT',
    '/conversations/conversacion-demo/preferences',
    { labelIds: [l.data.id], savedMessageId: r.data.id, starred: true, folder: 'archived' },
    'client',
  );
  const prefs = (await request('GET', '/conversationPreferences', null, 'client')).data;
  assert.ok(
    prefs.find((p) => p.conversationId === 'conversacion-demo').savedMessageIds.includes(r.data.id),
  );
  const peer = (await request('GET', '/conversationPreferences', null, 'provider')).data;
  assert.ok(
    !peer.find((p) => p.conversationId === 'conversacion-demo').savedMessageIds.includes(r.data.id),
  );
  await request('DELETE', '/userConversationLabels/' + l.data.id, null, 'client');
  assert.equal(
    (await request('GET', '/conversationPreferences', null, 'client')).data.find(
      (p) => p.conversationId === 'conversacion-demo',
    ).labelIds.length,
    0,
  );
  await request(
    'PUT',
    '/conversations/conversacion-demo/preferences',
    { folder: 'deleted' },
    'client',
  );
  assert.ok(
    (
      await request('GET', '/messages?conversationId=conversacion-demo', null, 'provider')
    ).data.some((m) => m.id === r.data.id),
  );
});
test('Subidas válidas y privadas, lectura persistente y rechazo de SVG', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx1sAAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'test.png');
  form.append('conversationId', 'conversacion-demo');
  const r = await fetch(base + '/files', {
    method: 'POST',
    headers: { cookie: cookies.client },
    body: form,
  });
  assert.equal(r.status, 201);
  const file = await r.json();
  assert.equal(
    (
      await request(
        'POST',
        '/messages',
        {
          conversationId: 'conversacion-demo',
          text: 'Límite de imágenes',
          fileIds: Array(7).fill(file.id),
        },
        'client',
      )
    ).status,
    400,
  );
  assert.equal(
    (await fetch(base + `/files/${file.id}/content`, { headers: { cookie: cookies.provider } }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(base + `/files/${file.id}/content`, { headers: { cookie: cookies.other } }))
      .status,
    403,
  );
  assert.equal((await fetch(base + `/files/${file.id}/content`)).status, 401);
  assert.ok(JSON.parse(fs.readFileSync(dbFile)).files.find((f) => f.id === file.id));
  const bad = new FormData();
  bad.append('image', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'bad.svg');
  assert.equal(
    (
      await fetch(base + '/files', {
        method: 'POST',
        headers: { cookie: cookies.client },
        body: bad,
      })
    ).status,
    400,
  );
});
test('CSV con BOM, filtros, escape de fórmulas y ninguna credencial', async () => {
  db.get('payments')
    .push({
      id: 'csv-test',
      orderId: 'pedido-demo-1',
      customerId: 'cliente',
      providerId: 'pro-1',
      title: '=HYPERLINK("https://example.test")',
      amountCents: 6000,
      status: 'paid',
      createdAt: new Date().toISOString(),
    })
    .write();
  const r = await fetch(base + '/billing/export?q=csv-test', {
    headers: { cookie: cookies.client },
  });
  assert.equal(r.status, 200);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(bytes.subarray(0, 3).toString('hex'), 'efbbbf');
  const csv = bytes.toString();
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('""https://example.test""'));
  assert.ok(!csv.includes('passwordHash'));
});
test('Fallo de escritura compuesta restaura memoria y permite reintentar', async () => {
  const oldWrite = db.write;
  const before = db.get('offers').size().value();
  db.write = () => {
    throw new Error('Fallo de disco inducido');
  };
  const r = await request(
    'POST',
    '/offers',
    {
      conversationId: 'conversacion-demo',
      serviceId: 'servicio-1',
      title: 'Prueba de fallo parcial',
      scope: 'No debe dejar residuos en memoria.',
      totalCents: 10000,
      days: 2,
      paymentMode: 'platform',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    'provider',
  );
  db.write = oldWrite;
  assert.equal(r.status, 500);
  assert.equal(db.get('offers').size().value(), before);
});

test('Bloqueo cooperativo impide dos escritores de la misma base', () => {
  const { acquireStorageLock } = require('../storage-lock.cjs');
  const release = acquireStorageLock(dbFile);
  assert.throws(() => acquireStorageLock(dbFile), /base está en uso/);
  release();
  const again = acquireStorageLock(dbFile);
  again();
  assert.equal(fs.existsSync(dbFile + '.lock'), false);
});

test('Reinicio real: sobreviven pedidos, mensajes e imágenes; la sesión se renueva', async () => {
  const orderIds = db.get('orders').map('id').value();
  const messageIds = db.get('messages').map('id').value();
  const file = db.get('files').find({ visibility: 'private' }).value();
  await new Promise((resolve) => server.close(resolve));
  ({ app, db } = createApp({ dbFile, uploadDir: path.join(dir, 'uploads'), quiet: true }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  assert.equal((await request('GET', '/auth/me', null, 'client')).data, null);
  await login('client', 'cliente@servicehub.test');
  assert.deepEqual(db.get('orders').map('id').value(), orderIds);
  assert.deepEqual(db.get('messages').map('id').value(), messageIds);
  assert.equal(
    (await fetch(base + `/files/${file.id}/content`, { headers: { cookie: cookies.client } }))
      .status,
    200,
  );
});
