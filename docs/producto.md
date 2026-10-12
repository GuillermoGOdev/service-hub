# Producto y reglas implementadas

ServiceHub conecta a personas que necesitan ayuda con profesionales que ofrecen servicios digitales y presenciales en Perú. “Profesional” es una capacidad de la cuenta; no exige título académico ni impide comprar.

## Fuentes

Precedencia aplicada: PC2 oficial → prompt final → prompt original completo → Figma para identidad y PNG Fiverr para comportamiento. Los originales no se editan. No se implementan las antiguas decisiones Express independiente, Angular 22, ausencia de Bootstrap ni CV obligatorio.

## Superficies

| Ruta/superficie                                               | Comportamiento                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/`                                                           | Hero/collage, seis categorías, destacados de datos reales                |
| `/servicios`                                                  | Búsqueda normalizada, filtros, orden y páginas de 8; query params        |
| `/servicios/:id`                                              | Galería, información, paquetes, extras, solicitud, reseñas, relacionadas |
| `/profesionales/:id`                                          | Datos públicos del profesional y servicios publicados                    |
| Modal o `/acceso`                                             | Login/registro; continuar intención protegida                            |
| `/bienvenida`                                                 | Elegir contratar/ofrecer; progreso profesional persistente               |
| `/mi-perfil`                                                  | Ver perfil y editar en drawer                                            |
| `/mis-servicios`, `/servicios/nuevo`, `/servicios/:id/editar` | Tabla, CRUD y formulario por secciones                                   |
| `/mensajes/:id?`                                              | Conversación por pareja, polling, ofertas, organización personal         |
| `/listas/:id?`                                                | Listas propias, CRUD y servicios guardados                               |
| `/listas/compartida/:token`                                   | Vista pública de solo lectura, revocable                                 |
| Drawer del paquete → `/checkout`                              | Cantidad, extras, requisitos y pago simulado                             |
| `/pedidos/:id?`                                               | Contrataciones/trabajos, estados, eventos y reseña                       |
| `/movimientos`                                                | Pagos/cobros, filtros y CSV                                              |
| Campana/menú de cuenta                                        | Paneles compactos con foco, enlaces reales y Escape                      |
| Cualquier ruta inexistente                                    | 404 de Angular                                                           |

## Clasificación

Categorías fijas: Hogar y mantenimiento; Soporte técnico; Diseño y multimedia; Desarrollo y tecnología; Marketing y redacción; Clases y asesorías. La semilla incluye un tipo por categoría y tres servicios por categoría. Tags son textos embebidos; no hay catálogo separado de etiquetas de servicio.

## Reglas de negocio

- Registro inicia sesión; providerEnabled solo se habilita con perfil completo desde `/account/profile`. Nombre, titular (5), región, presentación (30), habilidad e idioma son obligatorios. Foto, zonas y trayectoria son opcionales. Progreso parcial conserva la cuenta cliente.
- Servicio pertenece a un provider. Tres paquetes configurables; Básico directo y otros por solicitud en la semilla. Precio y plazo positivos, unidades proyecto/hora/visita. Extras se cobran una vez por pedido, no por unidad; sus días se suman. Horas/unidades entre 1 y 100.
- Publicar exige descripción (30), alcance de cada paquete (10), requisitos (5) y, si presencial, región/zonas. Borrador también necesita identidad del servicio y paquetes válidos. Se pausa sin destruir acuerdos. Se elimina solo borrador sin pedidos/ofertas.
- Una pareja comparte una conversación aunque cambie el contexto de contratación. Autor y participantes se derivan en backend. Archivar, eliminar, marcar, guardar y etiquetar son preferencias individuales. Nuevo mensaje recupera una conversación eliminada para ese usuario.
- La solicitud registra contexto y mensaje; no es pedido. La oferta tiene alcance, precio cerrado, plazo, vencimiento y pago. Abrir checkout no acepta. Rechazar/retirar/vencer impide confirmar.
- Total directo = precioPaquete × cantidad + sumaExtras. Backend recalcula, verifica precio esperado y crea snapshot. Solo confirmación exitosa crea pedido; reintento de la misma clave/oferta retorna el existente. No hay autocontratación.
- Pedido: acordado → en curso (provider) → entregado (provider) → completado (cliente). Cliente puede pedir ajuste y vuelve a en curso. Cancelación requiere motivo y conserva eventos. No se cancela uno ya completado.
- Pago en plataforma es simulado (éxito/fallo); al cancelar uno pagado cambia a reembolsado. Presencial: pendiente → reportado por cliente → confirmado por provider. Estado del pago y del trabajo son independientes. No hay pasarela, facturas ni impuestos inventados.
- Fecha solicitada y confirmada se mantienen separadas; futuras y solo en presencial. El plazo de entrega es la suma de días desde contratación; no hay calendario de días hábiles.
- Una reseña por pedido: completado o cancelado tras inicio. Solo el cliente del acuerdo; respuesta del provider. Marcador de cancelado, distribución y promedio derivados.
- Guardados públicos cuentan personas distintas; varias listas propias no duplican el conteo. Tokens de compartir son aleatorios y revocables.
- Nivel se calcula por pedidos completados y valoración del provider; umbrales en `server/config.cjs`. Tiempo medio usa pares mensaje de cliente → siguiente respuesta del provider, ignora eventos, sin fingir presencia online.

Fuera de esta versión: administración, moderación avanzada, pagos reales, videollamada, audio/video, OAuth y recomendación sofisticada. Las diferencias pendientes con el brief están explicitadas en [Estado](estado-actual.md).
