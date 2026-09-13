import sqlite3
from pathlib import Path
import json


DB_PATH = Path("edge_queue.db")


def init_queue():
    conn = sqlite3.connect(DB_PATH)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS event_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def enqueue_event(event: dict):
    conn = sqlite3.connect(DB_PATH)

    conn.execute(
        "INSERT INTO event_queue (event_json) VALUES (?)",
        (json.dumps(event),)
    )

    conn.commit()
    conn.close()


def get_queued_events():
    conn = sqlite3.connect(DB_PATH)

    rows = conn.execute(
        "SELECT id, event_json FROM event_queue ORDER BY id"
    ).fetchall()

    conn.close()

    return [
        {
            "id": row[0],
            "event": json.loads(row[1])
        }
        for row in rows
    ]


def remove_event(queue_id: int):
    conn = sqlite3.connect(DB_PATH)

    conn.execute(
        "DELETE FROM event_queue WHERE id = ?",
        (queue_id,)
    )

    conn.commit()
    conn.close()