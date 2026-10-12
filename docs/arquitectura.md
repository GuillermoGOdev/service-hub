# Arquitectura

```text
Angular 20 standalone + Bootstrap 5.3
  Router → features lazy → servicios por dominio
  Reactive Forms / signals / HttpClient + Observable
                ↓ /api (proxy 4200 → 3000)
Node: server/index.cjs (una instancia con bloqueo de base)
  server/app.cjs
    sesiones + permisos + validación
    acciones compuestas y entrega protegida de imágenes
    router JSON Server 0.17.4 → router.db → db.json
                                 files → server/uploads
```

## Responsabilidades

- `src/app/layouts`: shell, header, navegación, estilos y diálogos de acceso/actividad.
- `features`: catálogo/home, autenticación, perfiles/onboarding, publicación, detalle, mensajes, listas y pedidos/movimientos. Componentes standalone, imports explícitos y rutas diferidas. Varias superficies relacionadas comparten archivo para esta primera entrega.
- `core/api.ts`: adaptador HTTP y servicios Auth, CatalogApi, MessagesApi, OrdersApi, ListsApi, NotificationsApi; Ui coordina acceso pendiente y toast. Devuelven Observables tipados; no importan db.json.
- `shared/ui.ts`, `service-card.ts`, `save-dialog.ts`: componentes reusables, pipes y directiva. Contratos de entidades en `shared/models.ts`; el backend JS valida en tiempo de ejecución, no ejecuta interfaces TypeScript.
- `server/app.cjs`: fábrica para la aplicación real y tests. El router oficial proporciona CRUD y consultas; las extensiones reutilizan **su** db. `seed.cjs` genera el dataset solo bajo comando manual.
- `server/config.cjs`: umbrales de nivel y etiquetas iniciales. No hay rol global que impida a un provider actuar como cliente.

Angular Router decide vistas/guards. JSON Server decide recursos REST y persistencia. El guard mejora navegación; el servidor siempre comprueba sesión/propiedad/estado.

## Persistencia y coordinación

El arranque adquiere `db.json.lock` de forma exclusiva. El reset respeta el mismo bloqueo y hace backup. Es un bloqueo cooperativo local, no impide que un editor u otro programa modifique el archivo por fuera. API escucha solo en loopback. No ejecutar la CLI `json-server db.json` en paralelo.

Los CRUD simples terminan en el router original. La política usa IDs permitidos antes de la paginación; nunca entrega una página privada para filtrarla en el navegador. Se bloquean `/db`, users, inclusiones relacionales y subrutas alternativas. Se desactiva la cascada implícita mediante `foreignKeySuffix: '__relation'`: con relaciones opcionales podía afectar el historial. Las dependencias se controlan explícitamente.

La función `change` toma copia de memoria, aplica cambios síncronos y llama una vez a `db.write()`. Si lanza error restaura memoria. En el único proceso no hay await dentro del cálculo/escritura. Checkout guarda pedido, oferta, pago, evento y notificaciones juntos, con clave idempotente por cliente y unicidad de offerId. **No es una transacción ACID**: un fallo físico puede comprometer el archivo y no hay recuperación por log. CRUD de mensajes y sus notificaciones usan dos escrituras (router + efecto), limitación documentada.

Imágenes: Multer en memoria, una por POST, 5 MiB. Firma y MIME PNG/JPEG/WebP; se rechazan SVG de usuario. Clave aleatoria local y metadatos, IDs en las entidades. Un fallo de escritura de metadatos elimina el archivo recién creado. `/files/:id/content` autoriza imágenes privadas; nunca hay static general de uploads. `files:audit` informa huérfanos o faltantes sin borrar.

## Estado y comunicación

Cookie HttpOnly SameSite=Strict, sesión aleatoria de 24h en memoria; scrypt para contraseñas. Tras reiniciar se vuelve a autenticar. No se devuelve hash y no se almacenan tarjetas. Misma procedencia con proxy. Origin de escritura limitado a loopback; no es defensa completa para un despliegue público.

Signals guardan UI. Formularios reactivos validan antes de enviar; el backend repite validaciones de negocio. Consultas de ruta y polling usan `switchMap`/`takeUntilDestroyed`. HTTP de una respuesta completa su Observable; subscripciones de peticiones puntuales son finitas. Chat cada 4 segundos, notificaciones cada 15. No hay WebSocket. Otras vistas se refrescan al entrar/recargar; no se promete actualización instantánea global.

Catálogo carga servicios publicados por HTTP, normaliza tildes y filtra/ordena **todo** el dataset antes de paginar localmente. El servidor también soporta `_page/_limit` auténticos y sus headers, probado por API. Recomendación local por categoría/tipo/tags; no IA. El volumen previsto son decenas de registros.

## Límites técnicos

Archivo JSON único, algoritmos lineales para métricas/consultas, sesiones no compartidas, sin concurrencia multiproceso ni cuotas/limpieza automática de sesiones y archivos. Upload valida firmas, no decodifica ni reencoda la imagen completa. Son límites de una demo local, con tareas priorizadas en Estado actual.
