# Guía para continuar ServiceHub

- Leer `docs/estado-actual.md` y la documentación del módulo antes de modificarlo. La precedencia del encargo está en `plan/prompt-final-codex-servicehub-pc2.md`; el original `plan/prompt-service-hub.txt` es Windows-1252.
- Angular/CLI 20.3.33, TS 5.9.3, Bootstrap 5.3.8, JSON Server 0.17.4. Mantener versiones y lockfile alineados. No migrar a latest, Tailwind ni Material.
- Usar standalone, Reactive Forms y servicios HttpClient/Observable. Signals para UI. Contratos en `shared/models.ts`; llamadas por dominio en `src/app/core/api.ts`.
- Persistencia exclusiva del router en `db.json`; extensiones en `server/app.cjs` usan el mismo `router.db`. No abrir otro escritor ni añadir base paralela/localStorage. Revisar permisos backend, no solo guards.
- Importes enteros en céntimos. Formatear con `precioSoles`. Identidad del usuario desde cookie de sesión, nunca desde cuerpo POST.
- `npm ci`, `npm start`, `npm run build`, `npm test`. Para cambios de recorridos: build y `npm run test:e2e` (Edge). Tests mutantes usan bases temporales, nunca la raíz. Consultar `docs/pruebas.md`.
- Conservar `plan/` y cambios ajenos. Assets ejecutables en `public/assets/`; iconos/ilustraciones del usuario. No publicar planificación como assets. No resetear datos sin encargo explícito; el comando manual crea backup.
- Mantener actualizados API, modelo, estado y matriz PC2 al cambiar contratos o comportamiento. Registrar lo parcial y distinguir prueba automatizada de inspección visual.
- No hacer commit, push ni cambiar rama sin autorización del usuario. Coordinar cambios compartidos mediante `CONTRIBUTING.md`.
