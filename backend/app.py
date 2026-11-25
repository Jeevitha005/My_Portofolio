import os, re, logging
from functools import wraps
import click
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from seed import PROJECTS, CONTENT

load_dotenv()
log = logging.getLogger("portfolio")
logging.basicConfig(level=logging.INFO)
db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$")
LIMITS = {"name": 100, "email": 254, "subject": 150, "message": 2000}


class Message(db.Model):
    __tablename__ = "contact_messages"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    ip = db.Column(db.String(45))
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


DUMMY_HASH = generate_password_hash("dummy-password-for-timing")


class Admin(db.Model):
    __tablename__ = "admin_users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    period = db.Column(db.String(60), nullable=False, default="")
    description = db.Column(db.Text, nullable=False)
    features = db.Column(db.JSON, nullable=False, default=list)
    stack = db.Column(db.JSON, nullable=False, default=list)
    image_url = db.Column(db.String(500), default="")
    github_url = db.Column(db.String(500), default="")
    demo_url = db.Column(db.String(500), default="")
    published = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {k: getattr(self, k) for k in ("id", "title", "period", "description", "features", "stack",
                "image_url", "github_url", "demo_url", "published")}


class Content(db.Model):
    __tablename__ = "site_content"
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.JSON, nullable=False)


def msg_dict(m):
    return dict(id=m.id, name=m.name, email=m.email, subject=m.subject, message=m.message,
                is_read=m.is_read, created_at=m.created_at.isoformat() if m.created_at else None)


def clean_project(d):
    e, o = {}, {}

    def s(k, mx, req=False):
        v = d.get(k)
        v = v.strip() if isinstance(v, str) else ""
        if req and not v:
            e[k] = "Required."
        elif len(v) > mx:
            e[k] = f"Max {mx} characters."
        o[k] = v
    s("title", 150, True); s("period", 60); s("description", 1000, True)
    for k in ("image_url", "github_url", "demo_url"):
        s(k, 500)
        if o[k] and not re.match(r"^https?://\S+$", o[k]):
            e[k] = "Must be an http(s) URL."
    for k, (n, mx) in {"features": (10, 300), "stack": (20, 40)}.items():
        v = d.get(k)
        if not isinstance(v, list) or len(v) > n or not all(isinstance(i, str) and 0 < len(i.strip()) <= mx for i in v):
            e[k] = f"Up to {n} items, each 1-{mx} characters."
        else:
            o[k] = [i.strip() for i in v]
    o["published"] = bool(d.get("published", True))
    return o, e


def clean_content(key, v):
    if key == "about":
        return (v.strip(), None) if isinstance(v, str) and 0 < len(v.strip()) <= 3000 else (None, "About text must be 1-3000 characters.")
    ok = isinstance(v, dict) and 0 < len(v) <= 30 and all(
        isinstance(k, str) and 0 < len(k) <= 60 and isinstance(l, list) and len(l) <= 30
        and all(isinstance(i, str) and 0 < len(i) <= 40 for i in l) for k, l in v.items())
    return (v, None) if ok else (None, "Skills must be categories with up to 30 short items each.")


def notify(m):
    """Send email via Resend. Returns True only if the provider accepted it."""
    key, to = os.environ.get("RESEND_API_KEY"), os.environ.get("NOTIFY_TO_EMAIL")
    if not key or not to:
        return False
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}"},
            json={"from": os.environ.get("NOTIFY_FROM_EMAIL", "onboarding@resend.dev"),
                  "to": [to], "reply_to": m.email,
                  "subject": f"Portfolio: {m.subject}"[:200],
                  "text": f"From: {m.name} <{m.email}>\n\n{m.message}"},
            timeout=8)
        return r.status_code < 300
    except requests.RequestException:
        log.exception("email notification failed")
        return False


def validate(d):
    errors = {}
    for f, mx in LIMITS.items():
        v = d.get(f)
        if not isinstance(v, str) or not v.strip():
            errors[f] = "This field is required."
        elif len(v.strip()) > mx:
            errors[f] = f"Maximum {mx} characters."
    if "email" not in errors and not EMAIL_RE.match(d["email"].strip()):
        errors["email"] = "Enter a valid email address."
    if "message" not in errors and len(d["message"].strip()) < 10:
        errors["message"] = "Message must be at least 10 characters."
    return errors


def create_app():
    app = Flask(__name__)
    prod = os.environ.get("FLASK_ENV") == "production"
    uri = os.environ.get("DATABASE_URL")
    if not uri:
        if prod:
            raise RuntimeError("DATABASE_URL must be set in production")
        uri = "sqlite:///dev.db"
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)
    app.config.update(SQLALCHEMY_DATABASE_URI=uri, MAX_CONTENT_LENGTH=16 * 1024,
                      SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True})
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or ("dev-only-insecure-key" if not prod else None)
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("SECRET_KEY must be set in production")
    origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").split(",")]
    CORS(app, resources={r"/api/*": {"origins": origins}}, methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    db.init_app(app)
    limiter.init_app(app)
    with app.app_context():
        db.create_all()  # same schema as schema.sql

    @app.after_request
    def headers(r):
        r.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                          "Referrer-Policy": "no-referrer", "Cache-Control": "no-store",
                          "Content-Security-Policy": "default-src 'none'"})
        return r

    @app.get("/api/health")
    def health():
        return jsonify(ok=True)

    @app.post("/api/contact")
    @limiter.limit("5 per hour")
    def contact():
        d = request.get_json(silent=True)
        if not isinstance(d, dict):
            return jsonify(ok=False, error="Invalid JSON body."), 400
        if d.get("website"):  # honeypot: bots fill hidden field; pretend success
            return jsonify(ok=True, notified=False), 201
        errors = validate(d)
        if errors:
            return jsonify(ok=False, errors=errors), 422
        m = Message(name=d["name"].strip(), email=d["email"].strip(), subject=d["subject"].strip(),
                    message=d["message"].strip(), ip=get_remote_address())
        try:
            db.session.add(m)
            db.session.commit()
        except Exception:
            db.session.rollback()
            log.exception("db write failed")
            return jsonify(ok=False, error="Could not save your message. Please try again later."), 500
        return jsonify(ok=True, notified=notify(m)), 201

    @app.errorhandler(429)
    def too_many(e):
        return jsonify(ok=False, error="Too many messages. Please try again later."), 429

    @app.errorhandler(404)
    def nf(e):
        return jsonify(ok=False, error="Not found."), 404

    ser = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="admin-token")

    def admin_required(f):
        @wraps(f)
        def w(*a, **k):
            h = request.headers.get("Authorization", "")
            try:
                uid = ser.loads(h[7:], max_age=8 * 3600)["id"] if h.startswith("Bearer ") else None
            except Exception:
                uid = None
            if not uid or not db.session.get(Admin, uid):
                return jsonify(ok=False, error="Unauthorized."), 401
            return f(*a, **k)
        return w

    def content_map():
        return {c.key: c.value for c in Content.query.all()}

    @app.get("/api/projects")
    def public_projects():
        return jsonify(ok=True, projects=[p.to_dict() for p in Project.query.filter_by(published=True).order_by(Project.id)])

    @app.get("/api/content")
    def public_content():
        return jsonify(ok=True, content=content_map())

    @app.post("/api/admin/login")
    @limiter.limit("10 per 15 minutes")
    def login():
        d = request.get_json(silent=True) or {}
        a = Admin.query.filter_by(email=str(d.get("email", "")).strip().lower()).first()
        good = check_password_hash(a.password_hash if a else DUMMY_HASH, str(d.get("password", "")))
        if not (a and good):
            return jsonify(ok=False, error="Incorrect email or password."), 401
        return jsonify(ok=True, token=ser.dumps({"id": a.id}))

    @app.get("/api/admin/stats")
    @admin_required
    def stats():
        ms = Message.query
        return jsonify(ok=True, projects=Project.query.count(), published=Project.query.filter_by(published=True).count(),
                       messages=ms.count(), unread=ms.filter_by(is_read=False).count(),
                       recent_messages=[msg_dict(m) for m in ms.order_by(Message.id.desc()).limit(5)],
                       recent_projects=[p.to_dict() for p in Project.query.order_by(Project.updated_at.desc()).limit(5)])

    @app.get("/api/admin/projects")
    @admin_required
    def a_projects():
        return jsonify(ok=True, projects=[p.to_dict() for p in Project.query.order_by(Project.id)])

    def save_project(p):
        o, e = clean_project(request.get_json(silent=True) or {})
        if e:
            return jsonify(ok=False, errors=e), 422
        for k, v in o.items():
            setattr(p, k, v)
        db.session.add(p)
        db.session.commit()
        return jsonify(ok=True, project=p.to_dict()), 200

    @app.post("/api/admin/projects")
    @admin_required
    def a_create():
        r = save_project(Project())
        return (r[0], 201) if r[1] == 200 else r

    @app.put("/api/admin/projects/<int:pid>")
    @admin_required
    def a_update(pid):
        p = db.session.get(Project, pid)
        return save_project(p) if p else (jsonify(ok=False, error="Not found."), 404)

    @app.delete("/api/admin/projects/<int:pid>")
    @admin_required
    def a_delete(pid):
        p = db.session.get(Project, pid)
        if not p:
            return jsonify(ok=False, error="Not found."), 404
        db.session.delete(p); db.session.commit()
        return jsonify(ok=True)

    @app.get("/api/admin/messages")
    @admin_required
    def a_messages():
        return jsonify(ok=True, messages=[msg_dict(m) for m in Message.query.order_by(Message.id.desc())])

    @app.patch("/api/admin/messages/<int:mid>")
    @admin_required
    def a_msg_read(mid):
        m, d = db.session.get(Message, mid), request.get_json(silent=True) or {}
        if not m:
            return jsonify(ok=False, error="Not found."), 404
        if not isinstance(d.get("is_read"), bool):
            return jsonify(ok=False, error="is_read must be true or false."), 422
        m.is_read = d["is_read"]; db.session.commit()
        return jsonify(ok=True, message=msg_dict(m))

    @app.delete("/api/admin/messages/<int:mid>")
    @admin_required
    def a_msg_delete(mid):
        m = db.session.get(Message, mid)
        if not m:
            return jsonify(ok=False, error="Not found."), 404
        db.session.delete(m); db.session.commit()
        return jsonify(ok=True)

    @app.get("/api/admin/content")
    @admin_required
    def a_content():
        return jsonify(ok=True, content=content_map())

    @app.put("/api/admin/content/<key>")
    @admin_required
    def a_content_put(key):
        if key not in ("about", "skills"):
            return jsonify(ok=False, error="Unknown content key."), 404
        v, err = clean_content(key, (request.get_json(silent=True) or {}).get("value"))
        if err:
            return jsonify(ok=False, error=err), 422
        row = db.session.get(Content, key) or Content(key=key, value=v)
        row.value = v; db.session.add(row); db.session.commit()
        return jsonify(ok=True)

    @app.cli.command("seed")
    def seed():
        """Load the initial projects/content from seed.py (only fills what is empty)."""
        if not Project.query.count():
            db.session.add_all(Project(**p) for p in PROJECTS)
        for k, v in CONTENT.items():
            if not db.session.get(Content, k):
                db.session.add(Content(key=k, value=v))
        db.session.commit(); click.echo("Seeded.")

    @app.cli.command("create-admin")
    @click.option("--email", envvar="ADMIN_EMAIL", prompt=True)
    @click.password_option(envvar="ADMIN_PASSWORD")
    def create_admin(email, password):
        """Create the admin, or reset its password if the email exists."""
        if len(password) < 12:
            raise click.ClickException("Password must be at least 12 characters.")
        email = email.strip().lower()
        a = Admin.query.filter_by(email=email).first() or Admin(email=email)
        a.password_hash = generate_password_hash(password)
        db.session.add(a); db.session.commit(); click.echo(f"Admin saved: {email}")

    return app


app = create_app()
if __name__ == "__main__":
    app.run(debug=not os.environ.get("FLASK_ENV") == "production")
