import { useEffect, useState } from "react";
import { Github, Linkedin, Mail, Download, FileText, Menu, X, Loader2, Phone } from "lucide-react";
import { profile, experience, education, certs } from "./data";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const RESUME = "/Jeevitha_J_Resume.pdf";
const NAV = ["About", "Skills", "Projects", "Experience", "Education", "Contact"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

function Contact() {
  const empty = { name: "", email: "", subject: "", message: "", website: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState({});
  const [state, setState] = useState({ s: "idle", msg: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const check = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Enter your name.";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address.";
    if (!f.subject.trim()) e.subject = "Enter a subject.";
    if (f.message.trim().length < 10) e.message = "Write at least 10 characters.";
    return e;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    const e = check(); setErr(e);
    if (Object.keys(e).length) return;
    setState({ s: "loading", msg: "" });
    try {
      const r = await fetch(`${API}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setState({ s: "ok", msg: "Message sent. I'll reply to your email address." }); setF(empty); }
      else { if (d.errors) setErr(d.errors); setState({ s: "fail", msg: d.error || "Please fix the highlighted fields." }); }
    } catch { setState({ s: "fail", msg: "Couldn't reach the server. Check your connection or email me directly." }); }
  };
  const field = (k, label, type = "text", area) => (
    <div className="field">
      <label htmlFor={k}>{label}</label>
      {area ? <textarea id={k} rows="5" maxLength="2000" value={f[k]} onChange={set(k)} aria-invalid={!!err[k]} />
            : <input id={k} type={type} maxLength={k === "email" ? 254 : 150} value={f[k]} onChange={set(k)} aria-invalid={!!err[k]} />}
      {err[k] && <p className="error" role="alert">{err[k]}</p>}
    </div>);
  return (
    <form onSubmit={submit} noValidate className="card form">
      {field("name", "Full name")}{field("email", "Email address", "email")}{field("subject", "Subject")}{field("message", "Message", "text", true)}
      <input className="hp" tabIndex="-1" autoComplete="off" aria-hidden="true" value={f.website} onChange={set("website")} />
      <button className="btn primary" disabled={state.s === "loading"}>
        {state.s === "loading" ? <><Loader2 className="spin" size={18} /> Sending</> : "Send message"}
      </button>
      <p className={`status ${state.s}`} role="status">{state.msg}</p>
    </form>);
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [proj, setProj] = useState({ s: "loading", list: [] });
  const [content, setContent] = useState(null);
  useEffect(() => {
    const j = (p) => fetch(`${API}/api/${p}`).then((r) => (r.ok ? r.json() : Promise.reject()));
    j("projects").then((d) => setProj({ s: "ok", list: d.projects })).catch(() => setProj({ s: "error", list: [] }));
    j("content").then((d) => setContent(d.content)).catch(() => setContent({ about: "", skills: {} }));
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add("in")), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const p = sel !== null ? proj.list[sel] : null;

  return (<>
    <header className="nav">
      <a href="#top" className="mark">jeevitha<span>.dev</span></a>
      <button className="menu" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? "open" : ""}>
        {NAV.map((n) => <a key={n} href={`#${n.toLowerCase()}`} onClick={() => setOpen(false)}>{n}</a>)}
        <a className="btn small" href={RESUME} target="_blank" rel="noopener noreferrer">Resume</a>
      </nav>
    </header>

    <main id="top">
      <section className="hero">
        <div className="grid-bg" aria-hidden="true" />
        <p className="kicker">Final-year CSE student · Software Developer</p>
        <h1>Jeevitha J<br /><span className="grad">writes software that holds up.</span></h1>
        <p className="lead">{profile.summary}</p>
        <div className="row">
          <a className="btn primary" href="#projects">Explore My Projects</a>
          <a className="btn" href={RESUME} download="Jeevitha_J_Resume.pdf"><Download size={18} /> Download Resume</a>
          <a className="btn ghost" href="#contact">Contact Me</a>
        </div>
        <div className="row social">
          <a href={profile.github} aria-label="GitHub" target="_blank" rel="noopener noreferrer"><Github /></a>
          <a href={profile.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><Linkedin /></a>
        </div>
      </section>

      <section id="about" className="sec reveal">
        <h2>About</h2>
        {!content && <p className="note">Loading…</p>}
        {(content?.about || "").split("\n\n").filter(Boolean).map((t) => <p key={t}>{t}</p>)}
        <div className="row"><a className="btn" href={RESUME} target="_blank" rel="noopener noreferrer"><FileText size={18} /> View Resume</a></div>
      </section>

      <section id="skills" className="sec reveal">
        <h2>Skills</h2>
        <div className="skills">{!content ? <p className="note">Loading…</p> : Object.entries(content.skills).map(([c, l]) => (
          <div className="card" key={c}><h3>{c}</h3><ul className="chips">{l.map((s) => <li key={s}>{s}</li>)}</ul></div>))}</div>
      </section>

      <section id="projects" className="sec reveal">
        <h2>Projects</h2>
        <div className="projects">{proj.s === "loading" && <p className="note">Loading projects…</p>}{proj.s === "error" && <p className="status fail">Projects couldn't be loaded. Please try again shortly.</p>}{proj.s === "ok" && !proj.list.length && <p className="note">No projects published yet.</p>}{proj.list.map((x, i) => (
          <button className="card proj" key={x.id} onClick={() => setSel(i)}>{x.image_url && <img className="thumb" src={x.image_url} alt="" loading="lazy" />}
            <span className="period">{x.period}</span><h3>{x.title}</h3><p>{x.description}</p>
            <ul className="chips">{x.stack.slice(0, 4).map((s) => <li key={s}>{s}</li>)}{x.stack.length > 4 && <li>+{x.stack.length - 4}</li>}</ul>
          </button>))}</div>
        <p className="note">More code on <a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
      </section>

      <section id="experience" className="sec reveal">
        <h2>Experience</h2>
        <ol className="timeline">{experience.map((e) => (
          <li key={e.org}><span className="period">{e.period} · {e.place}</span><h3>{e.role}, {e.org}</h3>
            <ul>{e.points.map((t) => <li key={t}>{t}</li>)}</ul></li>))}</ol>
      </section>

      <section id="education" className="sec reveal">
        <h2>Education</h2>
        {education.map((e) => <div className="card edu" key={e.degree}><span className="period">{e.period}</span><h3>{e.degree}</h3><p>{e.school}{e.note && ` · ${e.note}`}</p></div>)}
        <h2 className="sub">Certifications</h2>
        <div className="skills">{certs.map((c) => <div className="card" key={c.name}><h3>{c.name}</h3><p>{c.by}</p><span className="period">{c.date}</span></div>)}</div>
      </section>

      <section id="contact" className="sec reveal">
        <h2>Contact</h2>
        <p>Hiring or want to talk about a project? Send a message or reach me directly.</p>
        <p className="direct"><a href={`mailto:${profile.email}`}><Mail size={16} /> {profile.email}</a> <a href={`tel:${profile.phone}`}><Phone size={16} /> {profile.phone}</a></p>
        <Contact />
      </section>
    </main>
    <footer>© {new Date().getFullYear()} Jeevitha J</footer>

    {p && <div className="modal" role="dialog" aria-modal="true" aria-label={p.title} onClick={() => setSel(null)}>
      <div className="card sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Close" onClick={() => setSel(null)}><X /></button>
        <span className="period">{p.period}</span><h3>{p.title}</h3><p>{p.description}</p>
        <ul>{p.features.map((t) => <li key={t}>{t}</li>)}</ul>
        <ul className="chips">{p.stack.map((s) => <li key={s}>{s}</li>)}</ul>
        {(p.github_url || p.demo_url) && <div className="row" style={{ marginTop: "1rem" }}>{p.github_url && <a className="btn small" href={p.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}{p.demo_url && <a className="btn small" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}</div>}
      </div></div>}
  </>);
}
