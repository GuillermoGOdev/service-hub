const { scryptSync } = require('node:crypto');
const PASSWORD = 'ServiceHub123!';
function hash(password, salt = 'servicehub-demo-seed-only') {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function seed() {
  const createdAt = '2026-10-01T15:00:00.000Z';
  const categories = [
    ['hogar', 'Hogar y mantenimiento', 'business-trip', '#625bef', '#cccdff'],
    ['soporte', 'Soporte técnico', 'business-presentation', '#cb547d', '#f3d9e1'],
    ['diseno', 'Diseño y multimedia', 'change-setting', '#00994c', '#d6f4e4'],
    [
      'desarrollo',
      'Desarrollo y tecnología',
      'conversation-businessman-customer',
      '#d76200',
      '#ffe7cd',
    ],
    ['marketing', 'Marketing y redacción', 'designer-desk', '#817c00', '#f5f7cc'],
    ['clases', 'Clases y asesorías', 'designer-giving-a-keynote', '#168eaa', '#ccf3ff'],
  ].map(([id, name, illustration, color, light]) => ({
    id,
    name,
    illustration: `/assets/ilustrations/${illustration}.svg`,
    color,
    light,
  }));
  const names = [
    'Lucía Ramos',
    'Diego Torres',
    'Valeria Soto',
    'Mateo Ríos',
    'Camila Vega',
    'Andrés Silva',
  ];
  const users = [
    {
      id: 'cliente',
      name: 'Ana Mendoza',
      email: 'cliente@servicehub.test',
      providerEnabled: false,
      passwordHash: hash(PASSWORD),
      createdAt,
    },
    ...names.map((name, i) => ({
      id: `pro-${i + 1}`,
      name,
      email: i === 0 ? 'profesional@servicehub.test' : `pro${i + 1}@servicehub.test`,
      providerEnabled: true,
      passwordHash: hash(PASSWORD),
      createdAt,
    })),
  ];
  const typeNames = [
    'Reparaciones del hogar',
    'Mantenimiento de equipos',
    'Diseño y edición',
    'Aplicaciones web',
    'Contenido para marcas',
    'Clases particulares',
  ];
  const serviceTypes = categories.map((c, i) => ({
    id: `tipo-${i + 1}`,
    categoryId: c.id,
    name: typeNames[i],
  }));
  const providerProfiles = names.map((name, i) => ({
    id: `perfil-${i + 1}`,
    userId: `pro-${i + 1}`,
    name,
    headline: [
      'Soluciones para tu hogar',
      'Tu tecnología, en buenas manos',
      'Diseño que cuenta tu historia',
      'Desarrollo web a tu medida',
      'Ideas que conectan con personas',
      'Aprender con calma y claridad',
    ][i],
    region: i === 5 ? 'Arequipa' : 'Lima',
    zones: 'Miraflores, San Isidro, Surco',
    about:
      'Me gusta escuchar lo que necesitas y convertirlo en un trabajo cuidado. Coordinemos los detalles para encontrar una solución a tu medida.',
    skills: [typeNames[i], 'Comunicación'],
    languages: [{ name: 'Español', level: 'avanzado' }],
    experience: 'Trabajo independiente con pequeños negocios y personas.',
    education: '',
    certifications: '',
    availability: 'Lunes a viernes, 09:00–18:00',
    completed: true,
  }));
  const titles = [
    'Deja tus muebles y repisas bien instalados',
    'Pon a punto tu laptop para trabajar mejor',
    'Una identidad visual que se sienta tuya',
    'Tu idea, convertida en una página web',
    'Textos que dan voz a tu marca',
    'Aprende Excel con ejercicios de tu día a día',
    'Soluciona las pequeñas reparaciones de casa',
    'Recupera la velocidad de tu computadora',
    'Reels con ritmo para contar tu historia',
    'Una tienda online para tu emprendimiento',
    'Contenido para un mes de redes sociales',
    'Refuerza tus conocimientos de matemáticas',
    'Renueva la iluminación de tus espacios',
    'Configura tu red y mejora tu conexión',
    'Diseña una presentación que conecte',
    'Automatiza tareas con JavaScript',
    'Revisa y mejora los textos de tu web',
    'Practica inglés con conversaciones reales',
  ];
  const services = titles.map((title, i) => {
    const c = i % 6;
    const modality = [0, 1].includes(c) ? 'presencial' : 'digital';
    const price = 6000 + c * 2500 + (i > 5 ? 2000 : 0);
    return {
      id: `servicio-${i + 1}`,
      providerId: `pro-${c + 1}`,
      title,
      categoryId: categories[c].id,
      typeId: `tipo-${c + 1}`,
      tags: [
        ['reparaciones', 'hogar'],
        ['laptops', 'soporte'],
        ['diseño', 'reels'],
        ['web', 'javascript'],
        ['redacción', 'marcas'],
        ['aprendizaje', 'excel'],
      ][c],
      modality,
      region: modality === 'presencial' ? 'Lima' : '',
      zones: modality === 'presencial' ? 'Miraflores, San Isidro, Surco' : '',
      description: `${title}. Trabajaremos a partir de tus necesidades, con una propuesta clara y comunicación durante el proceso.\n\nIncluye una conversación inicial para revisar el alcance, la ejecución del trabajo y una entrega con indicaciones para que puedas aprovechar el resultado. Antes de empezar, comparte tus referencias y los detalles importantes.`,
      cover: categories[c].illustration,
      imageIds: [],
      packages: ['Básico', 'Estándar', 'Premium'].map((name, j) => ({
        id: `paquete-${j + 1}`,
        name,
        scope: [
          `Solución esencial para una necesidad concreta.`,
          `Un alcance más amplio, definido contigo.`,
          `Acompañamiento completo para tu proyecto.`,
        ][j],
        priceCents: price * (j + 1),
        unit: modality === 'presencial' ? 'visita' : 'proyecto',
        days: 3 + j * 2,
        revisions: modality === 'digital' ? j + 1 : 0,
        bookingMode: j === 0 ? 'direct' : 'request',
        features: [
          'Coordinación inicial',
          'Entrega del alcance acordado',
          ...(j > 0 ? ['Seguimiento personalizado'] : []),
        ],
      })),
      extras: [
        {
          id: 'extra-1',
          name: modality === 'presencial' ? 'Visita adicional' : 'Versión adicional',
          priceCents: 2500,
          days: 1,
        },
      ],
      requirements: 'Describe tu necesidad e incluye las referencias que tengas.',
      faq: [
        {
          question: '¿Cómo coordinamos los detalles?',
          answer:
            'Puedes contactarme antes de contratar. Revisaremos el alcance y resolveremos tus dudas.',
        },
        {
          question: '¿Puedo solicitar otro alcance?',
          answer: 'Sí. Envíame una solicitud y prepararé una oferta personalizada.',
        },
      ],
      status: 'published',
      createdAt,
    };
  });
  const conversations = [
    {
      id: 'conversacion-demo',
      participantIds: ['cliente', 'pro-1'],
      customerId: 'cliente',
      providerId: 'pro-1',
      createdAt,
      updatedAt: '2026-10-01T15:20:00.000Z',
    },
  ];
  const messages = [
    {
      id: 'mensaje-1',
      conversationId: 'conversacion-demo',
      authorId: 'cliente',
      authorName: 'Ana Mendoza',
      text: 'Hola Lucía, quisiera coordinar la instalación de dos repisas.',
      kind: 'text',
      fileIds: [],
      createdAt,
    },
    {
      id: 'mensaje-2',
      conversationId: 'conversacion-demo',
      authorId: 'pro-1',
      authorName: 'Lucía Ramos',
      text: 'Hola Ana. Claro, podemos revisar las medidas y el tipo de pared.',
      kind: 'text',
      fileIds: [],
      createdAt: '2026-10-01T15:18:00.000Z',
    },
  ];
  const orders = [0, 1, 2, 3].map((n) => ({
    id: `pedido-demo-${n + 1}`,
    serviceId: 'servicio-1',
    customerId: 'cliente',
    providerId: 'pro-1',
    conversationId: 'conversacion-demo',
    snapshot: {
      title: services[0].title,
      providerName: names[0],
      customerName: 'Ana Mendoza',
      packageName: 'Básico',
      scope: services[0].packages[0].scope,
      unitPriceCents: 6000,
      quantity: 1,
      extras: [],
      modality: 'presencial',
    },
    totalCents: 6000,
    requirements: 'Instalar dos repisas en sala.',
    status: ['completed', 'in_progress', 'cancelled', 'cancelled'][n],
    paymentMode: 'onsite',
    paymentStatus: n === 0 ? 'confirmed' : 'pending',
    createdAt,
    startedAt: n !== 3 ? '2026-10-02T15:00:00.000Z' : undefined,
    dueAt: '2026-10-15T15:00:00.000Z',
    requestedAt: n === 1 ? '2026-10-15T15:00:00.000Z' : '2026-10-02T15:00:00.000Z',
    address: 'Miraflores, Lima',
    events: [
      { action: 'agreed', actorId: 'cliente', at: createdAt, note: 'Acuerdo creado' },
      ...(n !== 3
        ? [
            {
              action: 'start',
              actorId: 'pro-1',
              at: '2026-10-02T15:00:00.000Z',
              note: 'Trabajo iniciado',
            },
          ]
        : []),
      ...(n === 0
        ? [
            {
              action: 'deliver',
              actorId: 'pro-1',
              at: '2026-10-03T14:00:00.000Z',
              note: 'Instalación entregada',
            },
          ]
        : []),
      ...(n !== 1
        ? [
            {
              action: n === 0 ? 'complete' : 'cancel',
              actorId: 'cliente',
              at: '2026-10-03T15:00:00.000Z',
              note: n === 0 ? 'Entrega confirmada' : 'Cambio en la necesidad del cliente',
            },
          ]
        : []),
    ],
    idempotencyKey: `seed-${n}`,
  }));
  const reviews = [
    {
      id: 'resena-1',
      orderId: orders[0].id,
      serviceId: 'servicio-1',
      providerId: 'pro-1',
      customerId: 'cliente',
      authorName: 'Ana Mendoza',
      rating: 5,
      comment:
        'Muy cuidadosa con la instalación y puntual. Todo quedó como lo habíamos coordinado.',
      response: 'Gracias, Ana. Un gusto ayudarte.',
      cancelled: false,
      createdAt: '2026-10-03T16:00:00.000Z',
    },
    {
      id: 'resena-2',
      orderId: orders[2].id,
      serviceId: 'servicio-1',
      providerId: 'pro-1',
      customerId: 'cliente',
      authorName: 'Ana Mendoza',
      rating: 4,
      comment:
        'La comunicación fue buena. Cancelamos después de empezar porque cambiaron las medidas del espacio.',
      cancelled: true,
      createdAt: '2026-10-04T16:00:00.000Z',
    },
  ];
  const offers = [
    {
      id: 'oferta-demo',
      conversationId: conversations[0].id,
      providerId: 'pro-1',
      customerId: 'cliente',
      serviceId: 'servicio-1',
      title: 'Instalación de dos repisas',
      scope: 'Instalación y nivelación. No incluye materiales.',
      totalCents: 12000,
      days: 3,
      paymentMode: 'onsite',
      expiresAt: '2027-12-31T23:59:00.000Z',
      status: 'pending',
      createdAt: '2026-10-01T15:20:00.000Z',
    },
  ];
  messages.push({
    id: 'mensaje-oferta',
    conversationId: conversations[0].id,
    authorId: 'pro-1',
    authorName: names[0],
    kind: 'offer',
    referenceId: offers[0].id,
    text: offers[0].title,
    fileIds: [],
    createdAt: '2026-10-01T15:20:00.000Z',
  });
  messages.forEach((m) => {
    m.contextCustomerId = 'cliente';
    m.contextProviderId = 'pro-1';
  });
  return {
    users,
    providerProfiles,
    categories,
    serviceTypes,
    services,
    conversations,
    messages,
    conversationPreferences: [],
    userConversationLabels: [],
    requests: [],
    offers,
    orders,
    payments: [
      {
        id: 'pago-demo',
        orderId: orders[0].id,
        customerId: 'cliente',
        providerId: 'pro-1',
        title: orders[0].snapshot.title,
        amountCents: 6000,
        status: 'confirmed',
        createdAt: '2026-10-03T15:00:00.000Z',
      },
    ],
    reviews,
    favoriteLists: [
      {
        id: 'lista-demo',
        userId: 'cliente',
        name: 'Ideas para mi casa',
        description: 'Servicios para los próximos arreglos.',
        serviceIds: ['servicio-1', 'servicio-7'],
        createdAt,
      },
    ],
    notifications: [],
    files: [],
  };
}
module.exports = { seed, hash };
