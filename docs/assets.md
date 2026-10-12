# Assets y licencias

Los originales están en `plan/` y se conservan. Solo `public/` es publicado por Angular. La API no expone la planificación ni capturas de referencias.

| Origen                                                                        | Archivo utilizado                               | Uso / procedencia                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `plan/Service Hub.svg`                                                        | `public/assets/logo.svg`                        | Logo original; header/footer, sin recrearlo como texto                    |
| `plan/Service Hub.ico`                                                        | `public/favicon.ico`                            | Favicon original                                                          |
| `plan/Collagepastelderetratossonrientes-ezgif.com-png-to-webp-converter.webp` | `public/assets/hero.webp`                       | Collage editado por el usuario, Home                                      |
| `plan/icons/*.svg`                                                            | `public/assets/icons/*.svg`                     | Búsqueda, corazón, estrella, moneda, flechas y correo; nombres originales |
| `plan/ilustrations/*.svg`                                                     | `public/assets/ilustrations/*.svg`              | Las seis ilustraciones, categorías/auth/onboarding y portadas seed        |
| [Inter oficial](https://rsms.me/inter/)                                       | `public/assets/fonts/InterVariable.woff2`       | Descarga oficial WOFF2; local, sin CDN en ejecución                       |
| [Licencia Inter](https://github.com/rsms/inter/blob/master/LICENSE.txt)       | `public/assets/fonts/OFL.txt`                   | SIL Open Font License, distribuida con la fuente                          |
| Geometría simple propia                                                       | SVG inline campana, caracteres de cierre/marcas | Sin paquete de iconos adicional; botones con nombre accesible             |

Archivo de la fuente obtenido de `https://rsms.me/inter/font-files/InterVariable.woff2`. Los assets del usuario no traen un inventario verificable de licencias individuales; conservar su procedencia y confirmar derechos de redistribución antes de una publicación externa. Los nombres Akar/Bi/Jam de los archivos no sustituyen esa verificación.

## Reemplazos previstos

Las miniaturas seed reutilizan ilustraciones como placeholders con proporción 4:3. No representan trabajos reales. Se sustituyen desde **Mis servicios → Editar → Galería**, subiendo PNG/JPEG/WebP y eligiendo portada. Persisten IDs en `services.imageIds`; render en ServiceCard y ServiceDetail. El fallback se define en `services.cover` y `server/seed.cjs`.

Foto profesional opcional: Mi perfil → Editar; files/avatarId. La inicial es una alternativa terminada y accesible, no una imagen rota. No falta un asset imprescindible para arrancar.

`server/uploads/` conserva imágenes con UUID y extensión validada. Metadatos en files; una subida por POST, hasta 5 MiB. Los adjuntos de chat exigen cookie y participación para leer. Los SVG confiables del diseño son assets estáticos; se rechazan SVG subidos por usuarios.

`npm run files:audit` lista archivos sin referencia, faltantes y claves sin metadatos. No elimina imágenes de formularios aún abiertos ni asume que una imagen reciente es basura. La depuración automática/retención está pendiente. Mantener juntos base y uploads al respaldar datos.
