# Event Registration System

**CodeAlpha Backend Development Internship — Task 2**

A backend API for managing events and user registrations, built with **Node.js**, **Express.js**, and **SQLite** (via `better-sqlite3` — no separate database server needed).

## Features
- Create, list, view, update, and delete events
- Register users for events via a submission endpoint
- Automatic capacity tracking (spots left, "event full" checks)
- View / cancel a user's registrations
- View all attendees registered for a given event

## Tech Stack
- **Backend:** Express.js
- **Database:** SQLite (file-based, auto-created at `db/event_registration.db`)
- **Driver:** better-sqlite3

## Setup

```bash
npm install
npm start
```

The server runs at `http://localhost:5000`. The SQLite database file and tables are created automatically on first run — no manual setup required.

## Database Models

**events** — id, title, description, location, event_date, capacity, created_at
**users** — id, name, email (unique), created_at
**registrations** — id, event_id, user_id, status (`confirmed`/`cancelled`), registered_at

## API Endpoints

### Events
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/events` | Create an event |
| GET | `/api/events` | List all events (with spots left) |
| GET | `/api/events/:id` | Event details + attendee list |
| PUT | `/api/events/:id` | Update an event |
| DELETE | `/api/events/:id` | Delete an event |

**Create event example:**
```json
POST /api/events
{
  "title": "Tech Fest 2026",
  "description": "Annual college tech festival",
  "location": "Main Auditorium",
  "event_date": "2026-11-15T10:00:00",
  "capacity": 100
}
```

### Registrations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/registrations` | Register for an event |
| GET | `/api/registrations/user/:email` | View a user's registrations |
| GET | `/api/registrations/event/:eventId` | View attendees for an event |
| DELETE | `/api/registrations/:id` | Cancel a registration |

**Register example:**
```json
POST /api/registrations
{
  "event_id": 1,
  "name": "Arpita Pradhan",
  "email": "arpita@example.com"
}
```

## Notes
- `capacity: 0` means unlimited spots.
- Cancelling a registration sets its status to `cancelled` rather than deleting the row, preserving history; the user can re-register afterward.
- Users are matched/created by email automatically on registration — no separate signup step needed.

## Optional Enhancements (not implemented)
- Admin authentication for event organizers
- Email confirmation on registration
