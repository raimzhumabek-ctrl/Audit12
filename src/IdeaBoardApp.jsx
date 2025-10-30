import React, { useEffect, useMemo, useState } from "react";

/**
 * IdeaBoard — single-file React MVP
 * - Roles: employee, manager, admin (easily extendable)
 * - Features: submit ideas, vote, comment, filter/search, status workflow,
 *             manager review, convert to project, basic analytics
 * - Persistence: localStorage
 * - No external UI libs required. Drop into any React app or preview here.
 */

// ---------- Types ----------
/** @typedef {"proposed"|"reviewing"|"approved"|"in_project"|"delivered"|"rejected"} IdeaStatus */
/** @typedef {{ id:string; name:string; role:string; dept?:string }} User */
/** @typedef {{ id:string; authorId:string; authorName:string; dept?:string; title:string; desc:string; category:string; status:IdeaStatus; votes:number; voterIds:string[]; comments:Array<{id:string; userId:string; userName:string; text:string; createdAt:number}>; createdAt:number; project?:{id:string; name:string; ownerId:string; createdAt:number} }} Idea */

// ---------- Mock auth & roles ----------
const DEFAULT_USERS = /** @type {User[]} */ ([
  { id: "u1", name: "Аружан С.", role: "employee", dept: "Маркетинг" },
  { id: "u2", name: "Ермек Т.", role: "employee", dept: "IT" },
  { id: "u3", name: "Менеджер Айбек", role: "manager", dept: "Операциялар" },
  { id: "u4", name: "Админ Нұржан", role: "admin", dept: "HQ" },
]);

const ROLES = ["employee", "manager", "admin"];

const PERMS = {
  employee: {
    submit: true,
    vote: true,
    comment: true,
    changeStatus: false,
    convertToProject: false,
  },
  manager: {
    submit: true,
    vote: true,
    comment: true,
    changeStatus: true,
    convertToProject: true,
  },
  admin: {
    submit: true,
    vote: true,
    comment: true,
    changeStatus: true,
    convertToProject: true,
  },
};

// ---------- Storage helpers ----------
const LS_KEYS = { ideas: "ideaboard.ideas", currentUser: "ideaboard.currentUser", users: "ideaboard.users" };

/** @returns {Idea[]} */
function loadIdeas() {
  const raw = localStorage.getItem(LS_KEYS.ideas);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/** @param {Idea[]} ideas */
function saveIdeas(ideas) { localStorage.setItem(LS_KEYS.ideas, JSON.stringify(ideas)); }

/** @returns {User[]} */
function loadUsers() {
  const raw = localStorage.getItem(LS_KEYS.users);
  if (!raw) return DEFAULT_USERS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(u => u && typeof u.id === "string")) {
      return parsed;
    }
  } catch {}
  return DEFAULT_USERS;
}

/** @param {User[]} users */
function saveUsers(users) { localStorage.setItem(LS_KEYS.users, JSON.stringify(users)); }

/** @returns {string|null} */
function loadCurrentUserId() {
  const raw = localStorage.getItem(LS_KEYS.currentUser);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "id" in parsed) {
      return parsed.id;
    }
    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {}
  try {
    const fallback = JSON.parse(raw);
    if (fallback && typeof fallback === "object" && "id" in fallback) {
      return fallback.id;
    }
  } catch {}
  return raw || null;
}

/** @param {string|null} id */
function saveCurrentUserId(id) {
  if (id) {
    localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(id));
  } else {
    localStorage.removeItem(LS_KEYS.currentUser);
  }
}

// ---------- Utilities ----------
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const fmtDate = ts => new Date(ts).toLocaleString();

const STATUS_LABEL = /** @type {Record<IdeaStatus,string>} */ ({
  proposed: "Ұсынылды",
  reviewing: "Қаралуда",
  approved: "Қабылданды",
  in_project: "Жобаға айналдырылды",
  delivered: "Іске асты",
  rejected: "Қабылданбады",
});

const CATEGORIES = [
  "Процесс жақсарту",
  "Қауіпсіздік",
  "Қызмет сапасы",
  "Құралдар/IT",
  "Шығынды азайту",
  "Мәдениет/HR",
];

// ---------- Root Component ----------
export default function IdeaBoardApp() {
  const [ideas, setIdeas] = useState(() => /** @type {Idea[]} */(loadIdeas()));
  const [users, setUsers] = useState(() => /** @type {User[]} */(loadUsers()));
  const [currentUserId, setCurrentUserId] = useState(() => loadCurrentUserId());
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || null, [users, currentUserId]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("top"); // top | new | active
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("ideas"); // ideas | projects | analytics | profile

  useEffect(() => saveIdeas(ideas), [ideas]);
  useEffect(() => saveUsers(users), [users]);
  useEffect(() => saveCurrentUserId(currentUserId), [currentUserId]);

  if (!currentUser) {
    return (
      <div style={{ ...styles.page, display: "grid", placeItems: "center", padding: 24 }}>
        <AuthGate
          users={users}
          onLogin={(id) => setCurrentUserId(id)}
          onRegister={({ name, dept, role }) => {
            const user = /** @type {User} */({ id: uid("user"), name, role, ...(dept ? { dept } : {}) });
            setUsers(prev => [...prev, user]);
            setCurrentUserId(user.id);
          }}
        />
      </div>
    );
  }

  const perms = PERMS[/** @type {keyof typeof PERMS} */(currentUser.role)] || PERMS.employee;

  const filtered = useMemo(() => {
    /** @type {Idea[]} */
    let list = ideas;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.dept || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") list = list.filter(i => i.category === category);
    if (status !== "all") list = list.filter(i => i.status === status);

    if (sort === "top") list = [...list].sort((a,b) => b.votes - a.votes || b.createdAt - a.createdAt);
    if (sort === "new") list = [...list].sort((a,b) => b.createdAt - a.createdAt);
    if (sort === "active") list = [...list].sort((a,b) => (b.comments?.length||0) - (a.comments?.length||0));
    return list;
  }, [ideas, query, category, status, sort]);

  const projects = useMemo(() => ideas.filter(i => i.project), [ideas]);

  return (
    <div style={styles.page}>
      <Topbar
        currentUser={currentUser}
        onLogout={() => setCurrentUserId(null)}
        onNewIdea={() => setShowForm(true)}
        canSubmit={perms.submit}
      />

      <Tabs value={activeTab} onChange={setActiveTab} />

      {activeTab === "ideas" && (
        <div style={styles.container}>
          <Filters
            query={query} setQuery={setQuery}
            category={category} setCategory={setCategory}
            status={status} setStatus={setStatus}
            sort={sort} setSort={setSort}
          />

          {showForm && (
            <IdeaForm
              onClose={() => setShowForm(false)}
              onSubmit={(payload) => {
                const idea = /** @type {Idea} */({
                  id: uid("idea"),
                  authorId: currentUser.id,
                  authorName: currentUser.name,
                  dept: currentUser.dept,
                  title: payload.title,
                  desc: payload.desc,
                  category: payload.category,
                  status: "proposed",
                  votes: 0,
                  voterIds: [],
                  comments: [],
                  createdAt: Date.now(),
                });
                setIdeas(prev => [idea, ...prev]);
                setShowForm(false);
              }}
            />
          )}

          <div style={styles.grid}>
            {filtered.length === 0 && (
              <EmptyState text="Идея табылмады. Алдымен өз ұсынысыңды қосып көр."/>
            )}
            {filtered.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                canVote={perms.vote}
                canComment={perms.comment}
                canModerate={perms.changeStatus}
                canProject={perms.convertToProject}
                me={currentUser}
                onVote={(id, dir) => setIdeas(prev => prev.map(i => i.id===id ? vote(i, currentUser.id, dir) : i))}
                onComment={(id, text) => setIdeas(prev => prev.map(i => i.id===id ? addComment(i, currentUser, text) : i))}
                onStatus={(id, s) => setIdeas(prev => prev.map(i => i.id===id ? { ...i, status: s } : i))}
                onConvert={(id, name) => setIdeas(prev => prev.map(i => i.id===id ? { ...i, status: "in_project", project: { id: uid("prj"), name, ownerId: currentUser.id, createdAt: Date.now() } } : i))}
                onDelete={(id) => setIdeas(prev => prev.filter(i => i.id!==id))}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <ProjectsView ideas={projects} />
      )}

      {activeTab === "analytics" && (
        <Analytics ideas={ideas} />
      )}

      {activeTab === "profile" && (
        <Profile user={currentUser} ideas={ideas} />
      )}

      <footer style={styles.footer}>IdeaBoard • MVP • Рөлдер кеңейтуге дайын</footer>
    </div>
  );
}

// ---------- Pure functions ----------
/** @param {Idea} idea @param {string} userId @param {1|-1} dir */
function vote(idea, userId, dir) {
  const has = idea.voterIds.includes(userId);
  if (has && dir === 1) return idea; // already upvoted
  let votes = idea.votes;
  let voterIds = idea.voterIds;
  if (!has && dir === 1) { votes += 1; voterIds = [...voterIds, userId]; }
  if (has && dir === -1) { votes -= 1; voterIds = voterIds.filter(id => id !== userId); }
  return { ...idea, votes, voterIds };
}

/** @param {Idea} idea @param {User} user @param {string} text */
function addComment(idea, user, text) {
  if (!text.trim()) return idea;
  const c = { id: uid("c"), userId: user.id, userName: user.name, text: text.trim(), createdAt: Date.now() };
  return { ...idea, comments: [...(idea.comments||[]), c] };
}

// ---------- UI pieces ----------
function Topbar({ currentUser, onLogout, onNewIdea, canSubmit }) {
  return (
    <div style={styles.topbar}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={styles.h1}>IdeaBoard</h1>
        <Badge text="Қызметкерлерге арналған"/>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={styles.userBox}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{currentUser.role}{currentUser.dept ? ` • ${currentUser.dept}` : ""}</div>
        </div>
        <button style={styles.secondaryBtn} onClick={onLogout}>Шығу</button>
        <button style={{ ...styles.btn, opacity: canSubmit ? 1 : 0.5 }} onClick={() => canSubmit && onNewIdea()}>+ Ұсыныс енгізу</button>
      </div>
    </div>
  );
}

function AuthGate({ users, onLogin, onRegister }) {
  const [mode, setMode] = useState(() => (users.length ? "login" : "register"));
  const [loginId, setLoginId] = useState(() => (users[0]?.id || ""));
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (users.length === 0) {
      setLoginId("");
      setMode("register");
      return;
    }
    if (!users.find(u => u.id === loginId)) {
      setLoginId(users[0].id);
    }
  }, [users, loginId]);

  const canLogin = mode === "login" && users.length > 0 && Boolean(loginId);

  return (
    <div style={styles.authCard}>
      <h2 style={{ margin: "0 0 6px" }}>IdeaBoard</h2>
      <div style={{ fontSize: 13, opacity: 0.75 }}>Жүйеге кіру немесе жаңа рөл тіркеу</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            ...styles.secondaryBtn,
            background: mode === "login" ? "#2563eb" : "#374151",
          }}
          onClick={() => setMode("login")}
        >Кіру</button>
        <button
          style={{
            ...styles.secondaryBtn,
            background: mode === "register" ? "#2563eb" : "#374151",
          }}
          onClick={() => setMode("register")}
        >Тіркелу</button>
      </div>

      {mode === "login" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {users.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.8 }}>Алдымен жаңа пайдаланушыны тіркеу қажет.</div>
          ) : (
            <>
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <span style={{ opacity: 0.75 }}>Пайдаланушыны таңдаңыз</span>
                <select style={styles.select} value={loginId} onChange={e => setLoginId(e.target.value)}>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} • {u.role}</option>
                  ))}
                </select>
              </label>
              <button style={{ ...styles.btn, opacity: canLogin ? 1 : 0.5 }} disabled={!canLogin} onClick={() => canLogin && onLogin(loginId)}>Кіру</button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <input
            style={styles.input}
            placeholder="Аты-жөні"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Бөлім (қалауыңыз бойынша)"
            value={dept}
            onChange={e => setDept(e.target.value)}
          />
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <span style={{ opacity: 0.75 }}>Рөлі</span>
            <select style={styles.select} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}
          <button
            style={styles.btn}
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Аты-жөнін енгізіңіз");
                return;
              }
              setError("");
              onRegister({ name: trimmed, dept: dept.trim() || undefined, role });
            }}
          >Тіркелу</button>
        </div>
      )}
    </div>
  );
}

function Tabs({ value, onChange }) {
  const tabs = [
    { id: "ideas", label: "Идеялар" },
    { id: "projects", label: "Жобалар" },
    { id: "analytics", label: "Аналитика" },
    { id: "profile", label: "Профиль" },
  ];
  return (
    <div style={styles.tabs}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            ...styles.tab,
            background: value === t.id ? "#111827" : "#1f2937",
            color: value === t.id ? "#fff" : "#e5e7eb",
          }}
        >{t.label}</button>
      ))}
    </div>
  );
}

function Filters({ query, setQuery, category, setCategory, status, setStatus, sort, setSort }) {
  return (
    <div style={styles.filters}>
      <input
        placeholder="Іздеу: атауы, бөлім, категория"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={styles.input}
      />
      <select value={category} onChange={e => setCategory(e.target.value)} style={styles.select}>
        <option value="all">Барлық категория</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={status} onChange={e => setStatus(e.target.value)} style={styles.select}>
        <option value="all">Барлық статус</option>
        {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={sort} onChange={e => setSort(e.target.value)} style={styles.select}>
        <option value="top">Топ (дауыс)</option>
        <option value="new">Жаңа</option>
        <option value="active">Белсенді (пікір)</option>
      </select>
    </div>
  );
}

function IdeaForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  return (
    <div style={styles.modalWrap}>
      <div style={styles.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0 }}>Жаңа идея</h3>
          <button onClick={onClose} style={styles.iconBtn}>✕</button>
        </div>
        <div style={{ display:"grid", gap:12, marginTop:12 }}>
          <input style={styles.input} placeholder="Атауы" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea style={{...styles.input, minHeight:100}} placeholder="Сипаттама" value={desc} onChange={e=>setDesc(e.target.value)} />
          <select style={styles.select} value={category} onChange={e=>setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            style={{...styles.btn, alignSelf:"start"}}
            onClick={() => {
              if (!title.trim() || !desc.trim()) return;
              onSubmit({ title: title.trim(), desc: desc.trim(), category });
            }}
          >Сақтау</button>
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea, me, canVote, canComment, canModerate, canProject, onVote, onComment, onStatus, onConvert, onDelete }) {
  const [comment, setComment] = useState("");
  const upvoted = idea.voterIds.includes(me.id);

  return (
    <div style={styles.card}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
        <div>
          <h3 style={{ margin: "0 0 6px 0" }}>{idea.title}</h3>
          <div style={{ fontSize:13, opacity:0.8 }}>{idea.category} • {STATUS_LABEL[idea.status]} • {fmtDate(idea.createdAt)}</div>
          <div style={{ marginTop:8, whiteSpace:"pre-wrap" }}>{idea.desc}</div>
          <div style={{ marginTop:10, fontSize:13, opacity:0.8 }}>Автор: {idea.authorName}{idea.dept ? ` • ${idea.dept}`: ""}</div>
        </div>
        <div style={{ display:"grid", alignContent:"start", gap:6, minWidth:96 }}>
          <button style={{...styles.voteBtn, background: upvoted?"#2563eb":"#374151"}} disabled={!canVote} onClick={() => canVote && onVote(idea.id, upvoted?-1:1)}>
            ↑ Дауыс {idea.votes}
          </button>
          {canModerate && (
            <select style={styles.select} value={idea.status} onChange={e=>onStatus(idea.id, /** @type {IdeaStatus} */(e.target.value))}>
              {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          {canProject && (
            <button style={styles.secondaryBtn} onClick={() => {
              const name = prompt("Жоба атауы?", idea.title);
              if (name) onConvert(idea.id, name);
            }}>Жобаға айналдыру</button>
          )}
          {(me.role === "admin") && (
            <button style={styles.dangerBtn} onClick={() => onDelete(idea.id)}>Жою</button>
          )}
        </div>
      </div>

      {/* Comments */}
      <div style={{ marginTop:12, borderTop:"1px solid #374151", paddingTop:12 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Пікірлер ({idea.comments.length})</div>
        <div style={{ display:"grid", gap:8 }}>
          {idea.comments.map(c => (
            <div key={c.id} style={styles.comment}>
              <div style={{ fontSize:12, opacity:0.8 }}>{c.userName} • {fmtDate(c.createdAt)}</div>
              <div>{c.text}</div>
            </div>
          ))}
        </div>
        {canComment && (
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input style={{...styles.input, flex:1}} placeholder="Пікіріңіз" value={comment} onChange={e=>setComment(e.target.value)} />
            <button style={styles.btn} onClick={() => { if (comment.trim()) { onComment(idea.id, comment); setComment(""); } }}>Жіберу</button>
          </div>
        )}
      </div>

      {/* Project badge */}
      {idea.project && (
        <div style={{ marginTop:10, background:"#0f766e", color:"white", padding:"8px 10px", borderRadius:8 }}>
          Жоба: <strong>{idea.project.name}</strong> • бастамашы ID: {idea.project.ownerId} • {fmtDate(idea.project.createdAt)}
        </div>
      )}
    </div>
  );
}

function ProjectsView({ ideas }) {
  if (ideas.length === 0) return <EmptyState text="Әзірге жобалар жоқ"/>;
  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {ideas.map(i => (
          <div key={i.id} style={styles.card}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <h3 style={{ margin:0 }}>{i.project?.name || i.title}</h3>
              <Badge text={STATUS_LABEL[i.status]} />
            </div>
            <div style={{ marginTop:6, opacity:0.9 }}>{i.desc}</div>
            <div style={{ marginTop:10, fontSize:13, opacity:0.8 }}>Категория: {i.category}</div>
            <div style={{ marginTop:6, fontSize:13, opacity:0.8 }}>Дауыс: {i.votes} • Пікір: {i.comments.length}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics({ ideas }) {
  const total = ideas.length;
  const byStatus = Object.fromEntries(Object.keys(STATUS_LABEL).map(k => [k, 0]));
  const byCategory = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  let totalVotes = 0;
  for (const i of ideas) {
    // @ts-ignore
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    // @ts-ignore
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    totalVotes += i.votes;
  }
  const topIdea = [...ideas].sort((a,b)=>b.votes-a.votes)[0];

  return (
    <div style={styles.container}>
      <div style={styles.kpis}>
        <KPI label="Идея саны" value={total} />
        <KPI label="Жалпы дауыс" value={totalVotes} />
        <KPI label="Жобалар" value={ideas.filter(i=>i.project).length} />
        <KPI label="Ең үздік идея" value={topIdea? `${topIdea.title} (${topIdea.votes})`: "—"} />
      </div>
      <div style={styles.grid}>
        <ChartBar title="Статус бойынша" data={Object.entries(byStatus).map(([k,v])=>({label:STATUS_LABEL[/** @type {IdeaStatus} */(k)], value:v}))} />
        <ChartBar title="Категория бойынша" data={Object.entries(byCategory).map(([k,v])=>({label:k, value:v}))} />
      </div>
    </div>
  );
}

function Profile({ user, ideas }) {
  const mine = ideas.filter(i => i.authorId === user.id);
  const votes = mine.reduce((s,i)=>s+i.votes,0);
  const comments = mine.reduce((s,i)=>s+i.comments.length,0);
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={{ marginTop:0 }}>{user.name}</h3>
        <div>Рөлі: <b>{user.role}</b>{user.dept? ` • ${user.dept}`: ""}</div>
        <div style={{ marginTop:8 }}>Менің идеяларым: {mine.length}</div>
        <div>Алған дауыс: {votes}</div>
        <div>Пікірлер: {comments}</div>
      </div>
      <div style={styles.grid}>
        {mine.map(i => (
          <div key={i.id} style={styles.card}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <h4 style={{ margin:0 }}>{i.title}</h4>
              <Badge text={STATUS_LABEL[i.status]} />
            </div>
            <div style={{ opacity:0.9, marginTop:6 }}>{i.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div style={styles.kpi}>
      <div style={{ fontSize:12, opacity:0.8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function ChartBar({ title, data }) {
  // Simple text bars to avoid external libs
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={styles.card}>
      <h4 style={{ margin: "0 0 10px 0" }}>{title}</h4>
      <div style={{ display:"grid", gap:8 }}>
        {data.map((d, idx) => (
          <div key={idx}>
            <div style={{ fontSize:12, marginBottom:4 }}>{d.label} • {d.value}</div>
            <div style={{ background:"#374151", borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:10, width:`${(d.value/max)*100}%`, background:"#3b82f6" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ text }) {
  return <span style={{ background:"#111827", color:"#e5e7eb", padding:"2px 8px", borderRadius:999, fontSize:12 }}>{text}</span>;
}

function EmptyState({ text }) { return (
  <div style={{ textAlign:"center", padding:40, opacity:0.8 }}>{text}</div>
); }

// ---------- Styles ----------
const styles = {
  page: { background:"#0b1220", color:"#e5e7eb", minHeight:"100vh", fontFamily:"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" },
  container: { padding:"18px 18px 90px", maxWidth:1100, margin:"0 auto" },
  topbar: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:"1px solid #1f2937", position:"sticky", top:0, background:"#0b1220", zIndex:10 },
  h1: { margin:0, fontSize:20 },
  btn: { background:"#2563eb", color:"white", border:"none", padding:"10px 14px", borderRadius:10, cursor:"pointer" },
  secondaryBtn: { background:"#374151", color:"#e5e7eb", border:"none", padding:"8px 10px", borderRadius:8, cursor:"pointer" },
  dangerBtn: { background:"#dc2626", color:"white", border:"none", padding:"8px 10px", borderRadius:8, cursor:"pointer" },
  voteBtn: { color:"#e5e7eb", border:"none", padding:"8px 10px", borderRadius:8, cursor:"pointer" },
  iconBtn: { background:"transparent", color:"#e5e7eb", border:"none", fontSize:18, cursor:"pointer" },
  input: { background:"#0b1220", border:"1px solid #374151", color:"#e5e7eb", padding:"10px 12px", borderRadius:10 },
  select: { background:"#111827", color:"#e5e7eb", border:"1px solid #374151", padding:"8px 10px", borderRadius:8 },
  filters: { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", margin:"12px 0" },
  grid: { display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))" },
  card: { background:"#111827", border:"1px solid #1f2937", padding:16, borderRadius:14, boxShadow:"0 0 0 1px rgba(0,0,0,.1) inset" },
  comment: { background:"#0b1220", border:"1px solid #1f2937", padding:"8px 10px", borderRadius:10 },
  userBox: { background:"#111827", border:"1px solid #1f2937", padding:"6px 10px", borderRadius:10, minWidth:220 },
  tabs: { display:"flex", gap:8, padding:"10px 18px", borderBottom:"1px solid #1f2937", position:"sticky", top:54, background:"#0b1220", zIndex:9 },
  tab: { border:"1px solid #374151", padding:"8px 12px", borderRadius:999, cursor:"pointer" },
  kpis: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12, marginBottom:12 },
  kpi: { background:"#111827", border:"1px solid #1f2937", padding:16, borderRadius:14 },
  modalWrap: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"grid", placeItems:"center", zIndex:20 },
  modal: { width:"min(680px, 96vw)", background:"#0b1220", border:"1px solid #1f2937", borderRadius:16, padding:16 },
  authCard: { background:"#111827", border:"1px solid #1f2937", borderRadius:16, padding:24, width:"min(420px, 94vw)", display:"grid", gap:16 },
  footer: { position:"fixed", bottom:0, left:0, right:0, padding:"10px 18px", borderTop:"1px solid #1f2937", background:"rgba(11,18,32,.9)", backdropFilter:"saturate(180%) blur(6px)", textAlign:"center", fontSize:12 }
};
