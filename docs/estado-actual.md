# Estado actual · 12 de octubre de 2026

Primera implementación integrada sobre la base Angular existente. La entrega contiene código, persistencia, datos de demostración, pruebas, capturas y documentación PC2. No es una declaración de cobertura completa de cada interacción de los prompts.

## Fuentes y repositorio

- Se leyeron completos el prompt final y el original Windows-1252, respetando precedencia. `plan/` permaneció intacto, sin rastrear al inicio. Se copiaron los assets necesarios, no se publicaron las referencias.
- Git inicial: rama `main`, commit `a2e0448`, solo `plan/` como material ajeno sin seguimiento. Se mantiene la rama; no se hizo commit, push ni reset destructivo. Los cambios de implementación quedan disponibles para revisar.
- Plugin oficial Figma autenticado y archivo accesible. Home 12:203, Botones 14:3, Componentes 58:544 y nodos relevantes 16:72, 16:58, 83:697, 58:575. No Old UI ni captura Fiverr mediante MCP. Valores/procedencia en UI.

## Implementado y operativo

- Angular/CLI/build/compiler 20.3.33, TS 5.9.3, Bootstrap 5.3.8, JSON Server 0.17.4. Rutas standalone/lazy y servicios HttpClient/Observable; pipe de céntimos PEN, directiva hover/foco y alerta explícita NgIf.
- Home, catálogo con normalización/filtros/orden/páginas/URL, detalle con paquetes/extras/galería/reseñas, perfil público y relacionados. 18 servicios ficticios, seis categorías, siete cuentas, seis perfiles profesionales; estados y métricas derivados.
- Registro/login reales por cookie y hash, capacidades validadas backend, progreso reanudable de perfil y edición en drawer. Una nueva cuenta puede terminar onboarding y continuar al paquete que inició; login conserva favoritos/contacto.
- Crear/editar/publicar/pausar/eliminar borradores de servicios. Tabla, formulario reactivo en cuatro secciones, imágenes persistentes y requisitos por modalidad.
- Conversación única por pareja, polling de dos sesiones, texto/imagen/cita/guardados, bandejas personales, destacados, no leídas y etiquetas con CRUD. Solicitud y oferta estructuradas; retiro/rechazo/vencimiento. Resumen en columna/drawer móvil.
- Checkout con total del servidor, cantidades/extras, pago simulado exitoso/fallido, idempotencia, un pedido por oferta y snapshot. Seguimiento, ajuste, cancelación con motivo, fecha presencial y pago separado del trabajo.
- Reseña de completado/cancelado tras inicio; bloqueo antes de inicio y duplicados; respuesta del profesional. Listas múltiples, guardados de personas únicas, compartir/revocar. Notificaciones por eventos y CSV con escape anti fórmulas.
- Permisos sobre colecciones y acciones, cierre de rutas alternativas, archivos privados con control de participación. Bloqueo cooperativo del db, reset manual con backup y auditoría de huérfanos de solo lectura.

## Verificación realizada

| Comprobación          | Resultado                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm ci` final        | Correcto: 591 paquetes añadidos; auditoría 592, 0 vulnerabilidades conocidas reportadas                                 |
| `npm ls … --depth=0`  | Angular alineado 20.3.33; sin error de peers; versiones exactas en lockfile                                             |
| `npm run build`       | Correcto. Bundle inicial 600.83 kB, transferencia estimada 117.88 kB; advertencia de 100.83 kB sobre presupuesto 500 kB |
| `npm run test:unit`   | 5/5, Vitest 4.1.11, TestBed real                                                                                        |
| `npm run test:api`    | 14/14: CRUD, persistencia, ACL, cálculo, estados, archivos, CSV, fallos y reinicio                                      |
| `npm run test:e2e`    | 6/6, Edge, bases temporales; incluye dos contextos independientes y registro/onboarding                                 |
| Responsive            | Home/detalle 390 y 768, escritorio 1440; chat 390; assertions de overflow y capturas                                    |
| Foco                  | Escape/cierre y retorno al control de acceso; drawer de resumen móvil verificado                                        |
| Evidencia             | 18 PNG en `docs/pc2/capturas`; informe Markdown/PDF y matriz                                                            |
| Arranque normal       | `npm start` correcto: proxy `/api/health` 200, ruta profunda 200 y 18 servicios en db raíz                              |
| PDF y enlaces         | 6 páginas renderizadas con Poppler e inspeccionadas; enlaces locales de documentación sin roturas                       |
| Auditoría de archivos | Base inicial sin imágenes faltantes, claves huérfanas ni metadatos sin referencia                                       |

Los primeros intentos restringidos del entorno no podían escribir dist ni conectar localhost; se repitieron con autorización de ejecución y los resultados de la tabla corresponden a ejecuciones reales correctas. La auditoría inicial detectó dependencias vulnerables; se corrigieron versiones/overrides y se repitieron instalación, build y pruebas. No se usó `audit fix --force`.

## Parcial y pendiente, por prioridad

| Prioridad / módulo | Pendiente concreto                                                                               | Límite actual                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| P1 · 5             | Convertir filtros de fechas de pedidos/movimientos y exportación al día de America/Lima          | Comparan el día UTC de createdAt; horas visibles sí usan Lima                                                                   |
| P1 · 1/3           | Completar revisión visual de overlays/formularios a 360 px, teclado y lector de pantalla         | Hay inspección y tests acotados, no auditoría WCAG completa                                                                     |
| P1 · 5             | Fortalecer fallo parcial de CRUD de mensajes/etiquetas y sus efectos                             | Router escribe primero; notificación/limpieza usa segunda escritura. Checkout compuesto sí tiene una única escritura lógica     |
| P2 · 3             | Repartir perfil en drawers por sección y trayectoria laboral/educación en entradas estructuradas | Un formulario reusable; trayectoria y disponibilidad son textos opcionales; onboarding profesional de una sola pantalla         |
| P2 · 1             | Reemplazar portadas seed y revisar permisos de distribución de assets del usuario                | Ilustraciones provisionales; existe uploader y fallback intencional                                                             |
| P2 · 2             | Resumen agregado de reputación en perfil público y refinamiento de búsqueda/filtros              | Valoraciones/distribución están en cards y detalle, no en cabecera pública; página fuera de rango se recorta sin normalizar URL |
| P2 · 4             | Ampliar pruebas de adjuntos desde UI, combinaciones de etiquetas y notificaciones                | Adjuntos/privacidad/reinicio verificados por API; UI tiene flujo, no todos sus casos E2E                                        |
| P2 · 5             | Decodificar/reencodar imágenes y política de retención/cuotas                                    | Firma/MIME/límites; no antivirus, no decodificación completa; audit informa huérfanos sin borrar                                |
| P2 · 1/5           | Reducir CSS Bootstrap e imports de entrada                                                       | Warning inicial 600.83 kB; presupuesto no se ocultó                                                                             |
| P2 · 3             | Conservar intención de acción si se recarga toda la pestaña durante alta                         | Se conserva durante navegación de la misma sesión de UI; una recarga pierde el callback, progreso del perfil sí persiste        |
| P2 · 5             | Separar `server/app.cjs` y DTOs de acciones en módulos menores                                   | Código formateado por funciones/dominios; archivo de backend amplio y algunos cuerpos HTTP usan unknown                         |

No se incluyen administrador/moderación, OAuth, pagos reales, video/audio ni despliegue público. JSON Server es local de un proceso, sin transacciones ACID, recuperación de disco ni escalado. Las sesiones terminan al reiniciar API. Un resultado de auditoría sin alertas no convierte la aplicación en producción.

## Continuar sin perder contexto

Leer README → modelo/API → este estado → módulo asignado en CONTRIBUTING. Ejecutar `npm start`, no resetear datos. Los tests usan bases temporales. Antes de compartir datos con uploads, respaldar juntos db y carpeta con API detenida. Las evidencias muestran la instancia temporal de prueba, por lo que los servicios creados en esas capturas no aparecen en el db raíz limpio.
