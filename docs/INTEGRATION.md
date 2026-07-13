# Integración TunSec ↔ TunSec Protocol

La primera interfaz de integración permite abrir el asistente con el contexto de una incidencia y devolver cambios al programa contenedor. No crea fichas en TunSec todavía: define un contrato estable para la futura fusión.

## Apertura por URL

```text
/?tunnel=b20-pedralbes&direction=Besòs&code=250-TRA&incidentId=INC-123&sessionId=SESSION-123
```

`tunnel` es obligatorio. Si falta un sentido válido, la aplicación conserva el túnel seleccionado y solicita confirmarlo. `code`, `incidentId` y `sessionId` son opcionales.

## Mensajería

Se usa el canal `tunsec-bridge-v1` mediante `BroadcastChannel` para páginas del mismo origen y `window.postMessage` cuando el asistente está incrustado. Todos los mensajes usan `schemaVersion: 1` y no incluyen teléfonos ni datos personales.

TunSec puede solicitar una apertura con:

```json
{
  "type": "TUNSEC_OPEN_PROTOCOL",
  "context": {
    "tunnelId": "b20-pedralbes",
    "direction": "Besòs",
    "protocolCode": "250-TRA",
    "incidentId": "INC-123",
    "sessionId": "SESSION-123"
  }
}
```

TunSec Protocol emite `TUNSEC_PROTOCOL_SESSION_STARTED`, `TUNSEC_PROTOCOL_SELECTED` y `TUNSEC_PROTOCOL_ACTION_UPDATED`. El contexto incluye el identificador de sesión, túnel, sentido, código y, en el último evento, los identificadores de acciones confirmadas.

## Sesiones locales

La barra superior permite cambiar directamente entre hasta ocho incidencias recientes. Se almacenan en `localStorage` bajo `tunsec-active-sessions-v1`; no salen del navegador salvo exportación explícita o recepción por el programa contenedor mediante el contrato anterior.
