import './styles.css';
import { getProtocolBundle, getProtocols, getTunnels, openDatabase } from './database';
import { icon } from './icons';
import { emitBridgeEvent, listenForLaunch, parseLaunchContext, type TunSecLaunchContext } from './integration';
import type { ActionRecord, AuditEvent, ProtocolBundle, ProtocolRecord, TunnelRecord } from './types';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('No se ha encontrado el contenedor de la aplicación.');
const app: HTMLDivElement = appElement;

const themes = ['day', 'dusk', 'night'] as const;
type Theme = (typeof themes)[number];

interface SessionState {
  sessionId: string;
  incidentId?: string;
  tunnel: TunnelRecord | null;
  direction: string;
  protocol: ProtocolRecord | null;
  bundle: ProtocolBundle | null;
  currentNodeId: string | null;
  branches: Set<string>;
  completedActions: Set<string>;
  category: string;
  search: string;
  audit: AuditEvent[];
  startedAt: number;
  theme: Theme;
}

interface SavedSession {
  sessionId: string;
  incidentId?: string;
  tunnelId: string;
  direction: string;
  protocolCode: string | null;
  currentNodeId: string | null;
  branches: string[];
  completedActions: string[];
  audit: AuditEvent[];
  startedAt: number;
  updatedAt: number;
}

const SESSION_STORAGE_KEY = 'tunsec-active-sessions-v1';

let tunnels: TunnelRecord[] = [];
let protocols: ProtocolRecord[] = [];
let pendingTunnel: TunnelRecord | null = null;
let savedSessions: SavedSession[] = [];
let state: SessionState = {
  sessionId: '',
  tunnel: null,
  direction: '',
  protocol: null,
  bundle: null,
  currentNodeId: null,
  branches: new Set(),
  completedActions: new Set(),
  category: 'all',
  search: '',
  audit: [],
  startedAt: Date.now(),
  theme: (localStorage.getItem('tunsec-theme') as Theme | null) ?? 'night'
};

const severityMeta = {
  1: { label: 'Prealerta', short: '100', className: 's1' },
  2: { label: 'Alerta', short: '200', className: 's2' },
  3: { label: 'Emergencia', short: '300', className: 's3' },
  4: { label: 'Incendio', short: '400', className: 's4' }
} as const;

const categoryLabels: Record<string, string> = {
  all: 'Todas', traffic: 'Tráfico', hazmat: 'Vertidos / MMPP', people: 'Personas / animales',
  systems: 'Sistemas', environment: 'Ambiente', fire: 'Incendio', security: 'Seguridad', operations: 'Operación'
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function elapsedSeconds(): number {
  return Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
}

function elapsedText(seconds = elapsedSeconds()): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function addAudit(type: AuditEvent['type'], message: string): void {
  state.audit.push({ at: new Date().toISOString(), elapsedSeconds: elapsedSeconds(), type, message });
  saveLocalSnapshot();
}

function saveLocalSnapshot(): void {
  if (!state.tunnel || !state.sessionId) return;
  const snapshot: SavedSession = {
    sessionId: state.sessionId,
    incidentId: state.incidentId,
    tunnelId: state.tunnel.id,
    direction: state.direction,
    protocolCode: state.protocol?.code ?? null,
    currentNodeId: state.currentNodeId,
    branches: [...state.branches],
    completedActions: [...state.completedActions],
    audit: state.audit,
    startedAt: state.startedAt,
    updatedAt: Date.now()
  };
  savedSessions = [snapshot, ...savedSessions.filter((item) => item.sessionId !== snapshot.sessionId)]
    .sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 8);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(savedSessions));
}

function loadSavedSessions(): void {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]') as SavedSession[];
    savedSessions = Array.isArray(parsed) ? parsed.filter((item) => item.sessionId && item.tunnelId && item.direction).slice(0, 8) : [];
  } catch {
    savedSessions = [];
  }
}

function setTheme(theme: Theme): void {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('tunsec-theme', theme);
}

function cycleTheme(): void {
  const index = themes.indexOf(state.theme);
  setTheme(themes[(index + 1) % themes.length] ?? 'night');
  render();
}

function sessionTabs(): string {
  if (!savedSessions.length) return '';
  return `<nav class="session-tabs" aria-label="Incidencias abiertas">${savedSessions.map((session) => {
    const tunnel = tunnels.find((item) => item.id === session.tunnelId);
    const active = session.sessionId === state.sessionId;
    return `<button class="session-tab ${active ? 'active' : ''}" data-session="${escapeHtml(session.sessionId)}" type="button" title="${escapeHtml(tunnel?.name ?? session.tunnelId)} · ${escapeHtml(session.direction)}">
      <i></i><span>${escapeHtml(tunnel?.name ?? session.tunnelId)}</span><b>${escapeHtml(session.protocolCode ?? session.direction)}</b></button>`;
  }).join('')}</nav>`;
}

function appHeader(): string {
  return `<header class="app-header">
    <button class="brand" data-home type="button" aria-label="Volver a selección de túnel">
      <span class="brand-mark">TS</span><span><strong>TUNSEC PROTOCOL</strong><small>ASISTENTE PAU · BARCELONA</small></span>
    </button>
    <div class="header-center">${sessionTabs()}</div>
    <div class="header-tools">
      ${state.tunnel ? `<span class="session-clock"><i></i><span id="elapsedClock">${elapsedText()}</span></span>` : ''}
      ${state.tunnel ? '<button class="change-tunnel" data-change-tunnel type="button">NUEVA / CAMBIAR</button>' : ''}
      <button class="square-button" data-theme-control type="button" title="Cambiar tema visual">${state.theme === 'day' ? '☀' : state.theme === 'dusk' ? '◐' : '☾'}</button>
    </div>
  </header>`;
}

function renderLoading(): void {
  app.innerHTML = `<main class="loading-screen"><div class="loader"></div><strong>Verificando base SQLite</strong><span>Integridad, catálogo y trazabilidad documental</span></main>`;
}

function renderError(error: unknown): void {
  app.innerHTML = `${appHeader()}<main class="fatal-error"><span class="error-code">DB</span><h1>No se puede abrir el asistente</h1>
    <p>${escapeHtml(error instanceof Error ? error.message : error)}</p><p>No utilices una copia incompleta como referencia operativa.</p>
    <button class="primary-button" onclick="location.reload()">Reintentar</button></main>`;
}

function tunnelStateLabel(tunnel: TunnelRecord): string {
  if (tunnel.protocolCatalogId === 'glories') return '4 guías';
  if (tunnel.protocolCatalogId === 'b20') return 'Guiado';
  return 'Pendiente';
}

function tunnelCoverage(tunnel: TunnelRecord): { summary: string; source: string } {
  if (tunnel.protocolCatalogId === 'b20') return {
    summary: '21 códigos catalogados · 250-TRA guiado',
    source: 'PAU túneles Ronda de Dalt B-20 · octubre 2024'
  };
  return {
    summary: '29 códigos catalogados · 4 recorridos guiados',
    source: 'PAU Glòries · septiembre 2025'
  };
}

function renderTunnelSelection(): void {
  const grouped = tunnels.reduce((result, tunnel) => {
    const current = result.get(tunnel.corridor) ?? [];
    current.push(tunnel);
    result.set(tunnel.corridor, current);
    return result;
  }, new Map<string, TunnelRecord[]>());
  const groups = [...grouped.entries()].map(([corridor, items]) => `<section class="tunnel-group">
    <div class="section-kicker">${escapeHtml(corridor)}</div>
    <div class="tunnel-grid">${items.map((tunnel) => `<button class="tunnel-card ${pendingTunnel?.id === tunnel.id ? 'selected' : ''}" data-tunnel="${tunnel.id}" type="button">
      <span class="tunnel-symbol">${icon(tunnel.id === 'glories' ? 'fire' : 'default')}</span>
      <span><strong>${escapeHtml(tunnel.name)}</strong><small>${escapeHtml(tunnel.directions.join(' · '))}</small></span>
      <em class="coverage ${tunnel.digitizationState}">${tunnelStateLabel(tunnel)}</em>
    </button>`).join('')}</div>
  </section>`).join('');

  const coverage = pendingTunnel ? tunnelCoverage(pendingTunnel) : null;
  const choice = pendingTunnel ? `<aside class="selection-panel">
    <div class="section-kicker">Túnel seleccionado</div><h2>${escapeHtml(pendingTunnel.name)}</h2>
    ${pendingTunnel.digitizationState === 'operational-prototype' ? `<p>Selecciona el sentido confirmado por cámaras o por el aviso recibido.</p>
      <div class="direction-grid">${pendingTunnel.directions.map((direction) => `<button class="direction-button" data-direction="${escapeHtml(direction)}" type="button"><span>${escapeHtml(direction)}</span><b>→</b></button>`).join('')}</div>
      <div class="source-mini"><span>COBERTURA ACTUAL</span><strong>${escapeHtml(coverage?.summary)}</strong><small>${escapeHtml(coverage?.source)}</small></div>`
      : `<div class="pending-panel"><strong>Digitalización pendiente</strong><p>El documento está en el lote de trabajo, pero todavía no hay instrucciones transcritas y verificadas para este túnel.</p><p class="muted">No se muestran protocolos aproximados de otro túnel.</p></div>`}
  </aside>` : `<aside class="selection-panel empty-selection"><div>${icon('default')}<h2>Selecciona un túnel</h2><p>Es el dato inicial obligatorio. Las incidencias ya abiertas permanecen accesibles en la barra superior.</p></div></aside>`;

  app.innerHTML = `${appHeader()}<main class="selection-layout"><section class="selection-content">
    <div class="hero-row"><div><span class="eyebrow">PASO 1 DE 2</span><h1>¿En qué túnel está ocurriendo?</h1><p>Selecciona la infraestructura antes de clasificar la incidencia.</p></div><div class="db-status"><i></i><span>SQLite verificada<br><small>solo lectura</small></span></div></div>
    ${groups}</section>${choice}</main>`;
}

function quickAccess(): string {
  const definitions = [
    { code: '400-FOC', icon: 'fire', label: 'Incendio / explosión', tone: 'red' },
    { code: '200-TRA', icon: 'spill', label: 'Vertido', tone: 'amber' },
    { code: '250-TRA', icon: 'vehicle-stopped', label: 'Vehículo detenido', tone: 'yellow' },
    { code: '240-TRA', icon: 'animal', label: 'Animal / peatón', tone: 'yellow' }
  ];
  const quick = definitions.flatMap((item) => {
    const protocol = protocols.find((candidate) => candidate.code === item.code);
    return protocol ? [{ ...item, id: protocol.id }] : [];
  });
  return `<div class="quick-grid">${quick.map((item) => `<button class="quick-card ${item.tone}" data-protocol="${item.id}" type="button">
    ${icon(item.icon)}<span>${item.label}</span><b>ABRIR</b></button>`).join('')}</div>`;
}

function filterProtocols(): ProtocolRecord[] {
  const normalized = state.search.trim().toLocaleLowerCase('es');
  return protocols.filter((protocol) => {
    const categoryMatch = state.category === 'all' || protocol.category === state.category;
    const textMatch = !normalized || `${protocol.code} ${protocol.titleEs} ${protocol.titleCa}`.toLocaleLowerCase('es').includes(normalized);
    return categoryMatch && textMatch;
  });
}

function protocolList(): string {
  const visible = filterProtocols();
  return `<div class="protocol-list-head"><strong>${visible.length} resultados</strong><button data-clear-filter type="button">Limpiar</button></div>
    <div class="protocol-list">${visible.map((protocol) => {
      const meta = severityMeta[protocol.severity];
      return `<button class="protocol-row ${state.protocol?.id === protocol.id ? 'active' : ''}" data-protocol="${protocol.id}" type="button">
        <span class="code-block ${meta.className}">${escapeHtml(protocol.code)}</span>
        <span class="protocol-row-copy"><strong>${escapeHtml(protocol.titleEs)}</strong><small>${meta.label} · ${protocol.implementationState === 'guided' ? 'Guía trazada' : 'Catálogo'}</small></span>
        <span class="row-arrow">›</span></button>`;
    }).join('') || '<div class="no-results">Sin coincidencias.<br>Prueba otro término o categoría.</div>'}</div>`;
}

function categoryFilters(): string {
  const available = ['all', ...new Set(protocols.map((protocol) => protocol.category))];
  return `<div class="filter-strip">${available.map((category) => `<button class="filter-chip ${state.category === category ? 'active' : ''}" data-category="${category}" type="button">${escapeHtml(categoryLabels[category] ?? category)}</button>`).join('')}</div>`;
}

function blankWorkspace(): string {
  return `<section class="workspace-empty"><div class="empty-glyph">${icon('default')}</div><span class="eyebrow">PASO 2 DE 2</span><h2>Selecciona la situación</h2>
    <p>Usa el acceso rápido, escribe un código conocido o filtra el catálogo.</p><div class="legend-row">
    ${Object.values(severityMeta).map((meta) => `<span><i class="legend ${meta.className}"></i>${meta.short} · ${meta.label}</span>`).join('')}</div></section>`;
}

function sourceReference(bundle: ProtocolBundle): string {
  return `<details class="source-box"><summary><span>${icon('default')} Fuente y trazabilidad</span><b>VER</b></summary>
    <dl><div><dt>Documento</dt><dd>${escapeHtml(bundle.source.title)}</dd></div><div><dt>Edición</dt><dd>${escapeHtml(bundle.source.edition)}</dd></div>
    <div><dt>Páginas PDF</dt><dd>${escapeHtml(bundle.protocol.pdfPages)}</dd></div><div><dt>Páginas impresas</dt><dd>${escapeHtml(bundle.protocol.printedPages)}</dd></div></dl>
    <p class="hash"><span>SHA-256</span>${escapeHtml(bundle.source.sha256)}</p></details>`;
}

function catalogOnly(bundle: ProtocolBundle): string {
  const meta = severityMeta[bundle.protocol.severity];
  return `<section class="protocol-workspace"><div class="protocol-titlebar ${meta.className}"><span>${escapeHtml(bundle.protocol.code)}</span><div><small>${meta.label}</small><h1>${escapeHtml(bundle.protocol.titleEs)}</h1></div></div>
    <div class="not-digitized"><span class="lock-mark">PENDIENTE</span><h2>Procedimiento aún no transcrito</h2><p>Este código está confirmado en el catálogo oficial, pero sus acciones todavía no han pasado la transcripción y revisión visual.</p>
    <p>Consulta el documento original en las páginas indicadas. El sistema no mezcla instrucciones de otros túneles ni genera una respuesta aproximada.</p></div>${sourceReference(bundle)}</section>`;
}

function visibleActions(bundle: ProtocolBundle): ActionRecord[] {
  const tunnelBranch = `tunnel:${state.tunnel?.id ?? ''}`;
  const sequenceStarted = state.branches.size > 0;
  return bundle.actions.filter((action) => state.branches.has(action.branchKey) || (sequenceStarted && action.branchKey === tunnelBranch));
}

function actionChecklist(bundle: ProtocolBundle): string {
  const actions = visibleActions(bundle);
  const completed = actions.filter((action) => state.completedActions.has(action.id)).length;
  return `<section class="runbook-panel"><div class="panel-heading"><div><span class="eyebrow">SECUENCIA OPERATIVA</span><h2>Acciones aplicables</h2></div><span class="progress-number">${completed}/${actions.length}</span></div>
    <div class="progress-track"><i style="width:${actions.length ? (completed / actions.length) * 100 : 0}%"></i></div>
    <div class="action-list">${actions.length ? actions.map((action, index) => {
      const checked = state.completedActions.has(action.id);
      return `<button class="action-item ${checked ? 'done' : ''} ${action.criticality}" data-action="${action.id}" type="button" aria-pressed="${checked}">
        <span class="action-check">${checked ? '✓' : String(index + 1).padStart(2, '0')}</span><span class="action-copy"><small>${escapeHtml(action.phase)} · ${escapeHtml(action.criticality)}</small><strong>${escapeHtml(action.instructionEs)}</strong>
        <em>PDF ${action.sourcePage} · impresa ${action.printedPage}</em></span></button>`;
    }).join('') : '<div class="waiting-actions">Pulsa “Comenzar” para cargar la secuencia verificada.</div>'}</div></section>`;
}

function notificationPanel(bundle: ProtocolBundle): string {
  const items = bundle.notifications.filter((item) => state.branches.has(item.branchKey));
  if (!items.length) return '';
  return `<section class="notification-panel"><div class="panel-heading compact"><div><span class="eyebrow">AVISOS</span><h2>Entidades indicadas</h2></div><span>${items.length}</span></div>
    <div class="notification-grid">${items.map((item) => `<article class="notification-item ${item.mandatoryState}"><strong>${escapeHtml(item.target)}</strong>
      <span>${item.mandatoryState === 'required' ? 'REQUERIDO' : item.mandatoryState === 'conditional' ? 'CONDICIONAL' : 'EN FUENTE'}</span>
      ${item.conditionEs ? `<p>${escapeHtml(item.conditionEs)}</p>` : ''}<small>PDF ${item.sourcePage} · impresa ${item.printedPage}</small></article>`).join('')}</div>
    <p class="call-warning">La aplicación no llama ni notifica automáticamente. El operador debe usar los canales oficiales.</p></section>`;
}

function decisionPanel(bundle: ProtocolBundle): string {
  const node = bundle.nodes.find((item) => item.id === state.currentNodeId);
  if (!node) return '';
  const options = bundle.options.filter((option) => option.nodeId === node.id);
  return `<section class="decision-panel ${node.nodeType}"><div class="decision-index"><span>${node.nodeType === 'terminal' ? 'FIN' : 'DECISIÓN'}</span><b>PDF ${node.sourcePage}</b></div>
    <h2>${escapeHtml(node.titleEs)}</h2><p>${escapeHtml(node.promptEs)}</p>
    ${options.length ? `<div class="decision-options">${options.map((option) => `<button data-option="${option.id}" type="button">${escapeHtml(option.labelEs)}<b>→</b></button>`).join('')}</div>` : `<div class="terminal-note">Secuencia completada. Verifica las acciones críticas antes de cerrar la sesión.</div>`}</section>`;
}

function auditPanel(): string {
  return `<details class="audit-panel"><summary><span>BITÁCORA DE SESIÓN</span><b>${state.audit.length} eventos</b></summary>
    <div class="audit-toolbar"><p>Registro local de navegación y confirmaciones. No equivale al registro oficial de incidencias.</p><button data-export type="button">Exportar JSON</button></div>
    <ol>${[...state.audit].reverse().map((event) => `<li><time>+${elapsedText(event.elapsedSeconds)}</time><span><small>${escapeHtml(event.type)}</small>${escapeHtml(event.message)}</span></li>`).join('')}</ol></details>`;
}

function guidedWorkspace(bundle: ProtocolBundle): string {
  const protocol = bundle.protocol;
  const meta = severityMeta[protocol.severity];
  return `<section class="protocol-workspace"><div class="protocol-titlebar ${meta.className}"><span>${escapeHtml(protocol.code)}</span><div><small>${meta.label} · GUÍA TRAZADA</small><h1>${escapeHtml(protocol.titleEs)}</h1></div><button class="restart-button" data-restart type="button">REINICIAR</button></div>
    ${protocol.descriptionEs ? `<p class="protocol-description">${escapeHtml(protocol.descriptionEs)}</p>` : ''}
    <div class="work-columns"><div class="decision-column">${decisionPanel(bundle)}${notificationPanel(bundle)}${sourceReference(bundle)}</div>${actionChecklist(bundle)}</div>${auditPanel()}</section>`;
}

function renderWorkspace(): string {
  if (!state.bundle) return blankWorkspace();
  return state.bundle.protocol.implementationState === 'guided' ? guidedWorkspace(state.bundle) : catalogOnly(state.bundle);
}

function renderDashboard(): void {
  app.innerHTML = `${appHeader()}<main class="dashboard">
    <section class="quick-section">${quickAccess()}</section>
    <section class="protocol-shell"><aside class="catalog-sidebar"><div class="catalog-head"><div><span class="eyebrow">CATÁLOGO PAU</span><h2>Clasificar incidencia</h2></div><span>${protocols.length}</span></div>
      <label class="search-box"><span>⌕</span><input id="protocolSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Código o situación…" autocomplete="off"></label>
      ${categoryFilters()}${protocolList()}</aside><div class="workspace">${renderWorkspace()}</div></section></main>`;
}

function render(): void {
  setTheme(state.theme);
  if (!state.tunnel) renderTunnelSelection(); else renderDashboard();
}

function chooseTunnel(tunnelId: string): void {
  pendingTunnel = tunnels.find((tunnel) => tunnel.id === tunnelId) ?? null;
  renderTunnelSelection();
}

function startSession(direction: string, launch?: Pick<TunSecLaunchContext, 'sessionId' | 'incidentId'>): void {
  if (!pendingTunnel || pendingTunnel.digitizationState !== 'operational-prototype') return;
  state = {
    ...state,
    sessionId: launch?.sessionId || crypto.randomUUID(),
    incidentId: launch?.incidentId,
    tunnel: pendingTunnel,
    direction,
    protocol: null,
    bundle: null,
    currentNodeId: null,
    branches: new Set(),
    completedActions: new Set(),
    audit: [],
    startedAt: Date.now()
  };
  protocols = getProtocols(pendingTunnel.protocolCatalogId);
  addAudit('session', `Sesión iniciada: ${pendingTunnel.name}, sentido ${direction}.`);
  emitBridgeEvent({ type: 'TUNSEC_PROTOCOL_SESSION_STARTED', context: {
    sessionId: state.sessionId, incidentId: state.incidentId, tunnelId: pendingTunnel.id, direction
  } });
  renderDashboard();
}

function restoreSession(sessionId: string): void {
  const snapshot = savedSessions.find((item) => item.sessionId === sessionId);
  const tunnel = tunnels.find((item) => item.id === snapshot?.tunnelId);
  if (!snapshot || !tunnel) return;
  protocols = getProtocols(tunnel.protocolCatalogId);
  const protocol = snapshot.protocolCode ? protocols.find((item) => item.code === snapshot.protocolCode) ?? null : null;
  const bundle = protocol ? getProtocolBundle(protocol.id) : null;
  state = {
    ...state,
    sessionId: snapshot.sessionId,
    incidentId: snapshot.incidentId,
    tunnel,
    direction: snapshot.direction,
    protocol,
    bundle,
    currentNodeId: snapshot.currentNodeId,
    branches: new Set(snapshot.branches),
    completedActions: new Set(snapshot.completedActions),
    audit: snapshot.audit,
    startedAt: snapshot.startedAt,
    category: 'all',
    search: ''
  };
  pendingTunnel = tunnel;
  renderDashboard();
}

function openTunnelSelection(): void {
  saveLocalSnapshot();
  state = { ...state, sessionId: '', incidentId: undefined, tunnel: null, direction: '', protocol: null, bundle: null,
    currentNodeId: null, branches: new Set(), completedActions: new Set(), audit: [], startedAt: Date.now() };
  pendingTunnel = null;
  protocols = [];
  renderTunnelSelection();
}

function applyLaunchContext(context: TunSecLaunchContext): void {
  const tunnel = tunnels.find((item) => item.id === context.tunnelId);
  if (!tunnel || tunnel.digitizationState !== 'operational-prototype') return;
  pendingTunnel = tunnel;
  const direction = context.direction && tunnel.directions.includes(context.direction) ? context.direction : null;
  if (!direction) {
    renderTunnelSelection();
    return;
  }
  startSession(direction, context);
  if (context.protocolCode) {
    const protocol = protocols.find((item) => item.code === context.protocolCode);
    if (protocol) openProtocol(protocol.id);
  }
}

function openProtocol(protocolId: string): void {
  const protocol = protocols.find((item) => item.id === protocolId);
  if (!protocol) return;
  state.protocol = protocol;
  state.bundle = getProtocolBundle(protocol.id);
  state.currentNodeId = state.bundle.nodes.find((node) => node.nodeType === 'start')?.id ?? null;
  state.branches = new Set();
  state.completedActions = new Set();
  addAudit('navigation', `Protocolo seleccionado: ${protocol.code} · ${protocol.titleEs}.`);
  if (state.tunnel) emitBridgeEvent({ type: 'TUNSEC_PROTOCOL_SELECTED', context: {
    sessionId: state.sessionId, incidentId: state.incidentId, tunnelId: state.tunnel.id,
    direction: state.direction, protocolCode: protocol.code
  } });
  renderDashboard();
}

function answer(optionId: string): void {
  const bundle = state.bundle;
  if (!bundle) return;
  const option = bundle.options.find((item) => item.id === optionId);
  if (!option) return;
  option.branchKey.split('|').forEach((branch) => state.branches.add(branch));
  state.currentNodeId = option.nextNodeId;
  const node = bundle.nodes.find((item) => item.id === option.nodeId);
  addAudit('answer', `${node?.titleEs ?? 'Decisión'}: ${option.labelEs}.`);
  renderDashboard();
}

function toggleAction(actionId: string): void {
  const action = state.bundle?.actions.find((item) => item.id === actionId);
  if (!action) return;
  if (state.completedActions.has(actionId)) {
    state.completedActions.delete(actionId);
    addAudit('action', `Confirmación retirada: ${action.instructionEs}`);
  } else {
    state.completedActions.add(actionId);
    addAudit('action', `Acción confirmada: ${action.instructionEs}`);
  }
  if (state.tunnel) emitBridgeEvent({ type: 'TUNSEC_PROTOCOL_ACTION_UPDATED', context: {
    sessionId: state.sessionId, incidentId: state.incidentId, tunnelId: state.tunnel.id,
    direction: state.direction, protocolCode: state.protocol?.code, completedActionIds: [...state.completedActions]
  } });
  renderDashboard();
}

function restartProtocol(): void {
  if (!state.bundle) return;
  state.currentNodeId = state.bundle.nodes.find((node) => node.nodeType === 'start')?.id ?? null;
  state.branches = new Set();
  state.completedActions = new Set();
  addAudit('navigation', `Recorrido ${state.bundle.protocol.code} reiniciado.`);
  renderDashboard();
}

function exportSession(): void {
  const source = state.bundle?.source;
  const payload = {
    format: 'TunSecProtocolSession', schemaVersion: 1, exportedAt: new Date().toISOString(),
    note: 'Bitácora auxiliar local; no sustituye el registro oficial.',
    context: { tunnel: state.tunnel?.name, direction: state.direction, protocol: state.protocol?.code },
    source: source ? { title: source.title, edition: source.edition, sha256: source.sha256 } : null,
    branches: [...state.branches], completedActionIds: [...state.completedActions], events: state.audit
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `tunsec-${state.protocol?.code ?? 'sesion'}-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tunnel],[data-direction],[data-protocol],[data-option],[data-action],[data-category],[data-session],[data-theme-control],[data-home],[data-change-tunnel],[data-clear-filter],[data-restart],[data-export]');
  if (!target) return;
  if (target.dataset.tunnel) chooseTunnel(target.dataset.tunnel);
  else if (target.dataset.direction) startSession(target.dataset.direction);
  else if (target.dataset.protocol) openProtocol(target.dataset.protocol);
  else if (target.dataset.option) answer(target.dataset.option);
  else if (target.dataset.action) toggleAction(target.dataset.action);
  else if (target.dataset.category) { state.category = target.dataset.category; renderDashboard(); }
  else if (target.dataset.session) restoreSession(target.dataset.session);
  else if (target.hasAttribute('data-theme-control')) cycleTheme();
  else if (target.hasAttribute('data-restart')) restartProtocol();
  else if (target.hasAttribute('data-export')) exportSession();
  else if (target.hasAttribute('data-clear-filter')) { state.category = 'all'; state.search = ''; renderDashboard(); }
  else if (target.hasAttribute('data-home') || target.hasAttribute('data-change-tunnel')) openTunnelSelection();
});

app.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id !== 'protocolSearch') return;
  state.search = input.value;
  const list = app.querySelector('.protocol-list');
  const head = app.querySelector('.protocol-list-head');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = protocolList();
  if (head) head.replaceWith(wrapper.firstElementChild as Element);
  if (list) list.replaceWith(wrapper.lastElementChild as Element);
});

setInterval(() => {
  const clock = document.querySelector('#elapsedClock');
  if (clock) clock.textContent = elapsedText();
}, 1000);

async function boot(): Promise<void> {
  renderLoading();
  setTheme(state.theme);
  try {
    await openDatabase();
    tunnels = getTunnels();
    loadSavedSessions();
    const launch = parseLaunchContext();
    if (launch) applyLaunchContext(launch); else renderTunnelSelection();
    listenForLaunch(applyLaunchContext);
  } catch (error) {
    renderError(error);
  }
}

void boot();
