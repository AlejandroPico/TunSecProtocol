# TunSec Protocol

Asistente de consulta rápida para los Planes de Autoprotección (PAU) de los túneles viarios de Barcelona. La primera entrega digitaliza el catálogo del PAU de Glòries y ofrece recorridos operativos trazables para 200-TRA, 240-TRA, 250-TRA y 400-FOC.

> **Estado:** prototipo técnico pendiente de validación y homologación por responsables operativos. No sustituye el PAU vigente, las órdenes del Cap d'Emergència ni las de los servicios de emergencia.

## Principios de seguridad

- La selección del túnel es siempre el primer paso.
- Cada acción muestra documento, versión y páginas de procedencia.
- Los protocolos no transcritos se muestran como catálogo, sin completar instrucciones por inferencia.
- La base SQLite se distribuye en modo de solo lectura dentro de GitHub Pages.
- La sesión genera una bitácora local exportable; no envía datos a servidores.
- Las acciones críticas requieren confirmación explícita del operador.

## Tecnología

- Node.js 24 y npm 11.
- TypeScript 7 y Vite 8.
- SQLite compilado a WebAssembly mediante `sql.js`.
- GitHub Actions y GitHub Pages.

## Desarrollo

```bash
npm install
npm run dev
```

La preparación de recursos genera `public/data/tunsec-protocol.sqlite` desde `database/schema.sql` y `database/seed.sql`, y copia el motor WASM de SQLite. Los ficheros generados no se versionan.

## Validación

```bash
npm run check
npm run build
```

## Fuente inicial

`PAU GLORIES.pdf`, edición septiembre de 2025, 361 páginas. SHA-256:

`4f5089d521e9536c4183b81623e5a383b94f0e8b2e4570237ea9575987c2c12c`

La numeración física del PDF y la impresa en el documento se guardan por separado para evitar ambigüedades.
