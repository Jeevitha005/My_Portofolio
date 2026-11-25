import os
os.environ["DATABASE_URL"] = "sqlite://"; os.environ["SECRET_KEY"] = "test"
import pytest
from app import app, db, limiter, Admin, Message, generate_password_hash
limiter.enabled = False
PW = "correct-horse-battery"
GOOD = dict(name="Ann", email="ann@example.com", subject="Hi", message="Hello there, great portfolio.")
PROJ = dict(title="P", period="2026", description="d", features=["a"], stack=["x"], published=True)


@pytest.fixture
def c():
    with app.app_context():
        db.drop_all(); db.create_all()
        db.session.add(Admin(email="a@x.com", password_hash=generate_password_hash(PW))); db.session.commit()
    return app.test_client()


def H(c):
    return {"Authorization": "Bearer " + c.post("/api/admin/login", json={"email": "a@x.com", "password": PW}).json["token"]}


def test_health(c):
    assert c.get("/api/health").json["ok"]


def test_contact_validation_and_persist(c):
    assert c.post("/api/contact", json={**GOOD, "email": "bad"}).status_code == 422
    assert c.post("/api/contact", json={**GOOD, "message": "x" * 2001}).status_code == 422
    assert c.post("/api/contact", data="nope").status_code == 400
    r = c.post("/api/contact", json=GOOD)
    assert r.status_code == 201 and r.json["notified"] is False
    with app.app_context():
        assert Message.query.count() == 1
    assert c.post("/api/contact", json={**GOOD, "website": "spam"}).status_code == 201
    with app.app_context():
        assert Message.query.count() == 1  # honeypot not stored


@pytest.mark.parametrize("method,path", [("get", "/stats"), ("get", "/projects"), ("post", "/projects"), ("put", "/projects/1"),
    ("delete", "/projects/1"), ("get", "/messages"), ("patch", "/messages/1"), ("delete", "/messages/1"),
    ("get", "/content"), ("put", "/content/about")])
def test_admin_requires_auth(c, method, path):
    assert getattr(c, method)("/api/admin" + path).status_code == 401
    assert getattr(c, method)("/api/admin" + path, headers={"Authorization": "Bearer forged"}).status_code == 401


def test_login(c):
    assert c.post("/api/admin/login", json={"email": "a@x.com", "password": "wrong"}).status_code == 401
    assert c.post("/api/admin/login", json={"email": "no@x.com", "password": PW}).status_code == 401
    assert H(c)


def test_project_lifecycle(c):
    h = H(c)
    assert c.post("/api/admin/projects", json={**PROJ, "title": ""}, headers=h).status_code == 422
    assert c.post("/api/admin/projects", json={**PROJ, "demo_url": "javascript:alert(1)"}, headers=h).status_code == 422
    pid = c.post("/api/admin/projects", json=PROJ, headers=h).json["project"]["id"]
    assert len(c.get("/api/projects").json["projects"]) == 1
    assert c.put(f"/api/admin/projects/{pid}", json={**PROJ, "title": "New", "published": False}, headers=h).json["project"]["title"] == "New"
    assert c.get("/api/projects").json["projects"] == []  # unpublished hidden
    assert len(c.get("/api/admin/projects", headers=h).json["projects"]) == 1
    assert c.delete(f"/api/admin/projects/{pid}", headers=h).status_code == 200
    assert c.delete(f"/api/admin/projects/{pid}", headers=h).status_code == 404


def test_messages_and_content(c):
    h = H(c); c.post("/api/contact", json=GOOD)
    m = c.get("/api/admin/messages", headers=h).json["messages"]
    assert len(m) == 1 and not m[0]["is_read"]
    assert c.patch(f"/api/admin/messages/{m[0]['id']}", json={"is_read": True}, headers=h).json["message"]["is_read"]
    assert c.get("/api/admin/stats", headers=h).json["unread"] == 0
    assert c.delete(f"/api/admin/messages/{m[0]['id']}", headers=h).status_code == 200
    assert c.put("/api/admin/content/about", json={"value": "Hello"}, headers=h).status_code == 200
    assert c.put("/api/admin/content/skills", json={"value": {"A": ["x"]}}, headers=h).status_code == 200
    assert c.put("/api/admin/content/skills", json={"value": "bad"}, headers=h).status_code == 422
    assert c.get("/api/content").json["content"]["about"] == "Hello"
