# ServiceHub · PC2

Marketplace académico de servicios digitales y presenciales en Perú. Primera implementación integrada con catálogo, publicación, conversaciones, ofertas, contratación, pedidos, reseñas, listas y movimientos. Interfaz en español, importes en céntimos de PEN y presentación de fechas en America/Lima.

## Ejecutar en Windows

Requisitos: Node **24.x** (verificado 24.15.0), npm 11.x (verificado 11.12.1). Abrir PowerShell en esta carpeta:

```powershell
npm ci
npm start
```

Abrir **http://127.0.0.1:4200**. Angular usa el proxy `/api` hacia JSON Server en `127.0.0.1:3000`. Usar siempre el mismo hostname para la cookie. Ctrl+C detiene ambos procesos. No hace falta un servidor SQL ni credenciales externas.

`db.json` en la raíz contiene la demostración y conserva cambios al reiniciar. No se resetea al arrancar. Las sesiones duran hasta 24 horas, pero se pierden al detener la API: volver a iniciar sesión. El frontend NO importa el JSON ni usa localStorage para simular persistencia.

| Comando                       | Uso                                                                        |
| ----------------------------- | -------------------------------------------------------------------------- |
| `npm start`                   | API y frontend juntos                                                      |
| `npm run api` / `npm run web` | Procesos separados, dos terminales                                         |
| `npm run build`               | Compilación de producción en `dist/service-hub/browser`                    |
| `npm test`                    | Unitarios y API, con datos temporales                                      |
| `npm run test:e2e`            | Edge instalado, puerto 4300; ejecutar build antes                          |
| `npm run verify`              | Build + unitarios + API                                                    |
| `npm run files:audit`         | Informar imágenes sin referencias o faltantes; no borra                    |
| `npm run format`              | Formatear fuentes y documentación, excluye `plan/`                         |
| `npm run seed:reset`          | **Reemplaza datos**, API detenida; conserva copia `db.json.<fecha>.backup` |

La API usa un bloqueo cooperativo `db.json.lock`. No iniciar otra CLI JSON Server ni editar a mano la base mientras está activa. Se recuperan bloqueos de procesos terminados. Ante bloqueo ilegible, comprobar procesos antes de intervenir. Para trasladar datos, copiar `db.json` **y** `server/uploads/` con la API detenida. Las imágenes y backups están ignorados por Git.

## Cuentas ficticias

Contraseña de todas: **`ServiceHub123!`**. No son personas ni correos reales.

| Cuenta                        | Uso                                                     |
| ----------------------------- | ------------------------------------------------------- |
| `cliente@servicehub.test`     | Ana Mendoza: cliente, listas y pedidos seed             |
| `profesional@servicehub.test` | Lucía Ramos: profesional de hogar; conversación con Ana |
| `pro2@servicehub.test`        | Diego: soporte técnico                                  |
| `pro3@servicehub.test`        | Valeria: diseño y multimedia                            |
| `pro4@servicehub.test`        | Mateo: desarrollo y tecnología                          |
| `pro5@servicehub.test`        | Camila: marketing y redacción                           |
| `pro6@servicehub.test`        | Andrés: clases y asesorías                              |

También se pueden registrar cuentas. Activar “Ofrecer servicios” exige completar titular, región, presentación de 30 caracteres, habilidades e idioma. Foto y trayectoria son opcionales; no hay carga de CV. Un profesional puede comprar a otro.

## Recorrido para la demostración

1. Home → Explorar todos → filtros y segunda página. Recargar mantiene los query params.
2. Ingresar como Lucía → menú de cuenta → Mis servicios → Crear. Probar validación; publicar, editar y pausar. La tabla usa Bootstrap y consume REST real.
3. Ana → `/servicios/servicio-3` → Básico → cantidad 2 + extra → **S/ 245.00**. Completar requisitos; probar fallo y luego aprobación del pago simulado. Revisar pedido y movimientos.
4. Abrir otro perfil de navegador para Lucía. En Mensajes, crear una oferta sobre `servicio-1`. Ana la revisa y confirma con fecha futura en Lima; no crea pedido por abrirla. Lucía inicia y entrega; Ana confirma o pide ajuste. El pago presencial se registra y confirma por separado.
5. Reseñar el pedido completado. También se admite reseña si se canceló después del inicio; no antes. Lucía responde desde el detalle del servicio.
6. Guardar servicio en listas; compartir y revocar. Abrir enlace en una ventana sin sesión conectada a **la misma instancia**. CSV desde Movimientos.

Las fechas de la semilla son históricas y una oferta vence el 31/12/2027. Elegir fechas futuras para nuevas atenciones. Los estados vencidos se calculan; no se falsifican relojes ni métricas.

## Stack y evidencia

Angular/CLI/builder/compiler **20.3.33**, TypeScript **5.9.3**, Bootstrap **5.3.8**, JSON Server **0.17.4** exactos en lockfile. Standalone, rutas lazy, formularios reactivos y servicios HttpClient/Observable. La API monta el router original JSON Server, con permisos y pequeñas acciones compuestas sobre su misma instancia de almacenamiento.

- [Matriz de los ocho criterios PC2](docs/pc2/matriz-cumplimiento.md).
- [Informe PDF](docs/pc2/informe.pdf), [fuente](docs/pc2/informe.md) y [capturas](docs/pc2/capturas/).
- [Pruebas y comandos reproducibles](docs/pruebas.md).
- [Estado, limitaciones y pendientes por módulo](docs/estado-actual.md).
- [Arquitectura](docs/arquitectura.md), [API](docs/api.md), [modelo de datos](docs/modelo-datos.md), [UI](docs/ui.md), [assets](docs/assets.md).

## Alcance de esta entrega

Aplicación local académica, pagos completamente simulados. JSON Server no aporta transacciones SQL, escalado ni garantías ante fallos físicos de disco. Las acciones compuestas tienen una escritura coordinada y checkout idempotente; las sesiones viven en memoria. No se procesan tarjetas ni documentos fiscales.

Hay trabajo de refinamiento: portadas seed ilustradas provisionales, trayectoria profesional en texto, formularios de edición todavía extensos, optimización del CSS Bootstrap, filtros de fecha por día UTC aunque las horas se presentan en Lima, y ampliación de revisión visual/accesibilidad. El build tiene una advertencia de presupuesto inicial (~601 kB frente a 500 kB), sin errores. El detalle está en Estado actual; la entrega no se presenta como plataforma de producción.

`plan/` conserva intactos los prompts y materiales originales. Se verificó acceso autenticado al plugin oficial de Figma y se consultaron solamente Home/Guidelines/componentes autorizados; la procedencia de medidas está en UI. No se realizaron commits, push ni cambios de rama.
