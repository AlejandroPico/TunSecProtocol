# Plan de validación y homologación

TunSec Protocol es, en su estado actual, un prototipo de apoyo a la consulta. Antes de emplearlo en explotación real debe superar una validación formal por la organización responsable.

## Regla de publicación

Ningún protocolo pasa de `catalog-only` a `guided` sin estas cuatro evidencias:

1. **Transcripción:** comparación línea a línea con descripción, diagrama y ficha del operador.
2. **Revisión visual:** comprobación de los diagramas renderizados; la extracción de texto no es suficiente.
3. **Revisión operativa:** aprobación por al menos dos personas autorizadas que no hayan realizado la transcripción.
4. **Prueba de escenarios:** ejecución de todas las ramas y comparación del resultado con el PAU vigente.

## Casos mínimos de prueba

| Área | Prueba |
|---|---|
| Selección | No es posible abrir una guía sin túnel y sentido. |
| Fuente | Toda acción muestra página física e impresa. |
| Ramas | Cada respuesta activa solo las acciones y avisos aplicables. |
| Cierre | La desactivación aparece únicamente tras confirmar el fin de la situación. |
| Incendio | La ubicación interior y la zona de influencia producen secuencias distintas. |
| Vertido | Peligroso, dos o más carriles y un carril producen secuencias distintas. |
| Bitácora | Cada respuesta y confirmación deja fecha y tiempo transcurrido. |
| Fallo de datos | Una base ausente o corrupta bloquea completamente el asistente. |
| Accesibilidad | Navegación por teclado, foco visible, contraste y modo de movimiento reducido. |
| Despliegue | Prueba sin red después de cargar la aplicación; no debe depender de CDNs. |

## Control de versiones documentales

- El SHA-256 identifica exactamente la copia usada en la transcripción.
- Una nueva edición del PAU no reemplaza silenciosamente a la anterior.
- La actualización se prepara como nueva fuente, se comparan cambios y se repite la validación.
- Si una fuente queda obsoleta o no legible, sus recorridos se bloquean hasta resolverla.

## Limitaciones intencionadas de esta entrega

- Glòries tiene guiados 200-TRA, 240-TRA, 250-TRA y 400-FOC.
- La B-20 tiene sus 21 códigos catalogados y 250-TRA guiado, con variantes por túnel únicamente donde constan en la fuente.
- La B-10 contiene 29 códigos para Diagonal Mar, Poble Nou, Vila Olímpica, Pla de Palau y Colom; Baró de Viver y Bon Pastor contienen los 23 códigos que figuran en su bloque documental. El 250-TRA está guiado con variantes por túnel.
- Camèlies y Lesseps contienen 27 códigos cada uno y el 250-TRA guiado. Los demás urbanos siguen bloqueados hasta completar su transcripción y validación.
- No se realizan llamadas, notificaciones, maniobras SCADA ni acciones sobre señalización.
- La bitácora local no sustituye el registro oficial de incidencias.
- Los teléfonos y datos personales de los PDF no se publican en GitHub Pages.

## Incidencia documental detectada

La copia `PAU Túnels Badal-MC-M v1.1_Juliol 2023_signat.pdf` está dañada y no contiene un objeto raíz PDF recuperable. Debe obtenerse una copia íntegra antes de considerar esa revisión como fuente aplicable.
