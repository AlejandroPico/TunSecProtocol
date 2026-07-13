# Modelo de datos operativo

La base `tunsec-protocol.sqlite` es la fuente estructurada que consume la web. Se genera de forma determinista desde SQL y se publica en modo de solo lectura.

## Entidades

| Tabla | Propósito |
|---|---|
| `sources` | Inventario documental, edición, fecha, páginas, SHA-256 y estado de validación. |
| `tunnels` | Infraestructura, corredor, sentidos, documento y catálogo compartido aplicable. |
| `protocols` | Código, título, nivel, categoría, cobertura y páginas de origen. |
| `protocol_citations` | Paginación exacta por túnel cuando varios túneles comparten catálogo. |
| `decision_nodes` | Preguntas y terminales de cada diagrama de decisión. |
| `decision_options` | Respuestas, siguiente nodo y rama de acciones que activan. |
| `actions` | Secuencia operativa, criticidad y cita de página. |
| `notifications` | Entidad, obligatoriedad indicada por la fuente, condición y página. |

## Convenciones

- `pdf_pages` identifica la página física del fichero; `printed_pages`, la numeración impresa.
- `protocol_catalog_id` permite que cada túnel de una ronda tenga ficha propia sin duplicar un catálogo común; las acciones `tunnel:<id>` conservan variantes específicas documentadas.
- `guided` significa que existe un recorrido interactivo; no implica homologación.
- `catalog-only` confirma código y título, pero bloquea cualquier acción no transcrita.
- `required`, `conditional` y `source-listed` no son sinónimos: preservan el grado de obligación que aparece en el PAU.
- Los teléfonos no se publican en el prototipo. Las entidades se muestran por nombre y el operador usa los canales oficiales vigentes.

## Compilación

`scripts/build_database.py` crea una base nueva en cada compilación, activa claves foráneas, aplica los SQL del esquema y los catálogos, y ejecuta `PRAGMA integrity_check`.

`scripts/validate_database.py` comprueba:

1. Integridad SQLite y claves foráneas.
2. Cantidades esperadas de protocolos y recorridos.
3. Un único nodo inicial, al menos un terminal y ausencia de nodos inaccesibles.
4. Existencia de acciones, referencias de página y validez de las ramas específicas de túnel.

## Evolución prevista

La siguiente iteración debe añadir una tabla de revisiones y firmas (`protocol_reviews`) para registrar transcriptor, revisor operativo, fecha, resultado y versión desplegada. El estado de revisión se conserva en el modelo y en la documentación, sin ocupar espacio persistente en la pantalla operativa.
