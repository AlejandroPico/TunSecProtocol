import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type {
  ActionRecord,
  DecisionNode,
  DecisionOption,
  NotificationRecord,
  ProtocolBundle,
  ProtocolRecord,
  SourceRecord,
  TunnelRecord
} from './types';

let SQL: SqlJsStatic;
let database: Database;

const text = (value: unknown): string => String(value ?? '');
const number = (value: unknown): number => Number(value ?? 0);

function rows(sql: string, params: Array<string | number | null | Uint8Array> = []): Record<string, unknown>[] {
  const statement = database.prepare(sql);
  try {
    statement.bind(params);
    const result: Record<string, unknown>[] = [];
    while (statement.step()) result.push(statement.getAsObject());
    return result;
  } finally {
    statement.free();
  }
}

function mapSource(row: Record<string, unknown>): SourceRecord {
  return {
    id: text(row.id),
    title: text(row.title),
    fileName: text(row.file_name),
    edition: text(row.edition),
    issueDate: text(row.issue_date),
    physicalPages: number(row.physical_pages),
    sha256: text(row.sha256),
    validationState: text(row.validation_state) as SourceRecord['validationState'],
    notes: text(row.notes)
  };
}

function mapProtocol(row: Record<string, unknown>): ProtocolRecord {
  return {
    id: text(row.id),
    tunnelId: text(row.tunnel_id),
    code: text(row.code),
    titleCa: text(row.title_ca),
    titleEs: text(row.title_es),
    severity: number(row.severity) as ProtocolRecord['severity'],
    category: text(row.category),
    icon: text(row.icon),
    descriptionEs: text(row.description_es),
    implementationState: text(row.implementation_state) as ProtocolRecord['implementationState'],
    sourceId: text(row.source_id),
    pdfPages: text(row.pdf_pages),
    printedPages: text(row.printed_pages)
  };
}

export async function openDatabase(): Promise<void> {
  SQL = await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}vendor/sql-wasm.wasm`
  });
  const response = await fetch(`${import.meta.env.BASE_URL}data/tunsec-protocol.sqlite`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar SQLite (${response.status}).`);
  database = new SQL.Database(new Uint8Array(await response.arrayBuffer()));
  const integrity = rows('PRAGMA integrity_check')[0];
  if (!integrity || Object.values(integrity)[0] !== 'ok') throw new Error('La base SQLite no supera la comprobación de integridad.');
}

export function getTunnels(): TunnelRecord[] {
  return rows('SELECT * FROM tunnels WHERE is_selectable = 1 ORDER BY corridor, name').map((row) => ({
    id: text(row.id),
    name: text(row.name),
    corridor: text(row.corridor),
    directions: JSON.parse(text(row.directions_json)) as string[],
    sourceId: row.source_id === null ? null : text(row.source_id),
    digitizationState: text(row.digitization_state) as TunnelRecord['digitizationState'],
    protocolCatalogId: text(row.protocol_catalog_id),
    isSelectable: number(row.is_selectable) === 1
  }));
}

export function getProtocols(protocolCatalogId: string, tunnelId?: string): ProtocolRecord[] {
  return rows(`SELECT p.*, COALESCE(c.source_id,p.source_id) source_id,
    COALESCE(c.pdf_pages,p.pdf_pages) pdf_pages, COALESCE(c.printed_pages,p.printed_pages) printed_pages
    FROM protocols p LEFT JOIN protocol_citations c ON c.protocol_id=p.id AND c.tunnel_id=?
    WHERE p.tunnel_id = ? ORDER BY p.severity, p.code`, [tunnelId ?? '', protocolCatalogId]).map(mapProtocol);
}

export function getSource(sourceId: string): SourceRecord {
  const source = rows('SELECT * FROM sources WHERE id = ?', [sourceId])[0];
  if (!source) throw new Error(`Fuente no encontrada: ${sourceId}`);
  return mapSource(source);
}

export function getProtocolBundle(protocolId: string, tunnelId?: string): ProtocolBundle {
  const protocolRow = rows(`SELECT p.*, COALESCE(c.source_id,p.source_id) source_id,
    COALESCE(c.pdf_pages,p.pdf_pages) pdf_pages, COALESCE(c.printed_pages,p.printed_pages) printed_pages
    FROM protocols p LEFT JOIN protocol_citations c ON c.protocol_id=p.id AND c.tunnel_id=? WHERE p.id=?`, [tunnelId ?? '', protocolId])[0];
  if (!protocolRow) throw new Error(`Protocolo no encontrado: ${protocolId}`);
  const protocol = mapProtocol(protocolRow);
  const nodes: DecisionNode[] = rows('SELECT * FROM decision_nodes WHERE protocol_id = ?', [protocolId]).map((row) => ({
    id: text(row.id), protocolId: text(row.protocol_id), nodeType: text(row.node_type) as DecisionNode['nodeType'],
    titleEs: text(row.title_es), promptEs: text(row.prompt_es), sourcePage: number(row.source_page)
  }));
  const options: DecisionOption[] = rows(`SELECT o.* FROM decision_options o JOIN decision_nodes n ON n.id=o.node_id
    WHERE n.protocol_id=? ORDER BY o.sort_order`, [protocolId]).map((row) => ({
    id: text(row.id), nodeId: text(row.node_id), labelEs: text(row.label_es), value: text(row.value),
    nextNodeId: row.next_node_id === null ? null : text(row.next_node_id), branchKey: text(row.branch_key), sortOrder: number(row.sort_order)
  }));
  const actions: ActionRecord[] = rows('SELECT * FROM actions WHERE protocol_id = ? ORDER BY sort_order, id', [protocolId]).map((row) => ({
    id: text(row.id), protocolId: text(row.protocol_id), branchKey: text(row.branch_key), phase: text(row.phase),
    sortOrder: number(row.sort_order), actionType: text(row.action_type), instructionEs: text(row.instruction_es),
    criticality: text(row.criticality) as ActionRecord['criticality'], sourcePage: number(row.source_page), printedPage: text(row.printed_page)
  }));
  const notifications: NotificationRecord[] = rows('SELECT * FROM notifications WHERE protocol_id = ? ORDER BY id', [protocolId]).map((row) => ({
    id: text(row.id), protocolId: text(row.protocol_id), branchKey: text(row.branch_key), target: text(row.target),
    conditionEs: text(row.condition_es), mandatoryState: text(row.mandatory_state) as NotificationRecord['mandatoryState'],
    sourcePage: number(row.source_page), printedPage: text(row.printed_page)
  }));
  return { protocol, source: getSource(protocol.sourceId), nodes, options, actions, notifications };
}
