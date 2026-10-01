"""
Event Registration System - Backend API
Built with Flask + SQLite.

Run:
    python app.py
Then visit http://localhost:5000 for the site,
or hit the JSON API under /api/...
"""

from flask import Flask, jsonify, request, send_from_directory
from datetime import datetime
from functools import wraps
import os
import sqlite3

from database import get_db, init_db

app = Flask(__name__, static_folder="static", static_url_path="")

# Organizer key for protecting event-management actions (creating/editing/
# deleting events, viewing full attendee lists). Change this before deploying
# anywhere real:  export ADMIN_KEY="something-only-organizers-know"
ADMIN_KEY = os.environ.get("ADMIN_KEY", "letmein")


@app.after_request
def add_no_cache_headers(response):
    """Prevent the browser from caching the app shell or API responses."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def require_admin(fn):
    """Guard organizer-only endpoints behind a shared key sent as X-Admin-Key."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        supplied = request.headers.get("X-Admin-Key", "")
        if supplied != ADMIN_KEY:
            return error("Organizer key required or incorrect", 401)
        return fn(*args, **kwargs)
    return wrapper


@app.route("/api/login", methods=["POST"])
def login():
    """Check an organizer key without performing any action — used by the panel's login screen."""
    data = request.get_json(force=True) or {}
    if data.get("key") == ADMIN_KEY:
        return jsonify({"ok": True})
    return error("Incorrect organizer key", 401)


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]


def error(message, status=400):
    return jsonify({"error": message}), status


def event_with_counts(conn, event_row):
    data = row_to_dict(event_row)
    counts = conn.execute(
        """SELECT
             COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count
           FROM registrations WHERE event_id = ?""",
        (event_row["id"],),
    ).fetchone()
    confirmed = counts["confirmed_count"] or 0
    data["registered_count"] = confirmed
    data["spots_left"] = max(event_row["capacity"] - confirmed, 0)
    data["is_full"] = confirmed >= event_row["capacity"]
    return data


# ---------------------------------------------------------------------------
# Static / site
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ---------------------------------------------------------------------------
# Event endpoints
# ---------------------------------------------------------------------------

@app.route("/api/events", methods=["GET"])
def list_events():
    conn = get_db()
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    category = request.args.get("category")
    upcoming_only = request.args.get("upcoming")
    if category:
        query += " AND category = ?"
        params.append(category)
    if upcoming_only == "true":
        query += " AND event_date >= datetime('now')"
    query += " ORDER BY event_date ASC"
    events = conn.execute(query, params).fetchall()
    result = [event_with_counts(conn, e) for e in events]
    conn.close()
    return jsonify(result)


@app.route("/api/events/<int:event_id>", methods=["GET"])
def get_event(event_id):
    conn = get_db()
    event = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        conn.close()
        return error("Event not found", 404)
    data = event_with_counts(conn, event)
    conn.close()
    return jsonify(data)


@app.route("/api/events", methods=["POST"])
@require_admin
def create_event():
    data = request.get_json(force=True) or {}
    required = ["title", "event_date", "capacity"]
    missing = [f for f in required if f not in data]
    if missing:
        return error(f"Missing required fields: {', '.join(missing)}")
    try:
        capacity = int(data["capacity"])
        if capacity <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return error("'capacity' must be a positive whole number")

    conn = get_db()
    cur = conn.execute(
        """INSERT INTO events (title, description, location, category, event_date, capacity)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            data["title"],
            data.get("description", ""),
            data.get("location", ""),
            data.get("category", "general"),
            data["event_date"],
            capacity,
        ),
    )
    conn.commit()
    new_event = conn.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone()
    data_out = event_with_counts(conn, new_event)
    conn.close()
    return jsonify(data_out), 201


@app.route("/api/events/<int:event_id>", methods=["PUT"])
@require_admin
def update_event(event_id):
    data = request.get_json(force=True) or {}
    conn = get_db()
    existing = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not existing:
        conn.close()
        return error("Event not found", 404)

    fields = ["title", "description", "location", "category", "event_date", "capacity"]
    updates, params = [], []
    for f in fields:
        if f in data:
            updates.append(f"{f} = ?")
            params.append(data[f])
    if updates:
        params.append(event_id)
        conn.execute(f"UPDATE events SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    updated = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    data_out = event_with_counts(conn, updated)
    conn.close()
    return jsonify(data_out)


@app.route("/api/events/<int:event_id>", methods=["DELETE"])
@require_admin
def delete_event(event_id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not existing:
        conn.close()
        return error("Event not found", 404)
    try:
        conn.execute("DELETE FROM registrations WHERE event_id = ?", (event_id,))
        conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return error("Can't delete this event right now.", 409)
    conn.close()
    return jsonify({"deleted": event_id})


@app.route("/api/events/<int:event_id>/registrations", methods=["GET"])
@require_admin
def event_registrations(event_id):
    """Organizer view: full attendee list for one event."""
    conn = get_db()
    event = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        conn.close()
        return error("Event not found", 404)
    regs = conn.execute(
        """SELECT r.id, r.status, r.registered_at, a.name, a.email, a.phone
           FROM registrations r JOIN attendees a ON a.id = r.attendee_id
           WHERE r.event_id = ?
           ORDER BY r.registered_at""",
        (event_id,),
    ).fetchall()
    conn.close()
    return jsonify(rows_to_list(regs))


# ---------------------------------------------------------------------------
# Registration endpoints (public: anyone can register / view / cancel their own)
# ---------------------------------------------------------------------------

@app.route("/api/registrations", methods=["POST"])
def create_registration():
    """
    Register for an event.
    Body: { "event_id": 1, "name": "...", "email": "...", "phone": "..." }

    Creates the attendee record if it doesn't exist (matched by email),
    checks capacity, and prevents duplicate registrations for the same
    event + email.
    """
    data = request.get_json(force=True) or {}
    required = ["event_id", "name", "email"]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        return error(f"Missing required fields: {', '.join(missing)}")

    conn = get_db()
    try:
        event = conn.execute("SELECT * FROM events WHERE id = ?", (data["event_id"],)).fetchone()
        if not event:
            return error("Event not found", 404)

        # find or create the attendee
        attendee = conn.execute(
            "SELECT * FROM attendees WHERE email = ?", (data["email"],)
        ).fetchone()
        if attendee:
            attendee_id = attendee["id"]
        else:
            cur = conn.execute(
                "INSERT INTO attendees (name, email, phone) VALUES (?, ?, ?)",
                (data["name"], data["email"], data.get("phone", "")),
            )
            attendee_id = cur.lastrowid

        # duplicate check
        existing_reg = conn.execute(
            "SELECT * FROM registrations WHERE event_id = ? AND attendee_id = ?",
            (data["event_id"], attendee_id),
        ).fetchone()
        if existing_reg and existing_reg["status"] == "confirmed":
            return error("You're already registered for this event.", 409)

        # capacity check
        confirmed_count = conn.execute(
            "SELECT COUNT(*) AS c FROM registrations WHERE event_id = ? AND status = 'confirmed'",
            (data["event_id"],),
        ).fetchone()["c"]
        if confirmed_count >= event["capacity"]:
            return error("Sorry, this event is full.", 409)

        if existing_reg:
            # re-confirm a previously cancelled registration
            conn.execute(
                "UPDATE registrations SET status = 'confirmed', registered_at = datetime('now') WHERE id = ?",
                (existing_reg["id"],),
            )
            reg_id = existing_reg["id"]
        else:
            cur = conn.execute(
                "INSERT INTO registrations (event_id, attendee_id) VALUES (?, ?)",
                (data["event_id"], attendee_id),
            )
            reg_id = cur.lastrowid

        conn.commit()
        new_reg = conn.execute(
            """SELECT r.id, r.status, r.registered_at, e.title AS event_title,
                      a.name, a.email
               FROM registrations r
               JOIN events e ON e.id = r.event_id
               JOIN attendees a ON a.id = r.attendee_id
               WHERE r.id = ?""",
            (reg_id,),
        ).fetchone()
        return jsonify(row_to_dict(new_reg)), 201
    finally:
        conn.close()


@app.route("/api/registrations", methods=["GET"])
def list_registrations():
    """Public: look up your own registrations by email. Organizers (with the
    key) can omit the email filter to see everything."""
    email = request.args.get("email")
    conn = get_db()
    query = """SELECT r.id, r.status, r.registered_at, r.event_id,
                      e.title AS event_title, e.event_date, e.location,
                      a.name, a.email
               FROM registrations r
               JOIN events e ON e.id = r.event_id
               JOIN attendees a ON a.id = r.attendee_id
               WHERE 1=1"""
    params = []
    if email:
        query += " AND a.email = ?"
        params.append(email)
    else:
        supplied = request.headers.get("X-Admin-Key", "")
        if supplied != ADMIN_KEY:
            conn.close()
            return error("Provide ?email= to look up your registrations", 400)
    query += " ORDER BY r.registered_at DESC"
    regs = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(regs))


@app.route("/api/registrations/<int:reg_id>/cancel", methods=["PUT"])
def cancel_registration(reg_id):
    """Public: cancel a registration. Requires the matching email as a
    lightweight check that the requester owns this registration."""
    data = request.get_json(force=True) or {}
    conn = get_db()
    reg = conn.execute(
        """SELECT r.*, a.email FROM registrations r
           JOIN attendees a ON a.id = r.attendee_id WHERE r.id = ?""",
        (reg_id,),
    ).fetchone()
    if not reg:
        conn.close()
        return error("Registration not found", 404)

    supplied_key = request.headers.get("X-Admin-Key", "")
    is_admin = supplied_key == ADMIN_KEY
    if not is_admin and data.get("email", "").lower() != reg["email"].lower():
        conn.close()
        return error("Email doesn't match this registration.", 403)

    conn.execute("UPDATE registrations SET status = 'cancelled' WHERE id = ?", (reg_id,))
    conn.commit()
    updated = conn.execute("SELECT * FROM registrations WHERE id = ?", (reg_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(updated))


@app.route("/api/registrations/<int:reg_id>", methods=["DELETE"])
@require_admin
def delete_registration(reg_id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM registrations WHERE id = ?", (reg_id,)).fetchone()
    if not existing:
        conn.close()
        return error("Registration not found", 404)
    conn.execute("DELETE FROM registrations WHERE id = ?", (reg_id,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": reg_id})


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

@app.route("/api/reports/summary", methods=["GET"])
@require_admin
def reports_summary():
    conn = get_db()
    events = conn.execute("SELECT * FROM events ORDER BY event_date ASC").fetchall()
    summary = []
    total_registrations = 0
    for e in events:
        d = event_with_counts(conn, e)
        summary.append(d)
        total_registrations += d["registered_count"]
    conn.close()
    return jsonify({
        "total_events": len(events),
        "total_registrations": total_registrations,
        "events": summary,
    })


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
