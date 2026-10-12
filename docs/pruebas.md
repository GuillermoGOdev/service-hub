# Pruebas y evidencia

Fecha: 2026-10-12, Windows, Node 24.15.0 / npm 11.12.1. Instalación limpia final desde lockfile: 591 paquetes añadidos, 592 auditados, 0 alertas conocidas; no se afirma ausencia de vulnerabilidades desconocidas. Angular packages/CLI/build/compiler 20.3.33, TypeScript 5.9.3, Bootstrap 5.3.8, JSON Server 0.17.4, Multer 2.4.0, Vitest 4.1.11, Playwright 1.56.1.

```powershell
npm ci
npm run build
npm test
npm run test:e2e
npm run files:audit
```

Build aprobado: **600.83 kB inicial**, transferencia estimada 117.88 kB. Una advertencia por límite de 500 kB (exceso 100.83); sin error de compilación. Presupuesto de error 1 MB sin modificar para ocultar resultados. Existen avisos de deprecación de dependencias heredadas connect-pause/whatwg-encoding; no bloquearon instalación.

## Unitarios · 5/5

`src/app/app.spec.ts`, runner externo `vitest.config.ts`, entorno jsdom y TestBed de Angular: precio céntimos → soles, cero/importes grandes, directiva con foco/hover y controles independientes, visibilidad NgIf, búsqueda normalizada. Angular compiler/TestBed se inicializan explícitamente; no se usa el builder de tests generado por Angular 22.

## API · 14/14

`server/test/api.test.cjs`, node:test, servidor en puerto efímero y carpeta temporal con semilla:

1. Router real, segunda página de 8 sobre 18, X-Total-Count/Link y bloqueo de rutas alternativas.
2. Registro/hash y progreso profesional; bloqueo de capacidades por PATCH o POST indebido.
3. GET/POST/PATCH/DELETE de servicios, propiedad y lectura de disco reabierto.
4. Total 24500, fallo de pago sin pedido, reintento, snapshot y provider comprando a otro; auto compra rechazada.
5. Solicitud/conversación/oferta, doble confirmación paralela con máximo un pedido, sin pago duplicado.
6. Inicio/entrega/ajuste/completado, pago presencial independiente y reseña/respuesta autorizada.
7. Cancelación, actor/historial, reseña solo después de inicio.
8. Varias listas sin duplicados, conteo por persona, compartir/revocar y propiedad.
9. Mensajes, organización/etiquetas/guardados personales y eliminación de bandeja sin borrar al otro.
10. PNG válido, límite de seis referencias, privacidad y rechazo de SVG.
11. CSV BOM, filtrado, comillas escapadas y neutralización de fórmula.
12. Fallo de db.write inducido: memoria compuesta restaurada, sin oferta residual.
13. Bloqueo de dos escritores y posterior liberación.
14. Cierre/recreación real de API: pedidos/mensajes/imágenes persisten y cookie anterior deja de autorizar.

Los tests no son una prueba exhaustiva de seguridad ni de fallos físicos de disco. Las bases mutadas no son db raíz. La limpieza valida que su ruta está dentro de tmp y tiene el prefijo de prueba antes de borrar.

## Navegador · 6/6

`tests/e2e/flows.spec.ts`, Edge instalado (`channel: msedge`), un worker y build servido en 4300. `scripts/e2e-server.cjs` crea su propia base temporal y usa la misma API. No reutiliza un servidor previamente arrancado. Capturas y asserts corresponden a UI real, no mockups.

- Home/catálogo/URL, recarga profunda, normalización, precio y responsive 390/768; sin pageerrors en ese recorrido.
- Modal protegido, Escape/foco devuelto, login conserva guardado y creación de lista. Revocación está probada en API; no se infiere por el título del test UI.
- Formulario inválido visible, publicación/pause y recarga que conserva el estado.
- Cantidad 2 + extra en servicio-3 = S/ 245.00; fallo/aprobación; snapshot y movimiento.
- Dos contextos de browser: mensaje por polling, oferta, contratación presencial, inicio, entrega, confirmación, reseña. Chat 390 y resumen drawer/Escape.
- Registro desde paquete, bienvenida y retorno; alta de provider, guardar progreso, guard rechazado antes de completar, habilitación persistente después.

El reporte HTML queda en `playwright-report/` (ignorado); abrir con `npx playwright show-report`. Fallos conservan trace/screenshot en `test-results/`. La carpeta de evidencia versionable es `docs/pc2/capturas/`, 18 PNG de la última ejecución.

Última ejecución E2E tras corregir dependencias: **6 aprobados en 49.3 s**. Arranque normal adicional con `npm start`: health y ruta profunda por proxy devolvieron 200 y el catálogo raíz devolvió 18 servicios. Auditoría de archivos inicial: sin faltantes/huérfanos. PDF: seis páginas renderizadas con Poppler y revisadas, sin cortes ni superposiciones del informe; enlaces locales de documentación verificados.

## Inspección visual y límites

Revisadas capturas de Home desktop, chat desktop/móvil, tabla, formulario y disposición móvil de detalle. Home y componentes se contrastaron con nodos específicos de Figma y home.png. El detalle full-page móvil se inspecciona por regiones legibles; no basta la miniatura reducida de toda la página. Los ajustes aplicados están en refinements.css.

No se ejecutó auditoría de lectores de pantalla, prueba de estrés, matriz de navegadores ni cobertura de cada detalle opcional. La fuente del PDF está en informe.md; generador en `scripts/generate-report.py` (Python + ReportLab/Pillow). Para regenerar: producir capturas con E2E, ejecutar el script y revisar el PDF renderizado. No requiere Python para ejecutar la app.
