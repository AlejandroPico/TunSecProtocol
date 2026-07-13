# Integración TunSec ↔ TunSec Protocol

La interfaz permite abrir el asistente con el contexto de una incidencia y devolver cambios al programa contenedor. TUNSEC conserva su JSON como registro persistente y el canal del navegador aporta sincronización inmediata en el mismo equipo.

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

TunSec Protocol emite `TUNSEC_PROTOCOL_SESSION_STARTED`, `TUNSEC_PROTOCOL_SELECTED`, `TUNSEC_PROTOCOL_ACTION_UPDATED`, `TUNSEC_PROTOCOL_NOTIFICATION_UPDATED` y `TUNSEC_PROTOCOL_SESSION_CLOSED`. El contexto incluye sesión, túnel, sentido, código, confirmaciones y estado de cierre. TUNSEC registra estos cambios en su JSON; nunca cierra una incidencia con recursos presentes.

## Sesiones locales

La barra superior permite cambiar directamente entre hasta ocho incidencias recientes. Se almacenan en `localStorage` bajo `tunsec-active-sessions-v1`; no salen del navegador salvo exportación explícita o recepción por el programa contenedor mediante el contrato anterior.
