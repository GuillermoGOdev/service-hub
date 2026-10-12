# Trabajo del equipo

La primera entrega deja un recorrido integrado. Dividir revisiones por módulo; no crear cinco versiones incompatibles del backend o de los componentes compartidos.

| Integrante / módulo      | Responsabilidad                               | Primera mejora propuesta                                                         |
| ------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 · Sistema visual       | layouts, Home, listas, UI compartida          | Contraste/foco y ajuste fino 360–390/768/1440; portadas con imágenes propias     |
| 2 · Exploración          | catálogo, detalle, perfil público, reseñas    | Perfil con resumen agregado; filtros y navegación extrema por URL                |
| 3 · Cuenta/publicación   | auth, onboarding, mi perfil, editor           | Secciones de trayectoria estructuradas; mejorar barra inferior y campos extensos |
| 4 · Conversaciones       | chat, etiquetas, ofertas, notificaciones      | Ampliar E2E de adjuntos, filtros combinados y lectura entre sesiones             |
| 5 · Persistencia/pedidos | JSON Server, archivos, checkout, pedidos, CSV | Fechas de filtros Lima, refinamiento de fallos parciales y contratos DTO         |

## Integración

1. Revisar estado y acordar cambios de `shared/models.ts`, `core/api.ts`, `shared/ui.ts` o `server/app.cjs` con quien esté trabajando en otro módulo.
2. Con autorización del equipo, crear ramas `codex/<funcionalidad>` o la convención acordada. PR pequeños, una conducta observable por PR. No incluir node_modules, uploads privados, backups o reportes temporales.
3. Documentar problema, comportamiento resultante, capturas relevantes y pruebas ejecutadas. No reportar pruebas no corridas.
4. `npm run format`, `npm run build`, `npm test`. Para flujos afectados, `npm run test:e2e`. Inspeccionar teclado, móvil y estados vacío/error/carga. No elevar presupuestos solo para ocultar advertencias.
5. Mantener el recorrido cliente → profesional → entrega operativo en cada integración diaria. Revisar docs/api y modelo antes de fusionar cambios compartidos.

Los tests aíslan su base. No utilizar `seed:reset` para “arreglar” un test ni sobrescribir el estado de la demo. Para conservar evidencias, copiar capturas de los tests finales junto a su fecha/resultado. Las imágenes subidas por usuarios son datos locales; para compartir una demostración con uploads se entrega una copia coordinada de base y directorio, fuera del repositorio público.
