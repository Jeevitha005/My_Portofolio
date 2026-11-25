import { useEffect, useState } from "react";
import { LayoutDashboard, FolderKanban, Mail, FileText, LogOut, Loader2 } from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const tok = () => sessionStorage.getItem("admin_token");
async function call(path, method = "GET", body) {
  const r = await fetch(`${API}/api/admin${path}`, { method, headers: { "Content-Type": "application/json", ...(tok() && { Authorization: `Bearer ${tok()}` }) }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== "/login") { sessionStorage.removeItem("admin_token"); location.reload(); }
  if (!r.ok) throw d;
  return d;
}
const errText = (e) => e?.error || (e?.errors && Object.entries(e.errors).map(([k, v]) => `${k}: ${v}`).join(" ")) || "Request failed. Check your connection.";
const fmt = (s) => (s ? new Date(s + (s.endsWith("Z") || s.includes("+") ? "" : "Z")).toLocaleString() : "");

function useLoad(path) {
  const [s, setS] = useState({ data: null, err: "", loading: true });
  const load = () => { setS((x) => ({ ...x, loading: true })); call(path).then((d) => setS({ data: d, err: "", loading: false })).catch((e) => setS({ data: null, err: errText(e), loading: false })); };
  useEffect(() => { load(); }, [path]);
  return { ...s, reload: load };
}
const State = ({ loading, err, reload }) => loading ? <p className="note"><Loader2 className="spin" size={16} /> Loading…</p>
  : err ? <p className="status fail">{err} <button className="btn small" onClick={reload}>Retry</button></p> : null;

function Login({ onIn }) {
  const [f, setF] = useState({ email: "", password: "" }); const [e, setE] = useState(""); const [l, setL] = useState(false);
  const go = async (ev) => { ev.preventDefault(); setL(true); setE("");
    try { const d = await call("/login", "POST", f); sessionStorage.setItem("admin_token", d.token); onIn(); } catch (x) { setE(errText(x)); } setL(false); };
  return (<form className="card form login" onSubmit={go}><h2>Admin sign in</h2>
    <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" required value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} /></div>
    <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" required value={f.password} onChange={(x) => setF({ ...f, password: x.target.value })} /></div>
    <button className="btn primary" disabled={l}>{l ? "Signing in…" : "Sign in"}</button><p className="status fail" role="alert">{e}</p></form>);
}

function Overview() {
  const { data: d, err, loading, reload } = useLoad("/stats");
  if (!d) return <State loading={loading} err={err} reload={reload} />;
  return (<>
    <div className="stats">{[["Projects", d.projects], ["Published", d.published], ["Messages", d.messages], ["Unread", d.unread]].map(([k, v]) => <div className="card" key={k}><span className="period">{k}</span><h3>{v}</h3></div>)}</div>
    <h3>Recent messages</h3>{d.recent_messages.length ? d.recent_messages.map((m) => <div className="card row-card" key={m.id}><b>{m.subject}</b> from {m.name} · {fmt(m.created_at)}{!m.is_read && <span className="badge">new</span>}</div>) : <p className="note">No messages yet.</p>}
    <h3>Recently updated projects</h3>{d.recent_projects.length ? d.recent_projects.map((p) => <div className="card row-card" key={p.id}>{p.title} <span className="note">{p.published ? "Published" : "Draft"}</span></div>) : <p className="note">No projects yet.</p>}</>);
}

const blank = { title: "", period: "", description: "", features: "", stack: "", image_url: "", github_url: "", demo_url: "", published: true };
function Projects({ notify }) {
  const { data, err, loading, reload } = useLoad("/projects");
  const [q, setQ] = useState(""); const [ed, setEd] = useState(null); const [busy, setBusy] = useState(false);
  const list = (data?.projects || []).filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));
  const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const save = async (ev) => { ev.preventDefault(); setBusy(true);
    const b = { ...ed, features: lines(ed.features), stack: ed.stack.split(",").map((x) => x.trim()).filter(Boolean) };
    try { await (ed.id ? call(`/projects/${ed.id}`, "PUT", b) : call("/projects", "POST", b)); notify("Project saved."); setEd(null); reload(); } catch (x) { notify(errText(x), false); } setBusy(false); };
  const del = async (p) => { if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try { await call(`/projects/${p.id}`, "DELETE"); notify("Project deleted."); reload(); } catch (x) { notify(errText(x), false); } };
  const toggle = async (p) => { try { await call(`/projects/${p.id}`, "PUT", { ...p, published: !p.published }); notify(p.published ? "Unpublished." : "Published."); reload(); } catch (x) { notify(errText(x), false); } };
  const inp = (k, label, area, ph) => <div className="field"><label htmlFor={k}>{label}</label>{area ? <textarea id={k} rows="4" value={ed[k]} onChange={(x) => setEd({ ...ed, [k]: x.target.value })} placeholder={ph} /> : <input id={k} value={ed[k]} onChange={(x) => setEd({ ...ed, [k]: x.target.value })} placeholder={ph} />}</div>;
  if (ed) return (<form className="card form" onSubmit={save}><h3>{ed.id ? "Edit project" : "New project"}</h3>
    {inp("title", "Title")}{inp("period", "Period (e.g. Jun 2026 – Aug 2026)")}{inp("description", "Description", true)}{inp("features", "Key features (one per line)", true)}{inp("stack", "Technologies (comma-separated)")}
    {inp("image_url", "Image URL (https://…)")}{inp("github_url", "GitHub URL")}{inp("demo_url", "Live demo URL")}
    <label><input type="checkbox" checked={ed.published} onChange={(x) => setEd({ ...ed, published: x.target.checked })} /> Published on the public site</label>
    <div className="row"><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save project"}</button><button type="button" className="btn" onClick={() => setEd(null)}>Cancel</button></div></form>);
  return (<><div className="row"><input className="search" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(x) => setQ(x.target.value)} /><button className="btn primary" onClick={() => setEd(blank)}>Add project</button></div>
    <State loading={loading} err={err} reload={reload} />{data && !list.length && <p className="note">No projects found. Add one to get started.</p>}
    {list.map((p) => <div className="card row-card" key={p.id}><div><b>{p.title}</b> <span className={`badge ${p.published ? "" : "draft"}`}>{p.published ? "Published" : "Draft"}</span><br /><span className="note">{p.stack.join(", ")}</span></div>
      <div className="row"><button className="btn small" onClick={() => setEd({ ...p, features: p.features.join("\n"), stack: p.stack.join(", ") })}>Edit</button><button className="btn small" onClick={() => toggle(p)}>{p.published ? "Unpublish" : "Publish"}</button><button className="btn small" onClick={() => del(p)}>Delete</button></div></div>)}</>);
}

function Messages({ notify }) {
  const { data, err, loading, reload } = useLoad("/messages"); const [q, setQ] = useState(""); const [unread, setUnread] = useState(false); const [open, setOpen] = useState(null);
  const list = (data?.messages || []).filter((m) => (!unread || !m.is_read) && `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q.toLowerCase()));
  const mark = async (m, v) => { try { await call(`/messages/${m.id}`, "PATCH", { is_read: v }); reload(); } catch (x) { notify(errText(x), false); } };
  const del = async (m) => { if (!confirm("Delete this message permanently?")) return; try { await call(`/messages/${m.id}`, "DELETE"); notify("Message deleted."); reload(); } catch (x) { notify(errText(x), false); } };
  return (<><div className="row"><input className="search" placeholder="Search messages" aria-label="Search messages" value={q} onChange={(x) => setQ(x.target.value)} />
    <label><input type="checkbox" checked={unread} onChange={(x) => setUnread(x.target.checked)} /> Unread only</label></div>
    <State loading={loading} err={err} reload={reload} />{data && !list.length && <p className="note">No messages to show.</p>}
    {list.map((m) => <div className="card" key={m.id}><button className="linkish" onClick={() => { setOpen(open === m.id ? null : m.id); if (!m.is_read) mark(m, true); }}>
      <b>{m.subject}</b> {!m.is_read && <span className="badge">new</span>}<br /><span className="note">{m.name} · {m.email} · {fmt(m.created_at)}</span></button>
      {open === m.id && <><p className="msg">{m.message}</p><div className="row"><a className="btn small" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>Reply</a><button className="btn small" onClick={() => mark(m, !m.is_read)}>Mark {m.is_read ? "unread" : "read"}</button><button className="btn small" onClick={() => del(m)}>Delete</button></div></>}</div>)}</>);
}

function Content({ notify }) {
  const { data, err, loading, reload } = useLoad("/content"); const [about, setAbout] = useState(""); const [sk, setSk] = useState("");
  useEffect(() => { if (data) { setAbout(data.content.about || ""); setSk(Object.entries(data.content.skills || {}).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n")); } }, [data]);
  const save = async (key) => { try { let v = about;
    if (key === "skills") { v = {}; sk.split("\n").filter((l) => l.trim()).forEach((l) => { const i = l.indexOf(":"); if (i < 1) throw { error: `Use "Category: item, item" — check: ${l}` }; v[l.slice(0, i).trim()] = l.slice(i + 1).split(",").map((s) => s.trim()).filter(Boolean); }); }
    await call(`/content/${key}`, "PUT", { value: v }); notify("Saved — the public site is updated."); } catch (x) { notify(errText(x), false); } };
  if (!data) return <State loading={loading} err={err} reload={reload} />;
  return (<><div className="card form"><h3>About text</h3><label htmlFor="ab" className="note">Separate paragraphs with a blank line.</label><textarea id="ab" rows="9" value={about} onChange={(x) => setAbout(x.target.value)} /><button className="btn primary" onClick={() => save("about")}>Save about</button></div>
    <div className="card form"><h3>Skills</h3><label htmlFor="sk" className="note">One category per line: Category: item, item</label><textarea id="sk" rows="8" value={sk} onChange={(x) => setSk(x.target.value)} /><button className="btn primary" onClick={() => save("skills")}>Save skills</button></div></>);
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!tok()); const [tab, setTab] = useState("overview"); const [toast, setToast] = useState(null);
  const notify = (t, ok = true) => { setToast({ t, ok }); setTimeout(() => setToast(null), 3500); };
  if (!authed) return <main className="adm-login"><Login onIn={() => setAuthed(true)} /></main>;
  const tabs = [["overview", "Overview", LayoutDashboard], ["projects", "Projects", FolderKanban], ["messages", "Messages", Mail], ["content", "Content", FileText]];
  const View = { overview: Overview, projects: Projects, messages: Messages, content: Content }[tab];
  return (<div className="adm"><aside><b className="mark">admin<span>.panel</span></b>
    {tabs.map(([k, l, I]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><I size={18} /> {l}</button>)}
    <a href="#top" onClick={() => (location.hash = "")}>View site</a>
    <button onClick={() => { sessionStorage.removeItem("admin_token"); setAuthed(false); }}><LogOut size={18} /> Sign out</button></aside>
    <section><h2>{tabs.find((t) => t[0] === tab)[1]}</h2><View notify={notify} /></section>
    {toast && <div className={`toast ${toast.ok ? "ok" : "fail"}`} role="status">{toast.t}</div>}</div>);
}
