import React, { useEffect, useMemo, useState } from "react";

// --- Domain data -----------------------------------------------------------------------------
const ROLES = ["employee", "manager", "admin"];

const DEFAULT_USERS = [
  { id: "u1", name: "Аружан С.", role: "employee", dept: "Маркетинг" },
  { id: "u2", name: "Ермек Т.", role: "employee", dept: "IT" },
  { id: "u3", name: "Менеджер Айбек", role: "manager", dept: "Операциялар" },
  { id: "u4", name: "Админ Нұржан", role: "admin", dept: "HQ" },
];

const PERMISSIONS = {
  employee: { submit: true, vote: true, comment: true, moderate: false, convert: false },
  manager:  { submit: true, vote: true, comment: true, moderate: true,  convert: true },
  admin:    { submit: true, vote: true, comment: true, moderate: true,  convert: true },
};

const STATUS_ORDER = ["proposed", "reviewing", "approved", "in_project", "delivered", "rejected"];
const STATUS_LABEL = {
  proposed: "Ұсынылды",
  reviewing: "Қаралуда",
  approved: "Қабылданды",
  in_project: "Жобаға айналдырылды",
  delivered: "Іске асты",
  rejected: "Қабылданбады",
};

const CATEGORIES = [
  "Процесс жақсарту",
  "Қауіпсіздік",
  "Қызмет сапасы",
  "Құралдар/IT",
  "Шығынды азайту",
  "Мәдениет/HR",
];

const LS_KEYS = {
  ideas: "ideaboard.ideas",
  users: "ideaboard.users",
  currentUser: "ideaboard.currentUser",
};

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const fmtDate = (ts) => new Date(ts).toLocaleString();

// --- Storage helpers -------------------------------------------------------------------------
const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const loadIdeas = () => safeParse(localStorage.getItem(LS_KEYS.ideas), []);
const loadUsers = () => safeParse(localStorage.getItem(LS_KEYS.users), DEFAULT_USERS);
const loadCurrentUserId = () => {
  const raw = localStorage.getItem(LS_KEYS.currentUser);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object" && "id" in parsed) return parsed.id;
  } catch {
    // fall through
  }
  return raw;
};

const saveIdeas = (ideas) => localStorage.setItem(LS_KEYS.ideas, JSON.stringify(ideas));
const saveUsers = (users) => localStorage.setItem(LS_KEYS.users, JSON.stringify(users));
const saveCurrentUserId = (id) => {
  if (id) {
    localStorage.setItem(LS_KEYS.currentUser, JSON.stringify(id));
  } else {
    localStorage.removeItem(LS_KEYS.currentUser);
  }
};

// --- Root component --------------------------------------------------------------------------
export default function IdeaBoardApp() {
  const [ideas, setIdeas] = useState(() => loadIdeas());
  const [users, setUsers] = useState(() => loadUsers());
  const [currentUserId, setCurrentUserId] = useState(() => loadCurrentUserId());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("top");
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("ideas");

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  useEffect(() => saveIdeas(ideas), [ideas]);
  useEffect(() => saveUsers(users), [users]);
  useEffect(() => saveCurrentUserId(currentUserId), [currentUserId]);

  if (!currentUser) {
    return (
      <div style={styles.centeredPage}>
        <AuthGate
          users={users}
          onLogin={(id) => setCurrentUserId(id)}
          onRegister={({ name, dept, role }) => {
            const newUser = { id: uid("user"), name, role, ...(dept ? { dept } : {}) };
            setUsers((prev) => [...prev, newUser]);
            setCurrentUserId(newUser.id);
          }}
        />
      </div>
    );
  }

  const perms = PERMISSIONS[currentUser.role] ?? PERMISSIONS.employee;

  const filteredIdeas = useMemo(() => {
    let list = [...ideas];
    if (query.trim()) {
      const lower = query.trim().toLowerCase();
      list = list.filter((idea) =>
        idea.title.toLowerCase().includes(lower)
        || idea.desc.toLowerCase().includes(lower)
        || idea.category.toLowerCase().includes(lower)
        || (idea.dept ?? "").toLowerCase().includes(lower)
      );
    }
    if (category !== "all") list = list.filter((idea) => idea.category === category);
    if (status !== "all") list = list.filter((idea) => idea.status === status);

    if (sort === "top") list.sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
    if (sort === "new") list.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "active") list.sort((a, b) => (b.comments?.length ?? 0) - (a.comments?.length ?? 0));
    return list;
  }, [ideas, query, category, status, sort]);

  const projects = useMemo(() => ideas.filter((idea) => Boolean(idea.project)), [ideas]);

  return (
    <div style={styles.page}>
      <Topbar
        currentUser={currentUser}
        canSubmit={perms.submit}
        onLogout={() => setCurrentUserId(null)}
        onShowForm={() => setShowForm(true)}
      />

      <Tabs value={tab} onChange={setTab} />

      {tab === "ideas" && (
        <div style={styles.container}>
          <Filters
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            status={status}
            setStatus={setStatus}
            sort={sort}
            setSort={setSort}
          />

          {showForm && (
            <IdeaForm
              onClose={() => setShowForm(false)}
              onSubmit={(payload) => {
                const idea = {
                  id: uid("idea"),
                  authorId: currentUser.id,
                  authorName: currentUser.name,
                  dept: currentUser.dept,
                  title: payload.title,
                  desc: payload.desc,
                  category: payload.category,
                  status: "proposed",
                  createdAt: Date.now(),
                  votes: 0,
                  voterIds: [],
                  comments: [],
                };
                setIdeas((prev) => [idea, ...prev]);
                setShowForm(false);
              }}
            />
          )}

          <div style={styles.grid}>
            {filteredIdeas.length === 0 && (
              <EmptyState text="Идея табылмады. Алдымен өз ұсынысыңызды қосып көріңіз." />
            )}
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                me={currentUser}
                perms={perms}
                onVote={(dir) => setIdeas((prev) => prev.map((item) => (
                  item.id === idea.id ? applyVote(item, currentUser.id, dir) : item
                )))}
                onComment={(text) => setIdeas((prev) => prev.map((item) => (
                  item.id === idea.id ? addComment(item, currentUser, text) : item
                )))}
                onStatusChange={(nextStatus) => setIdeas((prev) => prev.map((item) => (
                  item.id === idea.id ? { ...item, status: nextStatus } : item
                )))}
                onConvert={(projectName) => setIdeas((prev) => prev.map((item) => (
                  item.id === idea.id
                    ? {
                        ...item,
                        status: "in_project",
                        project: { id: uid("project"), name: projectName, ownerId: currentUser.id, createdAt: Date.now() },
                      }
                    : item
                )))}
                onDelete={() => setIdeas((prev) => prev.filter((item) => item.id !== idea.id))}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "projects" && <ProjectsView ideas={projects} />}
      {tab === "analytics" && <Analytics ideas={ideas} />}
      {tab === "profile" && <Profile user={currentUser} ideas={ideas} />}

      <footer style={styles.footer}>IdeaBoard • MVP • Рөлдер тіркеу арқылы беріледі</footer>
    </div>
  );
}

// --- Pure helpers ---------------------------------------------------------------------------
const applyVote = (idea, userId, dir) => {
  const hasVoted = idea.voterIds.includes(userId);
  if (dir === 1 && hasVoted) return idea;

  if (dir === 1) {
    return { ...idea, votes: idea.votes + 1, voterIds: [...idea.voterIds, userId] };
  }
  if (dir === -1 && hasVoted) {
    return { ...idea, votes: idea.votes - 1, voterIds: idea.voterIds.filter((id) => id !== userId) };
  }
  return idea;
};

const addComment = (idea, user, text) => {
  const trimmed = text.trim();
  if (!trimmed) return idea;
  const comment = {
    id: uid("comment"),
    userId: user.id,
    userName: user.name,
    text: trimmed,
    createdAt: Date.now(),
  };
  return { ...idea, comments: [...idea.comments, comment] };
};

// --- UI pieces ------------------------------------------------------------------------------
const Topbar = ({ currentUser, canSubmit, onLogout, onShowForm }) => (
  <header style={styles.topbar}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <h1 style={styles.h1}>IdeaBoard</h1>
      <Badge text="Қызметкерлерге арналған" />
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={styles.userBox}>
        <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {currentUser.role}{currentUser.dept ? ` • ${currentUser.dept}` : ""}
        </div>
      </div>
      <button style={styles.secondaryBtn} onClick={onLogout}>Шығу</button>
      <button
        style={{ ...styles.btn, opacity: canSubmit ? 1 : 0.5 }}
        onClick={() => canSubmit && onShowForm()}
      >+ Ұсыныс енгізу</button>
    </div>
  </header>
);

const AuthGate = ({ users, onLogin, onRegister }) => {
  const [mode, setMode] = useState(users.length === 0 ? "register" : "login");
  const [loginId, setLoginId] = useState(users[0]?.id ?? "");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (users.length === 0) {
      setMode("register");
      setLoginId("");
      return;
    }
    if (!users.some((u) => u.id === loginId)) {
      setLoginId(users[0].id);
    }
  }, [users, loginId]);

  const canLogin = mode === "login" && users.length > 0 && Boolean(loginId);

  return (
    <div style={styles.authCard}>
      <h2 style={{ margin: "0 0 4px" }}>IdeaBoard</h2>
      <div style={{ opacity: 0.7, marginBottom: 12 }}>Жүйеге кіру немесе жаңа рөлмен тіркелу</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          style={{ ...styles.secondaryBtn, background: mode === "login" ? "#2563eb" : "#374151" }}
          onClick={() => setMode("login")}
        >Кіру</button>
        <button
          style={{ ...styles.secondaryBtn, background: mode === "register" ? "#2563eb" : "#374151" }}
          onClick={() => setMode("register")}
        >Тіркелу</button>
      </div>

      {mode === "login" ? (
        users.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.8 }}>Алдымен жаңа пайдаланушыны тіркеу қажет.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>Пайдаланушыны таңдаңыз</span>
              <select style={styles.select} value={loginId} onChange={(event) => setLoginId(event.target.value)}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} • {user.role}</option>
                ))}
              </select>
            </label>
            <button
              style={{ ...styles.btn, opacity: canLogin ? 1 : 0.5 }}
              disabled={!canLogin}
              onClick={() => canLogin && onLogin(loginId)}
            >Кіру</button>
          </div>
        )
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <input
            style={styles.input}
            placeholder="Аты-жөні"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Бөлім (қажет емес)"
            value={dept}
            onChange={(event) => setDept(event.target.value)}
          />
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <span style={{ opacity: 0.75 }}>Рөлі</span>
            <select style={styles.select} value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
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
              setName("");
              setDept("");
              setRole(ROLES[0]);
            }}
          >Тіркелу</button>
        </div>
      )}
    </div>
  );
};

const Tabs = ({ value, onChange }) => {
  const tabs = [
    { id: "ideas", label: "Идеялар" },
    { id: "projects", label: "Жобалар" },
    { id: "analytics", label: "Аналитика" },
    { id: "profile", label: "Профиль" },
  ];
  return (
    <div style={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            ...styles.tab,
            background: value === tab.id ? "#111827" : "#1f2937",
            color: value === tab.id ? "#fff" : "#e5e7eb",
          }}
        >{tab.label}</button>
      ))}
    </div>
  );
};

const Filters = ({ query, setQuery, category, setCategory, status, setStatus, sort, setSort }) => (
  <div style={styles.filters}>
    <input
      style={styles.input}
      placeholder="Іздеу..."
      value={query}
      onChange={(event) => setQuery(event.target.value)}
    />
    <select style={styles.select} value={category} onChange={(event) => setCategory(event.target.value)}>
      <option value="all">Барлық категориялар</option>
      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
    </select>
    <select style={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
      <option value="all">Барлық статус</option>
      {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
    <select style={styles.select} value={sort} onChange={(event) => setSort(event.target.value)}>
      <option value="top">Үздік</option>
      <option value="new">Жаңа</option>
      <option value="active">Белсенді</option>
    </select>
  </div>
);

const IdeaForm = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const canSubmit = title.trim() && desc.trim();

  return (
    <div style={styles.dialogBackdrop}>
      <div style={styles.dialog}>
        <h3 style={{ marginTop: 0 }}>Жаңа идея</h3>
        <input
          style={styles.input}
          placeholder="Тақырып"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          style={{ ...styles.input, minHeight: 90 }}
          placeholder="Сипаттама"
          value={desc}
          onChange={(event) => setDesc(event.target.value)}
        />
        <select style={styles.select} value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={styles.secondaryBtn} onClick={onClose}>Болдырмау</button>
          <button
            style={{ ...styles.btn, opacity: canSubmit ? 1 : 0.5 }}
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({ title: title.trim(), desc: desc.trim(), category });
              setTitle("");
              setDesc("");
              setCategory(CATEGORIES[0]);
            }}
          >Сақтау</button>
        </div>
      </div>
    </div>
  );
};

const IdeaCard = ({ idea, me, perms, onVote, onComment, onStatusChange, onConvert, onDelete }) => {
  const [comment, setComment] = useState("");

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 4px" }}>{idea.title}</h3>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {idea.authorName} • {fmtDate(idea.createdAt)}{idea.dept ? ` • ${idea.dept}` : ""}
          </div>
        </div>
        <Badge text={STATUS_LABEL[idea.status]} />
      </div>

      <p style={{ marginTop: 12, lineHeight: 1.4 }}>{idea.desc}</p>
      <div style={{ fontSize: 13, opacity: 0.8 }}>Категория: {idea.category}</div>

      <div style={styles.ideaFooter}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={styles.secondaryBtn} onClick={() => onVote(1)}>▲</button>
          <div>{idea.votes}</div>
          <button style={styles.secondaryBtn} onClick={() => onVote(-1)}>▼</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {perms.moderate && (
            <select
              style={styles.select}
              value={idea.status}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          )}
          {perms.convert && !idea.project && (
            <button
              style={styles.secondaryBtn}
              onClick={() => {
                const name = prompt("Жоба атауы");
                if (name) onConvert(name);
              }}
            >Жобаға айналдыру</button>
          )}
          {me.role === "admin" && (
            <button style={styles.dangerBtn} onClick={onDelete}>Жою</button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Пікірлер ({idea.comments.length})</div>
        <div style={{ display: "grid", gap: 8 }}>
          {idea.comments.map((c) => (
            <div key={c.id} style={styles.comment}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{c.userName} • {fmtDate(c.createdAt)}</div>
              <div>{c.text}</div>
            </div>
          ))}
        </div>
        {perms.comment && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Пікіріңіз"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button
              style={styles.btn}
              onClick={() => {
                if (!comment.trim()) return;
                onComment(comment);
                setComment("");
              }}
            >Жіберу</button>
          </div>
        )}
      </div>

      {idea.project && (
        <div style={styles.projectBadge}>
          Жоба: <strong>{idea.project.name}</strong> • бастамашы ID: {idea.project.ownerId} • {fmtDate(idea.project.createdAt)}
        </div>
      )}
    </div>
  );
};

const ProjectsView = ({ ideas }) => (
  ideas.length === 0 ? (
    <EmptyState text="Әзірге жобалар жоқ" />
  ) : (
    <div style={styles.container}>
      <div style={styles.grid}>
        {ideas.map((idea) => (
          <div key={idea.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{idea.project?.name ?? idea.title}</h3>
              <Badge text={STATUS_LABEL[idea.status]} />
            </div>
            <div style={{ marginTop: 6, opacity: 0.9 }}>{idea.desc}</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Категория: {idea.category}</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Дауыс: {idea.votes} • Пікір: {idea.comments.length}</div>
          </div>
        ))}
      </div>
    </div>
  )
);

const Analytics = ({ ideas }) => {
  const total = ideas.length;
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  const byCategory = Object.fromEntries(CATEGORIES.map((cat) => [cat, 0]));
  let totalVotes = 0;

  for (const idea of ideas) {
    byStatus[idea.status] = (byStatus[idea.status] ?? 0) + 1;
    byCategory[idea.category] = (byCategory[idea.category] ?? 0) + 1;
    totalVotes += idea.votes;
  }

  const topIdea = [...ideas].sort((a, b) => b.votes - a.votes)[0];

  return (
    <div style={styles.container}>
      <div style={styles.kpis}>
        <Kpi label="Идея саны" value={total} />
        <Kpi label="Жалпы дауыс" value={totalVotes} />
        <Kpi label="Жобалар" value={ideas.filter((idea) => idea.project).length} />
        <Kpi label="Ең үздік идея" value={topIdea ? `${topIdea.title} (${topIdea.votes})` : "—"} />
      </div>
      <div style={styles.grid}>
        <ChartBar
          title="Статус бойынша"
          data={STATUS_ORDER.map((status) => ({ label: STATUS_LABEL[status], value: byStatus[status] }))}
        />
        <ChartBar
          title="Категория бойынша"
          data={CATEGORIES.map((cat) => ({ label: cat, value: byCategory[cat] }))}
        />
      </div>
    </div>
  );
};

const Profile = ({ user, ideas }) => {
  const mine = ideas.filter((idea) => idea.authorId === user.id);
  const votes = mine.reduce((sum, idea) => sum + idea.votes, 0);
  const comments = mine.reduce((sum, idea) => sum + idea.comments.length, 0);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>{user.name}</h3>
        <div>Рөлі: <strong>{user.role}</strong>{user.dept ? ` • ${user.dept}` : ""}</div>
        <div style={{ marginTop: 8 }}>Менің идеяларым: {mine.length}</div>
        <div>Алған дауыс: {votes}</div>
        <div>Пікірлер: {comments}</div>
      </div>
      <div style={styles.grid}>
        {mine.map((idea) => (
          <div key={idea.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0 }}>{idea.title}</h4>
              <Badge text={STATUS_LABEL[idea.status]} />
            </div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{idea.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Kpi = ({ label, value }) => (
  <div style={styles.kpi}>
    <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
  </div>
);

const ChartBar = ({ title, data }) => {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {data.map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{item.label}</div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${(item.value / max) * 100}%` }} />
            </div>
            <div style={{ fontSize: 12 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div style={styles.empty}>
    <div style={{ fontSize: 28 }}>😌</div>
    <div>{text}</div>
  </div>
);

const Badge = ({ text }) => (
  <span style={styles.badge}>{text}</span>
);

// --- Styles ----------------------------------------------------------------------------------
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    padding: 24,
  },
  centeredPage: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f9fafb",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  container: {
    display: "grid",
    gap: 24,
  },
  grid: {
    display: "grid",
    gap: 16,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111827",
    borderRadius: 16,
    padding: "16px 20px",
  },
  h1: {
    margin: 0,
    fontSize: 24,
  },
  userBox: {
    background: "#1f2937",
    padding: "8px 12px",
    borderRadius: 12,
  },
  btn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryBtn: {
    background: "#374151",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 500,
  },
  dangerBtn: {
    background: "#b91c1c",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 500,
  },
  tabs: {
    display: "flex",
    gap: 12,
    background: "#111827",
    padding: 8,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  filters: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  input: {
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#f9fafb",
  },
  select: {
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#f9fafb",
  },
  authCard: {
    width: 360,
    background: "#111827",
    borderRadius: 16,
    padding: 24,
    display: "grid",
    gap: 16,
    boxShadow: "0 20px 50px rgba(15,23,42,0.4)",
  },
  card: {
    background: "#111827",
    borderRadius: 16,
    padding: 20,
    display: "grid",
    gap: 12,
    boxShadow: "0 15px 30px rgba(15,23,42,0.4)",
  },
  ideaFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  comment: {
    background: "#1f2937",
    borderRadius: 10,
    padding: "10px 12px",
  },
  projectBadge: {
    marginTop: 12,
    background: "#0f766e",
    color: "white",
    padding: "8px 10px",
    borderRadius: 10,
  },
  kpis: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  kpi: {
    background: "#111827",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 6,
  },
  barTrack: {
    background: "#1f2937",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: {
    background: "#2563eb",
    height: "100%",
    borderRadius: 999,
  },
  empty: {
    background: "#111827",
    borderRadius: 16,
    padding: 32,
    display: "grid",
    placeItems: "center",
    gap: 8,
    opacity: 0.85,
  },
  badge: {
    background: "#2563eb",
    color: "white",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  dialogBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.75)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    zIndex: 20,
  },
  dialog: {
    width: "min(480px, 100%)",
    background: "#0f172a",
    borderRadius: 18,
    padding: 24,
    display: "grid",
    gap: 12,
  },
  footer: {
    opacity: 0.6,
    fontSize: 13,
    textAlign: "center",
    marginTop: "auto",
  },
};

