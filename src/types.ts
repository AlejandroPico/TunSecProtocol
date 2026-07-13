export interface SourceRecord {
  id: string;
  title: string;
  fileName: string;
  edition: string;
  issueDate: string;
  physicalPages: number;
  sha256: string;
  validationState: 'verified' | 'pending' | 'unreadable';
  notes: string;
}

export interface TunnelRecord {
  id: string;
  name: string;
  corridor: string;
  directions: string[];
  sourceId: string | null;
  digitizationState: 'operational-prototype' | 'catalogued' | 'pending';
  protocolCatalogId: string;
  isSelectable: boolean;
}

export interface ProtocolRecord {
  id: string;
  tunnelId: string;
  code: string;
  titleCa: string;
  titleEs: string;
  severity: 1 | 2 | 3 | 4;
  category: string;
  icon: string;
  descriptionEs: string;
  implementationState: 'guided' | 'catalog-only';
  sourceId: string;
  pdfPages: string;
  printedPages: string;
}

export interface DecisionNode {
  id: string;
  protocolId: string;
  nodeType: 'start' | 'question' | 'terminal';
  titleEs: string;
  promptEs: string;
  sourcePage: number;
}

export interface DecisionOption {
  id: string;
  nodeId: string;
  labelEs: string;
  value: string;
  nextNodeId: string | null;
  branchKey: string;
  sortOrder: number;
}

export interface ActionRecord {
  id: string;
  protocolId: string;
  branchKey: string;
  phase: string;
  sortOrder: number;
  actionType: string;
  instructionEs: string;
  criticality: 'information' | 'required' | 'critical';
  sourcePage: number;
  printedPage: string;
}

export interface NotificationRecord {
  id: string;
  protocolId: string;
  branchKey: string;
  target: string;
  conditionEs: string;
  mandatoryState: 'required' | 'conditional' | 'source-listed';
  sourcePage: number;
  printedPage: string;
}

export interface ProtocolBundle {
  protocol: ProtocolRecord;
  source: SourceRecord;
  nodes: DecisionNode[];
  options: DecisionOption[];
  actions: ActionRecord[];
  notifications: NotificationRecord[];
}

export interface AuditEvent {
  at: string;
  elapsedSeconds: number;
  type: 'session' | 'answer' | 'action' | 'notification' | 'navigation';
  message: string;
}
