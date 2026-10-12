# API real de la demo

Base: `/api`. Desarrollo same-origin desde 4200 por proxy a 3000; tests E2E misma procedencia en 4300. JSON de error: `{ "message": "..." }`. Cookie `sh_session` HttpOnly; enviar cookie desde el mismo navegador. `GET /api/health` declara backend y versión.

## Router JSON Server 0.17.4

Estas colecciones usan realmente `jsonServer.router(dbFile)`. El middleware acota IDs, verbos y cuerpos; por diseño no expone el CRUD abierto del paquete.

| Recurso                         | GET lista / id                  | POST                    | PATCH                   | DELETE                        |
| ------------------------------- | ------------------------------- | ----------------------- | ----------------------- | ----------------------------- |
| categories, serviceTypes        | Público                         | No                      | No                      | No                            |
| services                        | Publicados + propios            | Provider completo       | Propietario             | Borrador propio sin historial |
| providerProfiles                | Completos + propio              | Por extensión           | Por extensión           | No                            |
| reviews                         | Público                         | Cliente elegible        | Provider, solo response | No                            |
| messages                        | Participante                    | Participante, solo text | No                      | No                            |
| conversations, requests, offers | Participante                    | Por extensión           | Por extensión           | No                            |
| conversationPreferences         | Solo dueño                      | Por extensión           | Por extensión           | No                            |
| userConversationLabels          | Solo dueño                      | Dueño                   | Dueño                   | Dueño; limpia asociaciones    |
| orders, payments                | Cliente o provider del registro | Por extensión           | Por extensión           | No                            |
| favoriteLists                   | Solo dueño                      | Dueño                   | Nombre/descripción      | Dueño                         |
| notifications                   | Solo destinatario               | Generadas por acciones  | Solo read               | No                            |

No se publica users, `/db`, sesiones, metadatos internos de files ni rutas relacionales anidadas. Se bloquean `_embed`, `_expand`, `callback`, `_start` y `_end`. GET privado ajeno por ID devuelve 403; colección privada se limita a IDs autorizados antes de filtros/páginas. Propietario/autor enviados por cliente se ignoran.

Consulta verificada:

```http
GET /api/services?_page=2&_limit=8&_sort=title&_order=asc
```

Responde **array**, no objeto de paginación v1: ocho servicios de una semilla con 18, `X-Total-Count: 18` y `Link` de páginas. Usa sintaxis 0.17.4 (`q`, campo, campo_gte, campo_lte, `_sort`, `_order`, `_page`, `_limit`). No `_per_page`.

El catálogo Angular pide `services?status=published`, perfiles, tipos, categorías y métricas. Su búsqueda sin tildes, puntuación de relevancia, filtros compuestos, orden y paginación se hacen en memoria sobre el resultado HTTP completo. Por eso el total visible corresponde al conjunto filtrado. Conversaciones, mensajes, reviews, pedidos y pagos usan filtros/orden remotos básicos. Datos pequeños de demo; no es búsqueda escalable.

### Crear servicio (provider)

```json
{
  "title": "Diseño una identidad para tu marca",
  "categoryId": "diseno",
  "typeId": "tipo-3",
  "modality": "digital",
  "description": "Una propuesta visual que responde a las necesidades de tu marca.",
  "requirements": "Comparte el nombre y las referencias.",
  "tags": ["diseño"],
  "imageIds": [],
  "faq": [],
  "extras": [],
  "status": "published",
  "packages": [
    {
      "scope": "Propuesta esencial de identidad.",
      "priceCents": 11000,
      "unit": "proyecto",
      "days": 3,
      "revisions": 1,
      "bookingMode": "direct",
      "features": ["Coordinación"]
    },
    {
      "scope": "Identidad con aplicaciones básicas.",
      "priceCents": 22000,
      "unit": "proyecto",
      "days": 5,
      "revisions": 2,
      "bookingMode": "request",
      "features": []
    },
    {
      "scope": "Identidad con acompañamiento completo.",
      "priceCents": 33000,
      "unit": "proyecto",
      "days": 7,
      "revisions": 3,
      "bookingMode": "request",
      "features": []
    }
  ]
}
```

`POST /services` retorna 201. `PATCH /services/:id` permite cuerpo parcial, validado contra estado existente; `{ "status": "paused" }` pausa. IDs de paquete/nombres y propiedad se generan en servidor. `DELETE` solo sobre borrador elegible. Los tests verifican GET/POST/PATCH/DELETE y reapertura de persistencia.

## Extensiones acotadas

| Método y ruta                        | Cuerpo/resultado y permiso                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| GET `/health`                        | `{ok,backend,version}`, público                                                                                      |
| GET `/auth/me`                       | Usuario propio sin hash o null                                                                                       |
| POST `/auth/register`                | `{name,email,password}` → usuario + cookie, 201                                                                      |
| POST `/auth/login`                   | `{email,password}` → usuario + cookie; 15 intentos/minuto por IP+email                                               |
| POST `/auth/logout`                  | Vacío, elimina sesión y cookie, 204                                                                                  |
| GET / PUT `/account/profile`         | Propio; PUT campos de Profile + `complete`; valida capacidades                                                       |
| GET `/people/:id`                    | `{id,name,createdAt,profile}`; sin correo/hash                                                                       |
| GET `/metrics`                       | Mapa por servicio con promedios/conteos/nivel/tiempo real                                                            |
| POST `/conversations/open`           | `{providerId}` → conversación única de la pareja; no autochat                                                        |
| POST `/requests`                     | `{serviceId,packageId,text,fileIds?}` → solicitud, mensaje y notificación                                            |
| POST `/offers`                       | `{conversationId,serviceId,title,scope,totalCents,days,paymentMode,expiresAt}`; provider dueño de servicio publicado |
| POST `/offers/:id/action`            | `{action:"reject"}` cliente o `withdraw` provider, solo pendiente vigente                                            |
| POST `/checkout/quote`               | Directo u offerId → total, days, paymentMode, snapshot; no muta pedido/oferta                                        |
| POST `/checkout/confirm`             | Confirmación validada → pedido y entidades relacionadas; 201 nuevo, 200 reintento                                    |
| POST `/orders/:id/action`            | `{action,note?,confirmedAt?}`, permisos/estados abajo                                                                |
| POST `/favoriteLists/:id/items`      | `{serviceId,remove?}`; operación del servidor, no array viejo del cliente                                            |
| POST `/favoriteLists/:id/share`      | `{revoke?:true}`; genera o revoca token, solo dueño                                                                  |
| GET `/shared-lists/:token`           | Nombre, descripción, servicios publicados y unavailableCount; sin identidad ni datos privados                        |
| PUT `/conversations/:id/preferences` | `{folder?,starred?,unread?,labelIds?,savedMessageId?}` personal; savedMessageId alterna guardado                     |
| GET `/billing/export?from=&to=&q=`   | CSV de movimientos propios; BOM UTF-8, `;`, comillas dobles y prefijo anti fórmulas                                  |
| POST `/files`                        | multipart: `image`, `conversationId?`; sesión, PNG/JPEG/WebP, ≤5 MiB, un archivo                                     |
| GET `/files/:id/content`             | Imagen; pública o participante del chat, clave interna validada                                                      |

Fechas `from/to` son actualmente comparadas contra el día UTC almacenado; la columna visual y CSV se presentan en Lima. Corregir conjuntamente frontend/backend antes de prometer filtro por día local (pendiente identificado).

### Confirmación directa

```json
{
  "serviceId": "servicio-3",
  "packageId": "paquete-1",
  "quantity": 2,
  "extraIds": ["extra-1"],
  "paymentMode": "platform",
  "requirements": "Necesito una identidad visual para mi emprendimiento.",
  "paymentResult": "success",
  "expectedTotalCents": 24500,
  "idempotencyKey": "una-clave-aleatoria-por-intento-logico"
}
```

`/quote` usa los campos de selección; `/confirm` agrega requisitos, expectedTotalCents y clave. El backend calcula `11000 × 2 + 2500`. `paymentResult: "failure"` devuelve 402 sin pedido. Repetir misma clave de ese cliente devuelve el pedido ya creado. Cambiar selección requiere nuevo intento lógico/clave. Las ofertas usan `{offerId,...}` y total cerrado; nunca aceptan overrides de precio/pago. Presencial requiere `requestedAt` ISO futuro y `address`; la UI agrega offset `-05:00`.

### Acciones sobre pedido

| Acción          | Actor y estado                                                   |
| --------------- | ---------------------------------------------------------------- |
| start           | Provider: agreed → in_progress; guarda startedAt                 |
| deliver         | Provider: in_progress → delivered                                |
| complete        | Cliente: delivered → completed                                   |
| adjust          | Cliente: delivered → in_progress; note ≥5                        |
| cancel          | Participante: no finalizado/cancelado; note ≥5, conserva eventos |
| schedule        | Provider, presencial, agreed/in_progress; confirmedAt futuro     |
| payment_report  | Cliente, onsite, pending, no cancelado                           |
| payment_confirm | Provider, confirmation_pending, no cancelado; crea movimiento    |

No se admite PATCH de estado arbitrario. Repetición de transición final idéntica puede devolver el estado ya alcanzado sin otro evento. La idempotencia reforzada por clave corresponde a checkout; no se promete idempotencia general de todos los POST.

## Validaciones y errores

400 cuerpo inválido/tamaño/tipo; 401 sin sesión; 403 ajeno/capacidad; 404 inexistente o ruta bloqueada; 405 método no habilitado; 409 duplicidad, estado cambiado o importe distinto; 402 fallo de pago simulado; 429 intentos de login; 500 error interno de persistencia sin volcar stack al navegador.

Subidas validan firma y MIME, no decodificación exhaustiva. Las URLs blob solo sirven para vista previa, no se guardan. Un archivo abandonado puede quedar sin referencias; auditar con `npm run files:audit`. No hay endpoint de borrado masivo de archivos ni publicación estática de uploads privados.
