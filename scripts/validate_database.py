from __future__ import annotations

import sqlite3
from collections import deque
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / "public" / "data" / "tunsec-protocol.sqlite"


def scalar(connection: sqlite3.Connection, sql: str, params: tuple[object, ...] = ()) -> int:
    row = connection.execute(sql, params).fetchone()
    if row is None:
        raise AssertionError(f"Query returned no rows: {sql}")
    return int(row[0])


def validate_protocol_graph(connection: sqlite3.Connection, protocol_id: str) -> None:
    nodes = {
        row[0]: row[1]
        for row in connection.execute(
            "SELECT id, node_type FROM decision_nodes WHERE protocol_id = ?", (protocol_id,)
        )
    }
    starts = [node_id for node_id, kind in nodes.items() if kind == "start"]
    terminals = {node_id for node_id, kind in nodes.items() if kind == "terminal"}
    assert len(starts) == 1, f"{protocol_id}: expected exactly one start node"
    assert terminals, f"{protocol_id}: terminal node missing"

    edges: dict[str, list[str]] = {node_id: [] for node_id in nodes}
    option_rows = connection.execute(
        """SELECT o.node_id, o.next_node_id, o.branch_key FROM decision_options o
           JOIN decision_nodes n ON n.id = o.node_id WHERE n.protocol_id = ?""",
        (protocol_id,),
    ).fetchall()
    reachable_branches: set[str] = set()
    for node_id, next_node_id, branch_key in option_rows:
        reachable_branches.update(str(branch_key).split("|"))
        if next_node_id is not None:
            assert next_node_id in nodes, f"{protocol_id}: dangling node {next_node_id}"
            edges[node_id].append(next_node_id)

    for node_id, kind in nodes.items():
        if kind == "terminal":
            assert not edges[node_id], f"{protocol_id}: terminal has outgoing edges"
        else:
            assert edges[node_id], f"{protocol_id}: non-terminal has no choices"

    visited: set[str] = set()
    queue = deque(starts)
    while queue:
        node_id = queue.popleft()
        if node_id in visited:
            continue
        visited.add(node_id)
        queue.extend(edges[node_id])
    assert visited == set(nodes), f"{protocol_id}: unreachable nodes {set(nodes) - visited}"
    assert visited & terminals, f"{protocol_id}: no reachable terminal"

    action_count = scalar(connection, "SELECT count(*) FROM actions WHERE protocol_id = ?", (protocol_id,))
    assert action_count > 0, f"{protocol_id}: no actions"
    action_branches = {
        row[0]
        for row in connection.execute("SELECT DISTINCT branch_key FROM actions WHERE protocol_id = ?", (protocol_id,))
    }
    assert action_branches <= reachable_branches, (
        f"{protocol_id}: actions use unreachable branches {action_branches - reachable_branches}"
    )


def main() -> None:
    connection = sqlite3.connect(DATABASE)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        assert connection.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert list(connection.execute("PRAGMA foreign_key_check")) == []
        assert scalar(connection, "SELECT count(*) FROM protocols WHERE tunnel_id='glories'") == 29
        assert scalar(connection, "SELECT count(*) FROM protocols WHERE implementation_state='guided'") == 4
        assert scalar(connection, "SELECT count(*) FROM sources") == 8
        assert scalar(connection, "SELECT count(*) FROM sources WHERE validation_state='verified'") == 1
        assert scalar(connection, "SELECT count(*) FROM sources WHERE validation_state='unreadable'") == 1

        guided = connection.execute(
            "SELECT id FROM protocols WHERE implementation_state='guided' ORDER BY id"
        ).fetchall()
        for (protocol_id,) in guided:
            validate_protocol_graph(connection, str(protocol_id))

        missing_citations = scalar(
            connection,
            "SELECT count(*) FROM actions WHERE source_page <= 0 OR printed_page <= 0",
        )
        assert missing_citations == 0, "Actions without page citations"
    finally:
        connection.close()
    print("Validated SQLite: 8 sources, 29 protocols, 4 guided graphs, references and foreign keys OK.")


if __name__ == "__main__":
    main()
