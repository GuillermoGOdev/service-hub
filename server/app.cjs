const jsonServer = require('json-server');
const multer = require('multer');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { hash } = require('./seed.cjs');
const { levels, defaultLabels } = require('./config.cjs');
const id = () => randomUUID();
const now = () => new Date().toISOString();
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const check = (condition, message = 'Operación no permitida.', status = 400) => {
  if (!condition) throw new ApiError(status, message);
};
const str = (v, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v, max = 30) => (Array.isArray(v) ? v.slice(0, max) : []);
const cleanStrings = (v) =>
  list(v)
    .map((x) => str(x, 100))
    .filter(Boolean);
const pick = (value, keys) =>
  Object.fromEntries(keys.filter((k) => value[k] !== undefined).map((k) => [k, value[k]]));
const positive = (v, max = 100000000) => Number.isSafeInteger(v) && v > 0 && v <= max;
const publicUser = (u) =>
  u ? pick(u, ['id', 'name', 'email', 'providerEnabled', 'createdAt']) : null;
const safeDate = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const iso = (v) => new Date(v).toISOString();
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve()
    .then(() => fn(req, res))
    .catch(next);
function createApp({ dbFile, uploadDir, quiet = false }) {
  const app = jsonServer.create();
  // Relationships are validated explicitly. Disable JSON Server's implicit global
  // cascade scan (it misinterprets optional offerId/replyToId and can remove history).
  const router = jsonServer.router(dbFile, { foreignKeySuffix: '__relation' });
  const db = router.db;
  fs.mkdirSync(uploadDir, { recursive: true });
  const sessions = new Map();
  const attempts = new Map();
  const rows = (name) => db.getState()[name];
  const find = (name, key) => rows(name).find((x) => x.id === key);
  const required = (name, key) => {
    const r = find(name, key);
    check(r, 'No se encontró el recurso.', 404);
    return r;
  };
  // All compound operations are synchronous, one state write in a single process.
  // A rejected write restores memory. This is not a database transaction system.
  function change(fn) {
    const before = structuredClone(db.getState());
    try {
      const result = fn();
      db.write();
      return result;
    } catch (e) {
      db.setState(before);
      throw e;
    }
  }
  function user(req) {
    check(req.user, 'Inicia sesión para continuar.', 401);
    return req.user;
  }
  function provider(req) {
    const u = user(req);
    check(u.providerEnabled, 'Completa tu perfil profesional.', 403);
    return u;
  }
  function participant(req, conversationId) {
    const u = user(req),
      c = required('conversations', conversationId);
    check(c.participantIds.includes(u.id), 'No tienes acceso a esta conversación.', 403);
    return c;
  }
  function orderParticipant(req, orderId) {
    const u = user(req),
      o = required('orders', orderId);
    check([o.customerId, o.providerId].includes(u.id), 'No tienes acceso a este pedido.', 403);
    return o;
  }
  function notify(userId, title, url) {
    rows('notifications').push({ id: id(), userId, title, url, read: false, createdAt: now() });
  }
  function preference(userId, conversationId) {
    let p = rows('conversationPreferences').find(
      (x) => x.userId === userId && x.conversationId === conversationId,
    );
    if (!p) {
      p = {
        id: id(),
        userId,
        conversationId,
        folder: 'inbox',
        starred: false,
        unread: false,
        readAt: '',
        labelIds: [],
        savedMessageIds: [],
      };
      rows('conversationPreferences').push(p);
    }
    return p;
  }
  function conversation(customerId, providerId) {
    check(customerId !== providerId, 'No puedes contactarte a ti mismo.');
    let c = rows('conversations').find(
      (x) => x.participantIds.includes(customerId) && x.participantIds.includes(providerId),
    );
    if (!c) {
      c = {
        id: id(),
        customerId,
        providerId,
        participantIds: [customerId, providerId],
        createdAt: now(),
        updatedAt: now(),
      };
      rows('conversations').push(c);
    } else {
      for (const m of rows('messages').filter((m) => m.conversationId === c.id)) {
        m.contextCustomerId ??= c.customerId;
        m.contextProviderId ??= c.providerId;
      }
      c.customerId = customerId;
      c.providerId = providerId;
    }
    return c;
  }
  function message(c, author, kind, text, referenceId, fileIds = [], replyToId) {
    const m = {
      id: id(),
      conversationId: c.id,
      contextCustomerId: c.customerId,
      contextProviderId: c.providerId,
      authorId: author?.id || 'system',
      authorName: author?.name || 'ServiceHub',
      kind,
      text,
      referenceId,
      fileIds,
      replyToId,
      createdAt: now(),
    };
    rows('messages').push(m);
    c.updatedAt = m.createdAt;
    for (const uid of c.participantIds) {
      const p = preference(uid, c.id);
      if (uid !== author?.id) {
        p.unread = true;
        notify(
          uid,
          kind === 'text' ? `Nuevo mensaje de ${author.name}` : text,
          `/mensajes/${c.id}`,
        );
      }
      if (p.folder === 'deleted') p.folder = 'inbox';
    }
    return m;
  }
  function checkFiles(fileIds, ownerId, conversationId, publicOnly = false) {
    check(Array.isArray(fileIds) && fileIds.length <= 6, 'Adjunta como máximo 6 imágenes.');
    for (const fid of fileIds) {
      const f = required('files', fid);
      check(f.ownerId === ownerId, 'La imagen no te pertenece.', 403);
      check(
        publicOnly
          ? f.visibility === 'public'
          : f.visibility === 'private' && f.conversationId === conversationId,
        'La imagen no pertenece a este contexto.',
      );
    }
  }
  function profileBody(body, u, complete) {
    const p = {
      name: str(body.name || u.name, 80),
      headline: str(body.headline, 120),
      region: str(body.region, 80),
      zones: str(body.zones, 200),
      about: str(body.about, 2000),
      skills: cleanStrings(body.skills),
      languages: list(body.languages, 8).map((l) => ({
        name: str(l.name, 40),
        level: str(l.level, 20),
      })),
      experience: str(body.experience, 2000),
      education: str(body.education, 1000),
      certifications: str(body.certifications, 1000),
      availability: str(body.availability, 200),
      avatarId: body.avatarId || undefined,
    };
    check(p.name.length >= 2, 'Escribe tu nombre.');
    check(
      p.languages.every((l) => l.name && ['básico', 'intermedio', 'avanzado'].includes(l.level)),
      'Revisa los idiomas.',
    );
    if (p.avatarId) checkFiles([p.avatarId], u.id, null, true);
    if (complete)
      check(
        p.headline.length >= 5 &&
          p.region &&
          p.about.length >= 30 &&
          p.skills.length &&
          p.languages.length,
        'Completa titular, región, presentación (30 caracteres), habilidades e idioma.',
      );
    return p;
  }
  function serviceBody(body, u, previous) {
    const s = {
      ...pick(body, [
        'title',
        'categoryId',
        'typeId',
        'modality',
        'region',
        'zones',
        'description',
        'requirements',
        'status',
      ]),
      tags: cleanStrings(body.tags),
      imageIds: cleanStrings(body.imageIds),
      packages: list(body.packages, 3),
      extras: list(body.extras, 10),
      faq: list(body.faq, 10),
      cover: previous?.cover || '/assets/ilustrations/designer-desk.svg',
    };
    for (const k of ['title', 'region', 'zones', 'description', 'requirements'])
      s[k] = str(s[k], k === 'description' ? 6000 : 500);
    check(s.title.length >= 6, 'El título necesita al menos 6 caracteres.');
    const cat = required('categories', s.categoryId);
    const type = required('serviceTypes', s.typeId);
    check(type.categoryId === cat.id, 'El tipo no corresponde a la categoría.');
    check(['digital', 'presencial'].includes(s.modality), 'Modalidad inválida.');
    check(['draft', 'published', 'paused'].includes(s.status), 'Estado inválido.');
    checkFiles(s.imageIds, u.id, null, true);
    s.imageIds = [...new Set(s.imageIds)];
    check(s.packages.length === 3, 'Define los tres paquetes.');
    s.packages = s.packages.map((p, i) => ({
      id: `paquete-${i + 1}`,
      name: ['Básico', 'Estándar', 'Premium'][i],
      scope: str(p.scope, 1500),
      priceCents: p.priceCents,
      unit: p.unit,
      days: p.days,
      revisions: p.revisions || 0,
      bookingMode: p.bookingMode,
      features: cleanStrings(p.features),
    }));
    check(
      s.packages.every(
        (p) =>
          positive(p.priceCents) &&
          positive(p.days, 365) &&
          ['proyecto', 'hora', 'visita'].includes(p.unit) &&
          ['direct', 'request'].includes(p.bookingMode) &&
          Number.isInteger(p.revisions) &&
          p.revisions >= 0 &&
          p.revisions <= 50,
      ),
      'Revisa precios, plazos y unidades de los paquetes.',
    );
    s.extras = s.extras.map((e) => ({
      id: previous?.extras.find((x) => x.id === e.id)?.id || id(),
      name: str(e.name, 100),
      priceCents: e.priceCents,
      days: e.days,
    }));
    check(
      s.extras.every(
        (e) =>
          e.name &&
          positive(e.priceCents) &&
          Number.isInteger(e.days) &&
          e.days >= 0 &&
          e.days <= 365,
      ),
      'Revisa los extras.',
    );
    s.faq = s.faq.map((f) => ({ question: str(f.question, 200), answer: str(f.answer, 1500) }));
    check(
      s.faq.every((f) => f.question && f.answer),
      'Completa cada pregunta y respuesta.',
    );
    if (s.status === 'published')
      check(
        s.description.length >= 30 &&
          s.packages.every((p) => p.scope.length >= 10) &&
          s.requirements.length >= 5 &&
          (s.modality === 'digital' || (s.region && s.zones)),
        'Completa descripción, alcance, requisitos y zonas antes de publicar.',
      );
    if (s.modality === 'digital') {
      s.region = '';
      s.zones = '';
    } else {
      s.packages.forEach((p) => (p.revisions = 0));
    }
    return s;
  }
  function offerState(o) {
    return o.status === 'pending' && Date.parse(o.expiresAt) <= Date.now()
      ? { ...o, status: 'expired' }
      : o;
  }
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use((req, res, next) => {
    if (req.headers['x-http-method-override'])
      return res.status(400).json({ message: 'No se permite cambiar el método HTTP.' });
    next();
  });
  app.use(jsonServer.bodyParser);
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (!['localhost', '127.0.0.1'].includes(origin.hostname))
        return res.status(403).json({ message: 'Origen no permitido.' });
    }
    const cookie = (req.headers.cookie || '')
      .split(';')
      .find((c) => c.trim().startsWith('sh_session='));
    const token = cookie?.trim().slice(11);
    const session = sessions.get(token);
    if (session && session.expiresAt > Date.now()) req.user = find('users', session.userId);
    else if (session) sessions.delete(token);
    req.sessionToken = token;
    next();
  });
  const route = (method, url, fn) => app[method](`/api${url}`, asyncRoute(fn));
  function startSession(req, res, u) {
    if (!u.labelsInitialized)
      change(() => {
        if (!rows('userConversationLabels').some((l) => l.userId === u.id))
          defaultLabels.forEach((name) =>
            rows('userConversationLabels').push({ id: id(), userId: u.id, name, description: '' }),
          );
        u.labelsInitialized = true;
      });
    if (req.sessionToken) sessions.delete(req.sessionToken);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { userId: u.id, expiresAt: Date.now() + 86400000 });
    res.cookie('sh_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 86400000,
      path: '/',
    });
    return publicUser(u);
  }
  route('get', '/health', (_, res) =>
    res.json({ ok: true, backend: 'json-server', version: '0.17.4' }),
  );
  route('get', '/auth/me', (req, res) => res.json(publicUser(req.user)));
  route('post', '/auth/register', (req, res) => {
    const email = str(req.body.email, 150).toLowerCase(),
      name = str(req.body.name, 80),
      password = req.body.password;
    check(name.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Revisa nombre y correo.');
    check(
      typeof password === 'string' && password.length >= 10 && password.length <= 128,
      'La contraseña debe tener entre 10 y 128 caracteres.',
    );
    check(!rows('users').some((u) => u.email === email), 'Ese correo ya está registrado.', 409);
    const u = change(() => {
      const u = {
        id: id(),
        name,
        email,
        passwordHash: hash(password, randomBytes(16).toString('hex')),
        providerEnabled: false,
        createdAt: now(),
      };
      rows('users').push(u);
      return u;
    });
    res.status(201).json(startSession(req, res, u));
  });
  route('post', '/auth/login', (req, res) => {
    const email = str(req.body.email, 150).toLowerCase();
    const key = `${req.ip}:${email}`;
    let a = attempts.get(key);
    if (!a || a.until < Date.now()) {
      a = { count: 0, until: Date.now() + 60000 };
      attempts.set(key, a);
    }
    check(++a.count <= 15, 'Espera un minuto antes de volver a intentar.', 429);
    const u = rows('users').find((u) => u.email === email);
    const p = typeof req.body.password === 'string' ? req.body.password : '';
    check(p.length <= 128, 'Credenciales incorrectas.', 401);
    const [salt, stored] = (u?.passwordHash || hash('invalid')).split(':');
    const valid = timingSafeEqual(Buffer.from(stored, 'hex'), scryptSync(p, salt, 64));
    check(u && valid, 'Correo o contraseña incorrectos.', 401);
    attempts.delete(key);
    res.json(startSession(req, res, u));
  });
  route('post', '/auth/logout', (req, res) => {
    sessions.delete(req.sessionToken);
    res.clearCookie('sh_session', { path: '/' });
    res.status(204).end();
  });
  route('get', '/account/profile', (req, res) => {
    const u = user(req);
    res.json(
      rows('providerProfiles').find((p) => p.userId === u.id) || {
        name: u.name,
        headline: '',
        region: '',
        zones: '',
        about: '',
        skills: [],
        languages: [],
        experience: '',
        education: '',
        certifications: '',
        availability: '',
        completed: false,
      },
    );
  });
  route('put', '/account/profile', (req, res) => {
    const u = user(req);
    const complete = req.body.complete === true || u.providerEnabled;
    const body = profileBody(req.body, u, complete);
    const result = change(() => {
      let p = rows('providerProfiles').find((p) => p.userId === u.id);
      if (!p) {
        p = { id: id(), userId: u.id, completed: false };
        rows('providerProfiles').push(p);
      }
      Object.assign(p, body, { completed: complete });
      u.name = p.name;
      if (complete) u.providerEnabled = true;
      return p;
    });
    res.json(result);
  });
  route('get', '/people/:id', (req, res) => {
    const u = required('users', req.params.id);
    const p = rows('providerProfiles').find((p) => p.userId === u.id && p.completed);
    res.json({ id: u.id, name: u.name, createdAt: u.createdAt, profile: p || null });
  });
  route('get', '/metrics', (req, res) => {
    const metrics = {};
    for (const s of rows('services')) {
      const reviews = rows('reviews').filter((r) => r.serviceId === s.id),
        providerReviews = rows('reviews').filter((r) => r.providerId === s.providerId);
      const rating = reviews.length
        ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
        : 0;
      const completed = rows('orders').filter(
        (o) => o.providerId === s.providerId && o.status === 'completed',
      ).length;
      const providerRating = providerReviews.length
        ? providerReviews.reduce((a, r) => a + r.rating, 0) / providerReviews.length
        : 0;
      const samples = [];
      for (const c of rows('conversations')) {
        let pending = null;
        for (const m of rows('messages')
          .filter(
            (m) =>
              m.conversationId === c.id && (m.contextProviderId || c.providerId) === s.providerId,
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
          if (m.kind === 'event') continue;
          if (m.authorId === (m.contextCustomerId || c.customerId) && pending === null)
            pending = Date.parse(m.createdAt);
          else if (m.authorId === (m.contextProviderId || c.providerId) && pending !== null) {
            samples.push((Date.parse(m.createdAt) - pending) / 60000);
            pending = null;
          }
        }
      }
      metrics[s.id] = {
        rating,
        reviewCount: reviews.length,
        completed,
        level:
          levels.find((level) => completed >= level.completed && providerRating >= level.rating)
            ?.name || 'Nuevo',
        savedCount: new Set(
          rows('favoriteLists')
            .filter((l) => l.serviceIds.includes(s.id))
            .map((l) => l.userId),
        ).size,
        responseMinutes: samples.length
          ? samples.reduce((a, b) => a + b, 0) / samples.length
          : null,
      };
    }
    res.json(metrics);
  });
  route('post', '/conversations/open', (req, res) => {
    const u = user(req),
      p = required('users', req.body.providerId);
    check(p.providerEnabled, 'Este perfil no ofrece servicios.');
    res.json(change(() => conversation(u.id, p.id)));
  });
  route('post', '/requests', (req, res) => {
    const u = user(req),
      s = required('services', req.body.serviceId);
    check(s.status === 'published', 'Este servicio ya no está disponible.');
    const p = s.packages.find((p) => p.id === req.body.packageId);
    check(p, 'Paquete inválido.');
    const text = str(req.body.text);
    check(text.length >= 10, 'Describe tu necesidad (10 caracteres como mínimo).');
    const result = change(() => {
      const c = conversation(u.id, s.providerId);
      const fileIds = cleanStrings(req.body.fileIds);
      checkFiles(fileIds, u.id, c.id);
      const r = {
        id: id(),
        conversationId: c.id,
        customerId: u.id,
        providerId: s.providerId,
        serviceId: s.id,
        packageId: p.id,
        snapshot: { title: s.title, packageName: p.name },
        text,
        fileIds,
        createdAt: now(),
      };
      rows('requests').push(r);
      message(c, u, 'request', `${s.title} · ${p.name}\n${text}`, r.id, fileIds);
      return r;
    });
    res.status(201).json(result);
  });
  route('post', '/offers', (req, res) => {
    const u = provider(req),
      c = participant(req, req.body.conversationId),
      s = required('services', req.body.serviceId);
    check(
      s.providerId === u.id && s.status === 'published',
      'Selecciona uno de tus servicios publicados.',
      403,
    );
    const customerId = c.participantIds.find((x) => x !== u.id);
    const b = req.body;
    check(
      str(b.title).length >= 5 &&
        str(b.scope).length >= 10 &&
        positive(b.totalCents) &&
        positive(b.days, 365) &&
        safeDate(b.expiresAt) &&
        Date.parse(b.expiresAt) > Date.now(),
      'Completa el alcance, importe, plazo y vigencia.',
    );
    check(
      ['platform', 'onsite'].includes(b.paymentMode) &&
        (s.modality === 'presencial' || b.paymentMode === 'platform'),
      'Modalidad de pago inválida.',
    );
    const result = change(() => {
      const o = {
        id: id(),
        conversationId: c.id,
        serviceId: s.id,
        providerId: u.id,
        customerId,
        title: str(b.title, 150),
        scope: str(b.scope, 3000),
        totalCents: b.totalCents,
        days: b.days,
        paymentMode: b.paymentMode,
        expiresAt: iso(b.expiresAt),
        status: 'pending',
        createdAt: now(),
      };
      rows('offers').push(o);
      conversation(customerId, u.id);
      message(c, u, 'offer', o.title, o.id);
      return o;
    });
    res.status(201).json(result);
  });
  route('post', '/offers/:id/action', (req, res) => {
    const u = user(req),
      o = required('offers', req.params.id);
    participant(req, o.conversationId);
    check(offerState(o).status === 'pending', 'La oferta ya no está pendiente.', 409);
    const action = req.body.action;
    check(
      (action === 'reject' && u.id === o.customerId) ||
        (action === 'withdraw' && u.id === o.providerId),
      'No puedes realizar esta acción.',
      403,
    );
    res.json(
      change(() => {
        o.status = action === 'reject' ? 'rejected' : 'withdrawn';
        message(
          required('conversations', o.conversationId),
          u,
          'event',
          action === 'reject' ? 'Oferta rechazada' : 'Oferta retirada',
          o.id,
        );
        return o;
      }),
    );
  });
  function quote(req) {
    const u = user(req),
      b = req.body;
    let s, p, o;
    let totalCents,
      scope,
      days,
      packageName,
      unitPriceCents,
      extras = [],
      quantity = 1,
      paymentMode = b.paymentMode || 'platform';
    if (b.offerId) {
      o = required('offers', b.offerId);
      check(o.customerId === u.id, 'Esta oferta no es tuya.', 403);
      check(offerState(o).status === 'pending', 'La oferta venció o ya fue resuelta.', 409);
      s = required('services', o.serviceId);
      totalCents = o.totalCents;
      scope = o.scope;
      days = o.days;
      packageName = o.title;
      unitPriceCents = o.totalCents;
      paymentMode = o.paymentMode;
    } else {
      s = required('services', b.serviceId);
      p = s.packages.find((p) => p.id === b.packageId);
      check(p && p.bookingMode === 'direct', 'Este paquete requiere una solicitud.');
      quantity = Number(b.quantity || 1);
      check(positive(quantity, 100), 'La cantidad debe estar entre 1 y 100.');
      const ids = [...new Set(cleanStrings(b.extraIds))];
      extras = ids.map((e) => {
        const extra = s.extras.find((x) => x.id === e);
        check(extra, 'Un extra ya no está disponible.');
        return extra;
      });
      unitPriceCents = p.priceCents;
      totalCents = p.priceCents * quantity + extras.reduce((a, e) => a + e.priceCents, 0);
      days = p.days + extras.reduce((a, e) => a + e.days, 0);
      scope = p.scope;
      packageName = p.name;
    }
    check(s.status === 'published', 'Este servicio ya no está disponible.', 409);
    check(s.providerId !== u.id, 'No puedes contratar tu propio servicio.');
    check(
      ['platform', 'onsite'].includes(paymentMode) &&
        (s.modality === 'presencial' || paymentMode === 'platform'),
      'El pago presencial solo aplica a servicios presenciales.',
    );
    check(positive(totalCents), 'Importe fuera de rango.');
    return {
      s,
      o,
      totalCents,
      days,
      paymentMode,
      snapshot: {
        title: s.title,
        providerName: required('users', s.providerId).name,
        customerName: u.name,
        packageName,
        scope,
        unitPriceCents,
        quantity,
        extras: structuredClone(extras),
        modality: s.modality,
      },
    };
  }
  route('post', '/checkout/quote', (req, res) => {
    const q = quote(req);
    res.json(pick(q, ['totalCents', 'days', 'paymentMode', 'snapshot']));
  });
  route('post', '/checkout/confirm', (req, res) => {
    const u = user(req),
      b = req.body,
      key = str(b.idempotencyKey, 100);
    check(key.length >= 8, 'Falta la clave de confirmación.');
    const old = rows('orders').find((o) => o.customerId === u.id && o.idempotencyKey === key);
    if (old) return res.json(old);
    if (b.offerId) {
      const existing = rows('orders').find((o) => o.offerId === b.offerId);
      if (existing) {
        check(existing.customerId === u.id, 'Acceso denegado.', 403);
        return res.json(existing);
      }
    }
    const q = quote(req);
    check(
      b.expectedTotalCents === q.totalCents,
      'El importe cambió. Revisa el resumen antes de confirmar.',
      409,
    );
    check(str(b.requirements).length >= 5, 'Completa los requisitos.');
    if (q.snapshot.modality === 'presencial')
      check(
        safeDate(b.requestedAt) &&
          Date.parse(b.requestedAt) > Date.now() &&
          str(b.address).length >= 5,
        'Indica una fecha futura y dirección.',
      );
    if (q.paymentMode === 'platform')
      check(
        b.paymentResult === 'success',
        'El pago no fue aprobado. Puedes volver a intentarlo.',
        402,
      );
    const result = change(() => {
      const c = conversation(u.id, q.s.providerId);
      const order = {
        id: id(),
        customerId: u.id,
        providerId: q.s.providerId,
        serviceId: q.s.id,
        offerId: q.o?.id,
        conversationId: c.id,
        snapshot: q.snapshot,
        totalCents: q.totalCents,
        requirements: str(b.requirements),
        status: 'agreed',
        paymentMode: q.paymentMode,
        paymentStatus: q.paymentMode === 'platform' ? 'paid' : 'pending',
        requestedAt: q.snapshot.modality === 'presencial' ? iso(b.requestedAt) : undefined,
        address: q.snapshot.modality === 'presencial' ? str(b.address, 300) : undefined,
        dueAt: new Date(Date.now() + q.days * 86400000).toISOString(),
        createdAt: now(),
        events: [{ action: 'agreed', actorId: u.id, at: now(), note: 'Contratación confirmada' }],
        idempotencyKey: key,
      };
      rows('orders').push(order);
      if (q.o) {
        q.o.status = 'accepted';
        q.o.orderId = order.id;
      }
      if (q.paymentMode === 'platform')
        rows('payments').push({
          id: id(),
          orderId: order.id,
          customerId: u.id,
          providerId: q.s.providerId,
          title: q.snapshot.title,
          amountCents: q.totalCents,
          status: 'paid',
          createdAt: now(),
        });
      message(c, u, 'event', 'Contratación confirmada', order.id);
      notify(q.s.providerId, 'Tienes un nuevo pedido', `/pedidos/${order.id}`);
      return order;
    });
    res.status(201).json(result);
  });
  route('post', '/orders/:id/action', (req, res) => {
    const u = user(req),
      o = orderParticipant(req, req.params.id),
      a = req.body.action,
      note = str(req.body.note, 1000);
    const isProvider = o.providerId === u.id,
      isCustomer = o.customerId === u.id;
    const target = {
      start: 'in_progress',
      deliver: 'delivered',
      complete: 'completed',
      adjust: 'in_progress',
      cancel: 'cancelled',
    }[a];
    if (target && o.status === target && o.events.at(-1)?.action === a) return res.json(o);
    check(
      (a === 'start' && isProvider && o.status === 'agreed') ||
        (a === 'deliver' && isProvider && o.status === 'in_progress') ||
        (a === 'complete' && isCustomer && o.status === 'delivered') ||
        (a === 'adjust' && isCustomer && o.status === 'delivered' && note.length >= 5) ||
        (a === 'cancel' && !['completed', 'cancelled'].includes(o.status) && note.length >= 5) ||
        (a === 'schedule' &&
          isProvider &&
          ['agreed', 'in_progress'].includes(o.status) &&
          o.snapshot.modality === 'presencial') ||
        (a === 'payment_report' &&
          isCustomer &&
          o.paymentMode === 'onsite' &&
          o.paymentStatus === 'pending' &&
          o.status !== 'cancelled') ||
        (a === 'payment_confirm' &&
          isProvider &&
          o.paymentStatus === 'confirmation_pending' &&
          o.status !== 'cancelled'),
      'La acción no corresponde al estado o a tu participación.',
      409,
    );
    if (a === 'schedule')
      check(
        safeDate(req.body.confirmedAt) && Date.parse(req.body.confirmedAt) > Date.now(),
        'Selecciona una fecha futura.',
      );
    res.json(
      change(() => {
        if (target) o.status = target;
        if (a === 'start') o.startedAt = now();
        if (a === 'schedule') o.confirmedAt = iso(req.body.confirmedAt);
        if (a === 'payment_report') o.paymentStatus = 'confirmation_pending';
        if (a === 'payment_confirm') {
          o.paymentStatus = 'confirmed';
          rows('payments').push({
            id: id(),
            orderId: o.id,
            customerId: o.customerId,
            providerId: o.providerId,
            title: o.snapshot.title,
            amountCents: o.totalCents,
            status: 'confirmed',
            createdAt: now(),
          });
        }
        if (a === 'cancel' && o.paymentStatus === 'paid') {
          o.paymentStatus = 'refunded';
          rows('payments')
            .filter((p) => p.orderId === o.id)
            .forEach((p) => (p.status = 'refunded'));
        }
        o.events.push({ action: a, actorId: u.id, at: now(), note });
        const names = {
          start: 'Trabajo iniciado',
          deliver: 'Entrega pendiente de confirmación',
          complete: 'Pedido completado',
          adjust: 'Ajuste solicitado',
          cancel: 'Pedido cancelado',
          schedule: 'Fecha de atención confirmada',
          payment_report: 'Pago pendiente de confirmación',
          payment_confirm: 'Pago confirmado',
        };
        message(required('conversations', o.conversationId), u, 'event', names[a], o.id);
        notify(isProvider ? o.customerId : o.providerId, names[a], `/pedidos/${o.id}`);
        return o;
      }),
    );
  });
  route('post', '/favoriteLists/:id/items', (req, res) => {
    const u = user(req),
      l = required('favoriteLists', req.params.id);
    check(l.userId === u.id, 'Lista privada.', 403);
    const sid = str(req.body.serviceId, 100);
    const s = find('services', sid);
    check(req.body.remove || s?.status === 'published', 'Servicio no disponible.');
    res.json(
      change(() => {
        l.serviceIds = req.body.remove
          ? l.serviceIds.filter((x) => x !== sid)
          : [...l.serviceIds.filter((x) => x !== sid), sid];
        return l;
      }),
    );
  });
  route('post', '/favoriteLists/:id/share', (req, res) => {
    const u = user(req),
      l = required('favoriteLists', req.params.id);
    check(l.userId === u.id, 'Lista privada.', 403);
    res.json(
      change(() => {
        l.shareToken = req.body.revoke ? undefined : randomBytes(24).toString('hex');
        return l;
      }),
    );
  });
  route('get', '/shared-lists/:token', (req, res) => {
    const l = rows('favoriteLists').find((l) => l.shareToken && l.shareToken === req.params.token);
    check(l, 'El enlace no existe o fue revocado.', 404);
    res.json({
      id: l.id,
      name: l.name,
      description: l.description,
      services: l.serviceIds
        .map((s) => find('services', s))
        .filter((s) => s?.status === 'published'),
      unavailableCount: l.serviceIds.filter((s) => find('services', s)?.status !== 'published')
        .length,
    });
  });
  route('put', '/conversations/:id/preferences', (req, res) => {
    const u = user(req);
    const c = participant(req, req.params.id);
    const b = req.body;
    res.json(
      change(() => {
        const p = preference(u.id, c.id);
        if (b.folder !== undefined) {
          check(['inbox', 'archived', 'spam', 'deleted'].includes(b.folder), 'Bandeja inválida.');
          p.folder = b.folder;
        }
        if (typeof b.starred === 'boolean') p.starred = b.starred;
        if (typeof b.unread === 'boolean') {
          p.unread = b.unread;
          if (!b.unread) p.readAt = now();
        }
        if (b.labelIds) {
          p.labelIds = [...new Set(cleanStrings(b.labelIds))];
          check(
            p.labelIds.every((l) => find('userConversationLabels', l)?.userId === u.id),
            'Etiqueta ajena.',
            403,
          );
        }
        if (b.savedMessageId) {
          const m = required('messages', b.savedMessageId);
          check(m.conversationId === c.id, 'Mensaje ajeno.', 403);
          p.savedMessageIds = p.savedMessageIds.includes(m.id)
            ? p.savedMessageIds.filter((x) => x !== m.id)
            : [...p.savedMessageIds, m.id];
        }
        return p;
      }),
    );
  });
  function csvCell(v) {
    let s = String(v ?? '');
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  route('get', '/billing/export', (req, res) => {
    const u = user(req);
    let items = rows('payments').filter((p) => [p.customerId, p.providerId].includes(u.id));
    if (req.query.from) items = items.filter((p) => p.createdAt.slice(0, 10) >= req.query.from);
    if (req.query.to) items = items.filter((p) => p.createdAt.slice(0, 10) <= req.query.to);
    if (req.query.q)
      items = items.filter((p) =>
        `${p.id} ${p.orderId} ${p.title}`.toLowerCase().includes(String(req.query.q).toLowerCase()),
      );
    const data = [
      [
        'Movimiento',
        'Pedido',
        'Fecha (Lima)',
        'Servicio',
        'Participación',
        'Moneda',
        'Importe',
        'Estado',
      ],
      ...items.map((p) => [
        p.id,
        p.orderId,
        new Date(p.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        p.title,
        p.customerId === u.id ? 'Pago' : 'Cobro',
        'PEN',
        (p.amountCents / 100).toFixed(2),
        p.status,
      ]),
    ];
    res
      .type('text/csv; charset=utf-8')
      .attachment('servicehub-movimientos.csv')
      .send('\ufeff' + data.map((row) => row.map(csvCell).join(';')).join('\r\n'));
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });
  app.post(
    '/api/files',
    (req, res, next) => {
      try {
        user(req);
        next();
      } catch (e) {
        next(e);
      }
    },
    upload.single('image'),
    asyncRoute((req, res) => {
      const u = user(req),
        f = req.file;
      check(f, 'Selecciona una imagen.');
      const b = f.buffer;
      const png =
        b.length > 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg =
        b.length > 4 &&
        b[0] === 255 &&
        b[1] === 216 &&
        b[b.length - 2] === 255 &&
        b[b.length - 1] === 217;
      const webp =
        b.length > 16 &&
        b.subarray(0, 4).toString() === 'RIFF' &&
        b.subarray(8, 12).toString() === 'WEBP';
      check(png || jpeg || webp, 'Solo se permiten imágenes PNG, JPEG o WebP válidas.');
      const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp';
      check(f.mimetype === mime, 'El contenido no coincide con el formato.');
      const privateFile = !!req.body.conversationId;
      if (privateFile) participant(req, req.body.conversationId);
      const fileId = id(),
        key = fileId + (png ? '.png' : jpeg ? '.jpg' : '.webp'),
        filePath = path.join(uploadDir, key);
      fs.writeFileSync(filePath, b);
      try {
        const record = change(() => {
          const file = {
            id: fileId,
            ownerId: u.id,
            key,
            mime,
            size: b.length,
            visibility: privateFile ? 'private' : 'public',
            conversationId: privateFile ? req.body.conversationId : undefined,
            createdAt: now(),
            url: `/api/files/${fileId}/content`,
          };
          rows('files').push(file);
          return file;
        });
        res
          .status(201)
          .json(
            pick(record, [
              'id',
              'ownerId',
              'mime',
              'size',
              'visibility',
              'conversationId',
              'createdAt',
              'url',
            ]),
          );
      } catch (e) {
        fs.unlinkSync(filePath);
        throw e;
      }
    }),
  );
  route('get', '/files/:id/content', (req, res) => {
    const f = required('files', req.params.id);
    if (f.visibility === 'private') participant(req, f.conversationId);
    const resolved = path.resolve(uploadDir, f.key);
    check(resolved.startsWith(path.resolve(uploadDir) + path.sep), 'Ruta inválida.', 403);
    check(fs.existsSync(resolved), 'Imagen no disponible.', 404);
    res.type(f.mime).sendFile(resolved);
  });
  const collections = new Set([
    'categories',
    'serviceTypes',
    'services',
    'providerProfiles',
    'reviews',
    'conversations',
    'messages',
    'conversationPreferences',
    'userConversationLabels',
    'requests',
    'offers',
    'orders',
    'payments',
    'favoriteLists',
    'notifications',
  ]);
  // Ordinary CRUD stays in the real JSON Server router. The boundary forces scope,
  // validates bodies and prevents alternate relational and /db endpoints.
  app.use('/api', (req, res, next) => {
    try {
      const parts = req.path.split('/').filter(Boolean);
      const [name, key] = parts;
      check(parts.length <= 2 && collections.has(name), 'Ruta no disponible.', 404);
      check(
        !Object.keys(req.query).some((k) =>
          ['_embed', '_expand', '_end', '_start', 'callback'].includes(k),
        ),
        'Consulta no permitida.',
      );
      const read = ['GET', 'HEAD'].includes(req.method);
      check(read || ['POST', 'PATCH', 'DELETE'].includes(req.method), 'Método no permitido.', 405);
      let record = key ? required(name, key) : null;
      if (read) {
        let allowed;
        if (['categories', 'serviceTypes', 'reviews'].includes(name)) allowed = rows(name);
        else if (name === 'services')
          allowed = rows(name).filter(
            (s) => s.status === 'published' || s.providerId === req.user?.id,
          );
        else if (name === 'providerProfiles')
          allowed = rows(name).filter((p) => p.completed || p.userId === req.user?.id);
        else {
          const u = user(req);
          if (['conversations', 'messages', 'requests', 'offers'].includes(name)) {
            const convs = rows('conversations')
              .filter((c) => c.participantIds.includes(u.id))
              .map((c) => c.id);
            allowed = rows(name).filter((r) =>
              convs.includes(name === 'conversations' ? r.id : r.conversationId),
            );
          } else if (['orders', 'payments'].includes(name))
            allowed = rows(name).filter((r) => [r.customerId, r.providerId].includes(u.id));
          else allowed = rows(name).filter((r) => r.userId === u.id);
        }
        if (record)
          check(
            allowed.some((x) => x.id === record.id),
            'No tienes acceso a este recurso.',
            403,
          );
        else {
          const requested = req.query.id ? [req.query.id].flat() : null;
          const ids = allowed
            .filter((r) => !requested || requested.includes(r.id))
            .map((r) => r.id);
          req.query.id = ids.length ? ids : ['__no_matches__'];
        }
      } else {
        const u = user(req);
        check(
          ![
            'categories',
            'serviceTypes',
            'providerProfiles',
            'conversations',
            'conversationPreferences',
            'requests',
            'offers',
            'orders',
            'payments',
          ].includes(name),
          'Utiliza la acción correspondiente.',
          405,
        );
        if (name === 'services') {
          provider(req);
          if (record) check(record.providerId === u.id, 'Solo puedes editar tus servicios.', 403);
          if (req.method === 'DELETE') {
            check(
              record &&
                record.status === 'draft' &&
                !rows('orders').some((o) => o.serviceId === record.id) &&
                !rows('offers').some((o) => o.serviceId === record.id),
              'Solo se eliminan borradores sin historial.',
            );
          } else
            req.body = {
              ...serviceBody({ ...record, ...req.body }, u, record),
              ...(record ? {} : { id: id(), providerId: u.id, createdAt: now() }),
            };
        }
        if (name === 'favoriteLists') {
          if (record) check(record.userId === u.id, 'Lista privada.', 403);
          if (req.method !== 'DELETE') {
            const b = { ...record, ...req.body };
            check(str(b.name, 80).length >= 2, 'Pon un nombre a tu lista.');
            req.body = {
              name: str(b.name, 80),
              description: str(b.description, 300),
              ...(record ? {} : { id: id(), userId: u.id, serviceIds: [], createdAt: now() }),
            };
          }
        }
        if (name === 'userConversationLabels') {
          if (record) check(record.userId === u.id, 'Etiqueta privada.', 403);
          if (req.method !== 'DELETE') {
            check(str(req.body.name, 60).length >= 2, 'Pon un nombre a la etiqueta.');
            req.body = {
              name: str(req.body.name, 60),
              description: str(req.body.description, 200),
              ...(record ? {} : { id: id(), userId: u.id }),
            };
          }
        }
        if (name === 'notifications') {
          check(
            req.method === 'PATCH' && record?.userId === u.id,
            'No puedes cambiar esta notificación.',
            403,
          );
          req.body = { read: req.body.read === true };
        }
        if (name === 'messages') {
          check(
            req.method === 'POST' && !key,
            'Los mensajes enviados no se pueden modificar.',
            405,
          );
          const c = participant(req, req.body.conversationId);
          const text = str(req.body.text);
          const fileIds = cleanStrings(req.body.fileIds);
          check(text || fileIds.length, 'Escribe un mensaje.');
          checkFiles(fileIds, u.id, c.id);
          const replyToId = req.body.replyToId;
          if (replyToId)
            check(
              required('messages', replyToId).conversationId === c.id,
              'El mensaje citado no pertenece a esta conversación.',
            );
          req.body = {
            id: id(),
            conversationId: c.id,
            contextCustomerId: c.customerId,
            contextProviderId: c.providerId,
            authorId: u.id,
            authorName: u.name,
            text,
            kind: 'text',
            fileIds,
            replyToId,
            createdAt: now(),
          };
        }
        if (name === 'reviews') {
          if (req.method === 'POST') {
            const o = orderParticipant(req, req.body.orderId);
            check(
              o.customerId === u.id &&
                (o.status === 'completed' || (o.status === 'cancelled' && o.startedAt)),
              'Este pedido no permite reseñas.',
              403,
            );
            check(
              !rows('reviews').some((r) => r.orderId === o.id),
              'Ya reseñaste este pedido.',
              409,
            );
            check(
              positive(req.body.rating, 5) && str(req.body.comment).length >= 10,
              'Selecciona de 1 a 5 estrellas y escribe al menos 10 caracteres.',
            );
            req.body = {
              id: id(),
              orderId: o.id,
              serviceId: o.serviceId,
              providerId: o.providerId,
              customerId: u.id,
              authorName: u.name,
              rating: req.body.rating,
              comment: str(req.body.comment, 3000),
              cancelled: o.status === 'cancelled',
              createdAt: now(),
            };
          } else {
            check(
              req.method === 'PATCH' && record?.providerId === u.id,
              'Solo el profesional puede responder.',
              403,
            );
            check(str(req.body.response).length >= 2, 'Escribe una respuesta.');
            req.body = { response: str(req.body.response, 2000) };
          }
        }
        if (req.method === 'POST') check(!key, 'Ruta inválida.', 404);
        else check(key, 'Indica el recurso.', 400);
      }
      req.collectionName = name;
      req.deletedRecord = req.method === 'DELETE' ? record : null;
      next();
    } catch (e) {
      next(e);
    }
  });
  router.render = (req, res) => {
    let data = res.locals.data;
    if (req.method === 'GET' && req.collectionName === 'conversations') {
      const enrich = (c) => ({
        ...c,
        lastMessage:
          rows('messages')
            .filter((m) => m.conversationId === c.id)
            .at(-1)?.text || '',
      });
      data = Array.isArray(data) ? data.map(enrich) : enrich(data);
    }
    if (req.collectionName === 'offers')
      data = Array.isArray(data) ? data.map(offerState) : offerState(data);
    if (res.statusCode < 400 && req.method === 'POST' && req.collectionName === 'messages')
      change(() => {
        const c = required('conversations', data.conversationId);
        c.updatedAt = data.createdAt;
        for (const uid of c.participantIds.filter((x) => x !== req.user.id)) {
          const p = preference(uid, c.id);
          p.unread = true;
          if (p.folder === 'deleted') p.folder = 'inbox';
          notify(uid, `Nuevo mensaje de ${req.user.name}`, `/mensajes/${c.id}`);
        }
      });
    if (
      req.method === 'DELETE' &&
      req.collectionName === 'userConversationLabels' &&
      req.deletedRecord
    )
      change(() =>
        rows('conversationPreferences').forEach(
          (p) => (p.labelIds = p.labelIds.filter((x) => x !== req.deletedRecord.id)),
        ),
      );
    res.jsonp(data);
  };
  app.use('/api', router);
  app.use((req, res) => res.status(404).json({ message: 'Ruta no disponible.' }));
  app.use((err, req, res, next) => {
    if (!quiet && !(err instanceof ApiError)) console.error(err.message);
    res.status(err.status || (err instanceof multer.MulterError ? 400 : 500)).json({
      message:
        err instanceof multer.MulterError
          ? 'Imagen demasiado grande. Máximo 5 MB.'
          : err.status
            ? err.message
            : 'No se pudo completar la operación.',
    });
  });
  return { app, db };
}
module.exports = { createApp };
