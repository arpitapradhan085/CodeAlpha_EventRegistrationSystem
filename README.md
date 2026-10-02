# Simple URL Shortener — CodeAlpha Task 1

A minimal backend URL shortener built with **Flask** and **SQLite**, matching every requirement in the task brief.

## How it maps to the task checklist

| Requirement | Where it's implemented |
|---|---|
| Backend server using Flask | `app.py` |
| API endpoint to accept long URLs + generate a short code | `POST /api/shorten` |
| Store mapping in a database | SQLite table `urls` (created automatically) |
| Redirect route | `GET /<short_code>` |
| Optional frontend | `templates/index.html`, served at `/` |

Bonus (not required, but included): `GET /api/stats/<short_code>` returns click count and creation time.

## Step-by-step: how it works

1. **Database (SQLite)** — `init_db()` creates a `urls` table with columns:
   `id, short_code, original_url, clicks, created_at`. It runs automatically the first time you start the app.

2. **Shortening a URL** — When you `POST` a URL to `/api/shorten`:
   - The URL is validated (must start with `http://` or `https://`).
   - If that exact URL was shortened before, the existing code is reused.
   - Otherwise, a random 6-character alphanumeric code is generated (`generate_short_code`), checked for uniqueness against the database, and saved.
   - The endpoint returns the short code, the full short URL, and the original URL as JSON.

3. **Redirecting** — When someone visits `/<short_code>`:
   - The app looks up `short_code` in the database.
   - If found, it increments the click counter and issues an HTTP redirect (302) to the original URL.
   - If not found, it returns a 404 JSON error.

4. **Frontend** — `/` serves a simple HTML page with a text box and button. It calls the `/api/shorten` API with `fetch()` and displays the resulting short link, which you can click directly.

## How to run it

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open in your browser
http://127.0.0.1:5000/
```

The database file `urls.db` will be created automatically in the project folder on first run.

## Trying the API directly (without the frontend)

```bash
# Shorten a URL
curl -X POST http://127.0.0.1:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com/some/very/long/path"}'

# Response:
# {"short_code": "aB3xY9", "short_url": "http://127.0.0.1:5000/aB3xY9", "original_url": "..."}

# Visit the short URL (redirects to the original)
curl -L http://127.0.0.1:5000/aB3xY9

# Check click stats
curl http://127.0.0.1:5000/api/stats/aB3xY9
```

## Project structure

```
url_shortener/
├── app.py              # Flask backend (routes, DB logic, short-code generation)
├── templates/
│   └── index.html      # Basic frontend
├── requirements.txt    # Python dependencies
├── urls.db             # SQLite database (auto-created on first run)
└── README.md
```

## For your CodeAlpha submission

1. `git init` this folder, commit, and push it to GitHub as `CodeAlpha_SimpleURLShortener` (or similar naming per instructions).
2. Record a short video walking through: starting the server, shortening a URL, and clicking the resulting short link to show the redirect.
3. Post on LinkedIn tagging **@CodeAlpha** with the GitHub link.
4. Submit via the CodeAlpha submission form.
