# Jeevitha J — Portfolio (React + Flask + MySQL/PostgreSQL)

## Layout
- `frontend/` React + Vite. Edit content in `src/data.js` (append to `projects` to add one). Resume PDF: `public/Jeevitha_J_Resume.pdf` (already included; replace the file, keep the name).
- `backend/` Flask API: `POST /api/contact`, `GET /api/health`. Schema: `schema.sql`.

## Run locally
```bash
cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt && cp .env.example .env && python app.py   # no DATABASE_URL => local SQLite (dev only)
cd ../frontend && cp .env.example .env && npm install && npm run dev
```

## Deploy backend (Render, Railway, or any Python host)
1. Create a managed MySQL or PostgreSQL database (e.g. Railway, Aiven, Neon/Supabase for Postgres). Run `schema.sql` (MySQL) — Postgres tables are created automatically on first start.
2. New web service from `backend/`: build `pip install -r requirements.txt`, start `gunicorn app:app`.
3. Set env vars: `FLASK_ENV=production`, `DATABASE_URL`, `FRONTEND_ORIGIN=https://<your-site>.netlify.app` (no trailing slash), and optionally the email vars below.
4. Free tiers often sleep when idle (first request is slow) and free databases may expire — check your provider's terms so messages persist.

## Email notifications (optional)
Create a free Resend account, set `RESEND_API_KEY`, `NOTIFY_TO_EMAIL` (your inbox). Until set, messages are saved to the database only; the API returns `notified:false`. Free Resend sandbox sender can only email your own account address.

## Deploy frontend (Netlify)
Base directory `frontend`, build `npm run build`, publish `dist`. Set `VITE_API_URL` to your backend URL (e.g. `https://your-api.onrender.com`). `netlify.toml` handles SPA routing and headers. Then redeploy.

## Admin dashboard
Open `https://<your-site>/#/admin`. Auth uses a signed bearer token (8 h, kept in sessionStorage, no cookies, so CSRF does not apply). Passwords are hashed (Werkzeug); login is limited to 10 tries / 15 min. "Sign out" discards the token in the browser; tokens are stateless, so rotate `SECRET_KEY` to invalidate all sessions.

1. First run (in `backend/`, env vars set): `flask --app app seed` loads your resume projects/skills/about text into the database once.
2. Create the admin: `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-12+-char-passphrase' flask --app app create-admin` (or run it without the vars to be prompted). Then delete the password from your shell/environment.
3. Change the password later: run `create-admin` again with the same email and a new password.
4. Add a project: Projects → Add project, fill in the form, keep "Published" ticked. It shows on the public site immediately. Drafts stay private. Content tab edits About and Skills.

Experience, education and certifications are still in `frontend/src/data.js` (rarely change; edit and redeploy).

## Tests
`cd backend && pip install -r requirements-dev.txt && pytest` (in-memory SQLite; covers contact, auth, CRUD, publish visibility, messages, content).

## Status
Not yet executed (no network in the build sandbox to install dependencies): pytest, `npm run build`, browser/responsive checks, a real MySQL/Postgres run, and live email. Run them locally first. Migrations: tables are created by `db.create_all()` on start (equivalent MySQL DDL in `schema.sql`); there is no Alembic history, so future schema changes need manual SQL.
