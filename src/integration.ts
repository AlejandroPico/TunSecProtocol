export const BRIDGE_CHANNEL = 'tunsec-bridge-v1';

export interface TunSecLaunchContext {
  incidentId?: string;
  sessionId?: string;
  tunnelId: string;
  direction?: string;
  protocolCode?: string;
}

export interface TunSecBridgeEvent {
  source: 'TunSecProtocol';
  schemaVersion: 1;
  type: 'TUNSEC_PROTOCOL_SESSION_STARTED' | 'TUNSEC_PROTOCOL_SELECTED' | 'TUNSEC_PROTOCOL_ACTION_UPDATED' |
    'TUNSEC_PROTOCOL_NOTIFICATION_UPDATED' | 'TUNSEC_PROTOCOL_SESSION_CLOSED';
  emittedAt: string;
  context: {
    sessionId: string;
    incidentId?: string;
    tunnelId: string;
    direction: string;
    protocolCode?: string;
    completedActionIds?: string[];
    completedNotificationIds?: string[];
    notificationTargets?: string[];
    status?: 'OPEN' | 'RESOLVED' | 'CLOSED';
  };
}

let channel: BroadcastChannel | null = null;

function bridgeChannel(): BroadcastChannel | null {
  if (!('BroadcastChannel' in window)) return null;
  channel ??= new BroadcastChannel(BRIDGE_CHANNEL);
  return channel;
}

export function parseLaunchContext(location = window.location): TunSecLaunchContext | null {
  const params = new URLSearchParams(location.search);
  const tunnelId = params.get('tunnel')?.trim();
  if (!tunnelId) return null;
  return {
    tunnelId,
    direction: params.get('direction')?.trim() || undefined,
    protocolCode: params.get('code')?.trim().toUpperCase() || undefined,
    incidentId: params.get('incidentId')?.trim() || undefined,
    sessionId: params.get('sessionId')?.trim() || undefined
  };
}

export function emitBridgeEvent(event: Omit<TunSecBridgeEvent, 'source' | 'schemaVersion' | 'emittedAt'>): void {
  const message: TunSecBridgeEvent = {
    ...event,
    source: 'TunSecProtocol',
    schemaVersion: 1,
    emittedAt: new Date().toISOString()
  };
  bridgeChannel()?.postMessage(message);
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

export function listenForLaunch(handler: (context: TunSecLaunchContext) => void): () => void {
  const accept = (data: unknown): void => {
    if (!data || typeof data !== 'object') return;
    const message = data as { type?: string; context?: TunSecLaunchContext };
    if (message.type === 'TUNSEC_OPEN_PROTOCOL' && message.context?.tunnelId) handler(message.context);
  };
  const onWindowMessage = (event: MessageEvent): void => {
    if (event.origin === window.location.origin) accept(event.data);
  };
  const broadcast = bridgeChannel();
  const onBroadcast = (event: MessageEvent): void => accept(event.data);
  window.addEventListener('message', onWindowMessage);
  broadcast?.addEventListener('message', onBroadcast);
  return () => {
    window.removeEventListener('message', onWindowMessage);
    broadcast?.removeEventListener('message', onBroadcast);
  };
}
