<div align="center">

# 🎟️ Event Registration System

**A full-stack event registration platform — browse, register, and manage your spot.**

Built with **Flask** · **SQLite** · Vanilla JS
*CodeAlpha Backend Development Internship — Task 2*

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-07405E?logo=sqlite&logoColor=white)

</div>

---

## ✨ Overview

A backend for browsing events, registering, and managing your own
registrations. Includes a public event site anyone can use **without an
account**, plus an organizer panel (behind a login) for creating events and
viewing attendees.

| For attendees | For organizers |
|---|---|
| 🔎 Browse upcoming events | ➕ Create / delete events |
| 📝 Register with just name + email | 👥 View full attendee lists |
| 📋 View & cancel your own registrations | 📊 Reports — fill rate per event |

---

## 🧩 Features

- **Backend**: Flask (Python) managing all routes and logic
- **Database models**: `events`, `attendees`, and `registrations` — cleanly
  linking attendees to the events they've signed up for
- **Public APIs**: view the event list, event details, and submit
  registration forms — no login required
- **Self-service registration management**: attendees view and cancel
  their own registrations by email, no account needed
- **Organizer panel** *(optional extra)*: a shared-key login gating event
  creation/editing/deletion and the attendee/reports views

---

## 📁 Project Structure

```
event-registration-system/
├── app.py              # Flask app — all API routes
├── database.py          # Schema + seed data (SQLite)
├── requirements.txt
├── static/
│   └── index.html        # Public site + organizer panel (served at /)
└── events.db              # created automatically on first run
```

---

## 🚀 Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open **http://localhost:5000** 🎉

Five sample events and one sample registration are seeded automatically
the first time you run it.

---

## 🔐 Organizer Login

Creating/editing/deleting events and viewing attendee lists is behind a
shared key, checked against the `X-Admin-Key` header.

| | |
|---|---|
| **Default key** | `letmein` |
| **Change it** | `export ADMIN_KEY="your-key-here"` before starting the server |

Click **Organizer Login** in the site header to unlock the Manage Events,
Attendees, and Reports tabs. Browsing and registering is always open —
no key needed.

---

## 📡 API Reference

### Events
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List events — includes `registered_count`, `spots_left`, `is_full` |
| `GET` | `/api/events/<id>` | One event's full details |
| `POST` | `/api/events` 🔒 | Create — `{title, event_date, capacity, description?, location?, category?}` |
| `PUT` | `/api/events/<id>` 🔒 | Update any field |
| `DELETE` | `/api/events/<id>` 🔒 | Delete event (and its registrations) |
| `GET` | `/api/events/<id>/registrations` 🔒 | Full attendee list for one event |

### Registrations
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/registrations` | `{event_id, name, email, phone?}` — blocks duplicates & over-capacity signups |
| `GET` | `/api/registrations?email=` | Look up your own registrations |
| `PUT` | `/api/registrations/<id>/cancel` | `{email}` — cancel your own registration |
| `DELETE` | `/api/registrations/<id>` 🔒 | Organizer hard-delete |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/summary` 🔒 | Totals + per-event fill-rate breakdown |

🔒 = requires the `X-Admin-Key` header

---

## 💡 Example: Registering for an Event

```bash
curl -X POST http://localhost:5000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "name": "Alex Kim", "email": "alex@example.com"}'
```

If the event is full or you're already registered, the API returns `409`
with a clear error message.

---

## 📝 Notes

- SQLite keeps this dependency-free and easy to demo
- Registrations are matched to attendees by email — no passwords, no
  accounts. Cancelling requires the same email used to register (or the
  organizer key) — a lightweight-but-real ownership check

---

<div align="center">

Built as part of the **CodeAlpha Backend Development Internship**

</div>
