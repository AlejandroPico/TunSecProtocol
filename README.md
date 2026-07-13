# TunSec Protocol

Asistente de consulta rápida para los Planes de Autoprotección (PAU) de los túneles viarios de Barcelona. La aplicación contiene 156 protocolos catalogados y nueve recorridos operativos trazables: Glòries, B-20, B-10, Camèlies y Lesseps.

> **Estado:** prototipo técnico pendiente de validación y homologación por responsables operativos. No sustituye el PAU vigente, las órdenes del Cap d'Emergència ni las de los servicios de emergencia.

## Principios de seguridad

- La selección del túnel es siempre el primer paso.
- Cada acción muestra documento, versión y páginas de procedencia.
- Los protocolos no transcritos se muestran como catálogo, sin completar instrucciones por inferencia.
- La base SQLite se distribuye en modo de solo lectura dentro de GitHub Pages.
- Varias incidencias pueden permanecer abiertas y recuperarse desde la barra superior.
- Cada sesión genera una bitácora local exportable; no envía datos a servidores.
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

La preparación de recursos genera `public/data/tunsec-protocol.sqlite` desde los SQL de `database/` y copia el motor WASM de SQLite. Los ficheros generados no se versionan.

## Validación

```bash
npm run check
npm run build
```

## Fuentes transcritas

- `PAU GLORIES.pdf`, edición septiembre de 2025, 361 páginas. SHA-256:

  `4f5089d521e9536c4183b81623e5a383b94f0e8b2e4570237ea9575987c2c12c`

- `Protocols actuació_Rda Dalt_V1_revAB.pdf`, edición octubre de 2024, 207 páginas. SHA-256:

  `c51cb81beb7f458bcce2175a85a3d69a2c1fd636368e46034cf0538104e84e43`

- `PAU-RondaLitoral_març 25_V2 Rev JA.pdf`, edición marzo de 2025, 884 páginas: catálogos B-10 y recorrido 250-TRA por túnel.
- `Plan de Emergencia - Túnel de Camèlies.pdf`, 186 páginas: 27 códigos y recorrido 250-TRA.
- `Plan de Emergencia - Túnel de Lesseps.pdf`, 184 páginas: 27 códigos y recorrido 250-TRA.

La numeración física del PDF y la impresa en el documento se guardan por separado para evitar ambigüedades.

La interfaz de integración con TunSec se documenta en [`docs/INTEGRATION.md`](docs/INTEGRATION.md).
