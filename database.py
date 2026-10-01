"""
database.py
Handles SQLite connection, schema creation, and seed data for the
Event Registration System.
"""

import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "events.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    event_date TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id),
    attendee_id INTEGER NOT NULL REFERENCES attendees(id),
    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(event_id, attendee_id)
);
"""


def get_db():
    """Return a new SQLite connection with foreign keys enabled and Row access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(seed: bool = True):
    """Create tables if they don't exist, and optionally seed sample data."""
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.commit()

    if seed:
        cur = conn.execute("SELECT COUNT(*) AS c FROM events")
        if cur.fetchone()["c"] == 0:
            _seed(conn)

    conn.close()


def _seed(conn):
    now = datetime.now()

    events = [
        (
            "Intro to Machine Learning Workshop",
            "A hands-on workshop covering the fundamentals of ML, from linear regression to neural networks.",
            "Tech Hub, Room 204",
            "workshop",
            (now + timedelta(days=7)).replace(hour=14, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S"),
            40,
        ),
        (
            "Startup Pitch Night",
            "Local founders pitch their startups to a panel of investors. Networking reception follows.",
            "Innovation Center Auditorium",
            "networking",
            (now + timedelta(days=14)).replace(hour=18, minute=30, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S"),
            120,
        ),
        (
            "Campus Coding Marathon",
            "24-hour hackathon open to all students. Prizes for top 3 teams.",
            "Engineering Building, Main Hall",
            "hackathon",
            (now + timedelta(days=21)).replace(hour=9, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S"),
            80,
        ),
        (
            "Career Fair: Tech & Design",
            "Meet recruiters from top tech and design companies. Bring your resume!",
            "Student Union Ballroom",
            "career",
            (now + timedelta(days=10)).replace(hour=10, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S"),
            250,
        ),
        (
            "Photography Walk: Golden Hour",
            "A relaxed evening photo walk through downtown, open to all skill levels.",
            "Meet at City Square Fountain",
            "workshop",
            (now + timedelta(days=4)).replace(hour=17, minute=30, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M:%S"),
            25,
        ),
    ]
    conn.executemany(
        """INSERT INTO events (title, description, location, category, event_date, capacity)
           VALUES (?, ?, ?, ?, ?, ?)""",
        events,
    )

    # a couple of sample registrations
    conn.execute(
        "INSERT INTO attendees (name, email, phone) VALUES (?, ?, ?)",
        ("Jordan Lee", "jordan.lee@example.com", "555-0101"),
    )
    attendee_id = conn.execute(
        "SELECT id FROM attendees WHERE email = ?", ("jordan.lee@example.com",)
    ).fetchone()["id"]
    event_id = conn.execute(
        "SELECT id FROM events WHERE title = ?", ("Intro to Machine Learning Workshop",)
    ).fetchone()["id"]
    conn.execute(
        "INSERT INTO registrations (event_id, attendee_id) VALUES (?, ?)",
        (event_id, attendee_id),
    )

    conn.commit()


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
