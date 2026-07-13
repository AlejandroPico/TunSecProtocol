from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "tunsec-protocol.sqlite"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.unlink(missing_ok=True)

    connection = sqlite3.connect(OUTPUT)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        for filename in ("schema.sql", "seed.sql"):
            sql = (ROOT / "database" / filename).read_text(encoding="utf-8")
            connection.executescript(sql)
        connection.execute("PRAGMA optimize")
        connection.commit()
        integrity = connection.execute("PRAGMA integrity_check").fetchone()
        if integrity is None or integrity[0] != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")
    finally:
        connection.close()

    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    print(f"Built {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} bytes, sha256={digest})")


if __name__ == "__main__":
    main()
