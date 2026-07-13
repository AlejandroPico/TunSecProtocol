PRAGMA foreign_keys = ON;

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  edition TEXT NOT NULL,
  issue_date TEXT,
  physical_pages INTEGER NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  validation_state TEXT NOT NULL CHECK (validation_state IN ('verified', 'pending', 'unreadable')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE tunnels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  corridor TEXT NOT NULL,
  directions_json TEXT NOT NULL,
  source_id TEXT,
  digitization_state TEXT NOT NULL CHECK (digitization_state IN ('operational-prototype', 'catalogued', 'pending')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE protocols (
  id TEXT PRIMARY KEY,
  tunnel_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title_ca TEXT NOT NULL,
  title_es TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 4),
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  description_es TEXT NOT NULL DEFAULT '',
  implementation_state TEXT NOT NULL CHECK (implementation_state IN ('guided', 'catalog-only')),
  source_id TEXT NOT NULL,
  pdf_pages TEXT NOT NULL,
  printed_pages TEXT NOT NULL,
  UNIQUE (tunnel_id, code),
  FOREIGN KEY (tunnel_id) REFERENCES tunnels(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE decision_nodes (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('start', 'question', 'terminal')),
  title_es TEXT NOT NULL,
  prompt_es TEXT NOT NULL,
  source_page INTEGER NOT NULL,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id)
);

CREATE TABLE decision_options (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  label_es TEXT NOT NULL,
  value TEXT NOT NULL,
  next_node_id TEXT,
  branch_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY (node_id) REFERENCES decision_nodes(id),
  FOREIGN KEY (next_node_id) REFERENCES decision_nodes(id)
);

CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  branch_key TEXT NOT NULL,
  phase TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  instruction_es TEXT NOT NULL,
  criticality TEXT NOT NULL CHECK (criticality IN ('information', 'required', 'critical')),
  source_page INTEGER NOT NULL,
  printed_page INTEGER NOT NULL,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL,
  branch_key TEXT NOT NULL,
  target TEXT NOT NULL,
  condition_es TEXT NOT NULL DEFAULT '',
  mandatory_state TEXT NOT NULL CHECK (mandatory_state IN ('required', 'conditional', 'source-listed')),
  source_page INTEGER NOT NULL,
  printed_page INTEGER NOT NULL,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id)
);

CREATE INDEX idx_protocols_tunnel_severity ON protocols(tunnel_id, severity, code);
CREATE INDEX idx_actions_protocol_branch ON actions(protocol_id, branch_key, sort_order);
CREATE INDEX idx_notifications_protocol_branch ON notifications(protocol_id, branch_key);
