# CodeAlpha_EventRegistrationSystem

A backend for browsing events, registering, and managing your own
registrations — built with **Flask** and **SQLite**. Includes a public
event site plus an organizer panel (behind a login) for creating events
and viewing attendees.

## Features (per task brief)

- **Backend**: Flask (Python) managing routes and logic.
- **Database models**: events, attendees, and registrations (linking
  attendees to events, with a status of confirmed/cancelled).
- **APIs**: view event list, event details, and submit registration forms.
- **Registration management**: attendees can view and cancel their own
  registrations by email — no account needed.
- **Optional extras implemented**: an organizer login (shared key) that
  gates event creation/editing/deletion and the attendee/reports views,
  plus a small admin panel for all of that.

## Project structure

```
event-registration-system/
├── app.py           # Flask app: all API routes
├── database.py       # Schema + seed data (SQLite)
├── requirements.txt
├── static/
│   └── index.html    # Public site + organizer panel (served at /)
└── events.db          # created automatically on first run
```

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The server starts at **http://localhost:5000**.
- Visit `/` to browse events and register.
- Hit `/api/...` for the JSON API directly.

Five sample events and one sample registration are seeded automatically
the first time you run `python app.py`.

## Organizer login

Creating/editing/deleting events and viewing attendee lists is behind a
shared key, checked against the `X-Admin-Key` header.

- **Default key:** `letmein`
- **Change it** with an environment variable before starting the server:
  ```bash
  export ADMIN_KEY="something-only-organizers-know"
  python app.py
  ```
- Click **Organizer Login** in the site header to unlock the Manage
  Events, Attendees, and Reports tabs. Browsing and registering for
  events never requires this key — that's open to everyone.

## API reference

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | List events (`?category=`, `?upcoming=true`) — includes `registered_count`, `spots_left`, `is_full` |
| GET | `/api/events/<id>` | One event's details with the same counts |
| POST | `/api/events` 🔒 | Create — `{title, event_date, capacity, description?, location?, category?}` |
| PUT | `/api/events/<id>` 🔒 | Update any field |
| DELETE | `/api/events/<id>` 🔒 | Delete event (and its registrations) |
| GET | `/api/events/<id>/registrations` 🔒 | Full attendee list for one event |

### Registrations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/registrations` | `{event_id, name, email, phone?}` — creates the attendee if new, blocks duplicates and over-capacity signups |
| GET | `/api/registrations?email=` | Look up your own registrations |
| PUT | `/api/registrations/<id>/cancel` | `{email}` — cancel your own registration (email must match) |
| DELETE | `/api/registrations/<id>` 🔒 | Organizer hard-delete |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/summary` 🔒 | Total events/registrations, and a per-event breakdown with fill rate |

🔒 = requires the `X-Admin-Key` header.

## Example: registering for an event

```bash
curl -X POST http://localhost:5000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "name": "Alex Kim", "email": "alex@example.com"}'
```

If the event is full or you're already registered, the API returns `409`
with a clear message.

## Notes

- SQLite keeps this dependency-free and easy to demo.
- Registrations are matched to attendees by email — no passwords, no
  accounts. Cancelling requires the same email used to register (or the
  organizer key), which is a lightweight-but-real ownership check.
