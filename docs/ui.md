# UI y procedencia visual

Figma autenticado mediante plugin oficial; acceso a archivo `kazPbcBIrkk4t6NAJs7Isd` comprobado. Consultas acotadas a [Home 12:203](https://www.figma.com/design/kazPbcBIrkk4t6NAJs7Isd/Service-Hub?node-id=12-203), [Botones 14:3](https://www.figma.com/design/kazPbcBIrkk4t6NAJs7Isd/Service-Hub?node-id=14-3) y [Componentes 58:544](https://www.figma.com/design/kazPbcBIrkk4t6NAJs7Isd/Service-Hub?node-id=58-544). No se exploró Old UI ni la página Fiverr del archivo. Contexto y screenshot de Home; nodos hijos para valores legibles.

| Propiedad obtenida | Valor de referencia                        | Nodo        |
| ------------------ | ------------------------------------------ | ----------- |
| Primario           | `#4459ff`                                  | Botón 16:58 |
| Botón              | padding 12/24, radio 8, Inter 16 medium    | 16:58       |
| Hero               | padding 48, radio 24, alto 487             | 16:72       |
| Hero fondo         | gradiente `#e5e8ff` → `#fff9cc`            | 16:72       |
| Hero título        | 64 px, peso 500, tracking -2.56            | 16:72       |
| Hero descripción   | 20 px / 32, máximo 540                     | 16:72       |
| Collage            | proporción 1000 × 562, situado a derecha   | 16:72       |
| Contenido desktop  | ancho 1280 con margen 80 en 1440           | Home        |
| Categoría          | 200 × 333; ilustración 184 × 184, radio 14 | 83:697      |
| Card servicio      | portada 4:3, radio 7, gap 8, avatar 48     | 58:575      |
| Texto card         | 14 / 20                                    | 58:575      |
| Badge Top          | fondo `#fffc99`, texto `#796b06`           | 58:575      |

## Traducción

`layouts/theme.css` define Inter local y tokens `--sh-primary`, ink `#161619`, muted `#676771`, border `#e2e2e8`, soft `#f5f5f8`, radio base 8 y unidad de espaciado 8. Los neutrales, h1 interior 40, h2 26, breakpoints y paneles privados son decisiones de implementación, no valores atribuidos a Figma. `refinements.css` contiene ajustes posteriores a capturas (icono de búsqueda y orden móvil de paquetes).

Flex/grid, anchos máximos y flujo normal reemplazan coordenadas absolutas. Las categorías preservan colores/ilustraciones del sistema con los seis nombres finales. Cards sin borde/caja decorativa; el foco/hover cambia un resaltado discreto y mantiene enlaces/botón de guardado separados. Miniaturas ilustradas son provisionales, no portafolios reales.

Bootstrap se importa por npm; se usan `btn btn-primary`, `btn-danger`, inputs/selects/checkbox, grid/utilidades, `alert`, `table table-striped table-hover` y `table-responsive`. Angular controla estados; no hay Bootstrap JS ni jQuery. El color azul y radios se adaptan con CSS. Bootstrap completo produce la advertencia inicial documentada; futura compilación Sass selectiva puede reducirlo.

## Componentes y estados

`shared/ui.ts`: Icon, Avatar con inicial, Feedback con `*ngIf` y role=status, Dialog nativo, pipe `precioSoles`, fechas Lima y statusLabel, directiva appServiceHighlight. `service-card.ts` y `save-dialog.ts` reutilizan presentación/acciones. Breadcrumbs, tabs, filtros, paginación, chips, formularios, tablas, carga y vacíos comparten CSS. No se instalaron familias nuevas de iconos.

Dialog usa `showModal`, foco modal nativo, Escape/cancel, cierre por fondo y devolución al invocador. Drawer lateral comparte contrato. Menú/campana usan un dialog compacto colocado como popover: mantiene semántica modal de accesibilidad; no es el componente JS de Bootstrap. Resumen de chat es tercera columna en escritorio y drawer con el mismo foco/Escape en móvil.

Los formularios indican errores por texto y estilo, botones deshabilitados durante operaciones, alertas de éxito/error y toast live. No se agrega selector de emoji. Mensajes se muestran como filas con identidad y fecha, no burbujas. La disponibilidad no se disfraza de presencia online.

## Verificación visual

Capturas reales Edge en `docs/pc2/capturas`. Home/catálogo/detalle desktop y Home/detalle 390/768; chat desktop/390; formulario inválido, paquetes, tabla CRUD, listas, checkout, pedido, movimientos y onboarding. Verificada ausencia de overflow horizontal en Home/detalle y chat móvil. Se inspeccionaron capturas principales y se corrigieron un icono de búsqueda con relleno ilegible y la posición móvil del bloque de paquetes.

La referencia `plan/home.png` y regiones legibles de los PNG de Fiverr guiaron composición y comportamiento; no se afirma una revisión de cada píxel de esos PNG extensos. La versión replica la dirección visual y no es un calco certificado. Falta ampliar QA a 360 px, más dispositivos, todos los overlays y auditoría de contraste/lector de pantalla. Las tablas permiten scroll horizontal controlado.

Los formularios largos tienen acciones inferiores fijas y espacio final para desplazamiento. Algunas capturas full-page muestran esa barra en su posición del viewport, superpuesta al tramo intermedio; no representa un campo eliminado. Pendiente mejorar la experiencia móvil de campos largos y dividir la edición del perfil por secciones.
