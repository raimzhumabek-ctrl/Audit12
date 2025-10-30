import React, { useEffect, useMemo, useState } from "react";

// --- Domain data -----------------------------------------------------------------------------
const ROLES = ["employee", "manager", "admin"];

const DEFAULT_USERS = [
  { id: "u1", name: "Аружан С.", role: "employee", dept: "Маркетинг" },
  { id: "u2", name: "Ермек Т.", role: "employee", dept: "IT" },
  { id: "u3", name: "Менеджер Айбек", role: "manager", dept: "Операциялар" },
  { id: "u4", name: "Админ Нұржан", role: "admin", dept: "HQ" },
];
]);

// Future roles to unlock later: hr, reviewer, pm, analyst
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

// Storage helpers
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

// Root component
// --- Root component --------------------------------------------------------------------------
export default function IdeaBoardApp() {
  const [ideas, setIdeas] = useState(() => loadIdeas());
  const [users, setUsers] = useState(() => loadUsers());
  const [currentUserId, setCurrentUserId] = useState(() => loadCurrentUserId());
  const [authIntent, setAuthIntent] = useState(() => (users.length === 0 ? "register" : "login"));
  const [ideas, setIdeas] = useState(() => /** @type {Idea[]} */(loadIdeas()));
  const [users, setUsers] = useState(() => /** @type {User[]} */(loadUsers()));
  const [currentUserId, setCurrentUserId] = useState(() => loadCurrentUserId());
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId) || null, [users, currentUserId]);
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
  useEffect(() => {
    if (users.length === 0) {
      setAuthIntent("register");
    }
  }, [users]);

  if (!currentUser) {
    return (
      <AuthScreen
        users={users}
        initialMode={authIntent}
        onModeChange={setAuthIntent}
        onLogin={(id) => setCurrentUserId(id)}
        onRegister={({ name, dept, role }) => {
          const newUser = { id: uid("user"), name, role, ...(dept ? { dept } : {}) };
          setUsers((prev) => [...prev, newUser]);
          setCurrentUserId(newUser.id);
        }}
      />
    );
  }

  const perms = PERMISSIONS[currentUser.role] ?? PERMISSIONS.employee;


  if (!currentUser) {
    return (
      <AuthScreen
        users={users}
        initialMode={authIntent}
        onModeChange={setAuthIntent}
        onLogin={(id) => setCurrentUserId(id)}
        onRegister={({ name, dept, role }) => {
          const newUser = { id: uid("user"), name, role, ...(dept ? { dept } : {}) };
          setUsers((prev) => [...prev, newUser]);
          setCurrentUserId(newUser.id);
        }}
      />

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
        onLogout={() => {
          setAuthIntent(users.length > 0 ? "login" : "register");
          setCurrentUserId(null);
          setTab("ideas");
          setShowForm(false);
          setQuery("");
          setCategory("all");
          setStatus("all");
          setSort("top");
        }}
        onShowForm={() => setShowForm(true)}
        canSubmit={perms.submit}
        onLogout={() => {
          setAuthIntent(users.length > 0 ? "login" : "register");
          setCurrentUserId(null);
          setTab("ideas");
          setShowForm(false);
          setQuery("");
          setCategory("all");
          setStatus("all");
          setSort("top");
        }}
        onShowForm={() => setShowForm(true)}
        onLogout={() => setCurrentUserId(null)}
        onNewIdea={() => setShowForm(true)}
        canSubmit={perms.submit}
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

// Pure helpers
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

// UI pieces
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
      <button style={styles.secondaryBtn} onClick={onLogout}>Шығу</button>
      <button
        style={{ ...styles.btn, opacity: canSubmit ? 1 : 0.5 }}
        onClick={() => canSubmit && onShowForm()}
      >+ Ұсыныс енгізу</button>
    </div>
  </header>
);

const AuthScreen = ({ users, onLogin, onRegister, initialMode = "login", onModeChange }) => {
  const [mode, setMode] = useState(() => (users.length === 0 ? "register" : initialMode));
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (users.length === 0) {
      if (mode !== "register") {
        setMode("register");
        onModeChange?.("register");
      }
      setLoginName("");
      setLoginError("");
      return;
    }
  }, [users.length, mode, onModeChange]);

  useEffect(() => {
    if (users.length === 0) return;
    if (initialMode !== mode) {
      setMode(initialMode);
      setLoginError("");
    }
  }, [initialMode, mode, users.length]);

  const selectMode = (nextMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
    if (nextMode === "login") {
      setError("");
    } else {
      setLoginError("");
    }
    onModeChange?.(nextMode);
  };

  const canLogin = mode === "login" && users.length > 0 && Boolean(loginName.trim());

  const handleLogin = () => {
    const trimmed = loginName.trim();
    if (!trimmed) {
      setLoginError("Аты-жөнін енгізіңіз");
      return;
    }
    const match = users.find((user) => user.name.toLowerCase() === trimmed.toLowerCase());
    if (!match) {
      setLoginError("Мұндай пайдаланушы табылмады");
      return;
    }
    setLoginError("");
    onLogin(match.id);
    setLoginName("");
  };

  const handleRegister = () => {
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
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authLayout}>
        <div style={styles.authHero}>
          <Badge text="Командалық платформа" />
          <h1 style={styles.authHeroTitle}>Жаңашыл идеяларды бірге жүзеге асырайық</h1>
          <p style={styles.authHeroBody}>
            Тіркеліп, өз рөліңізбен жүйеге кіріңіз. Әр пайдаланушының рұқсаттары автоматты
            түрде сақталады және IdeaBoard-та барлық ұсыныстармен жұмыс істеуге мүмкіндік береді.
          </p>
          <ul style={styles.authHeroList}>
            <li style={styles.authHeroItem}>💡 Жаңа идеяларды қосып, командаға ұсыныңыз</li>
            <li style={styles.authHeroItem}>🗳️ Дауыс беріп, үздік бастамаларды таңдаңыз</li>
            <li style={styles.authHeroItem}>📈 Жобаларды бақылап, нәтижесін көріңіз</li>
          </ul>
        </div>

        <div style={styles.authPanel}>
          <div>
            <h2 style={styles.authSectionTitle}>
              {mode === "login" ? "Жүйеге кіру" : "Жаңа тіркеу"}
            </h2>
            <div style={styles.authHint}>
              {mode === "login"
                ? "Алдын ала сақталған профильдің атын енгізіңіз немесе жаңа аккаунт жасаңыз."
                : "Аты-жөніңізді, бөлімді (қажет болса) енгізіп, өз рөліңізді таңдаңыз."}
            </div>
          </div>

          <div style={styles.authToggle}>
            <button
              style={{
                ...styles.authToggleBtn,
                background: mode === "login" ? "#2563eb" : "rgba(30,41,59,0.85)",
              }}
              onClick={() => selectMode("login")}
            >
              Кіру
            </button>
            <button
              style={{
                ...styles.authToggleBtn,
                background: mode === "register" ? "#2563eb" : "rgba(30,41,59,0.85)",
              }}
              onClick={() => selectMode("register")}
            >
              Тіркелу
            </button>
          </div>

          {mode === "login" ? (
            users.length === 0 ? (
              <div style={styles.authEmpty}>Алдымен жаңа пайдаланушыны тіркеу қажет.</div>
            ) : (
              <div style={styles.authForm}>
                <input
                  style={styles.input}
                  placeholder="Аты-жөні (мысалы, Аружан С.)"
                  value={loginName}
                  onChange={(event) => {
                    setLoginName(event.target.value);
                    if (loginError) setLoginError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canLogin) {
                      event.preventDefault();
                      handleLogin();
                    }
                  }}
                />
                {loginError && <div style={styles.authError}>{loginError}</div>}
                <button
                  style={{ ...styles.btn, opacity: canLogin ? 1 : 0.5 }}
                  disabled={!canLogin}
                  onClick={handleLogin}
                >
                  Кіру
                </button>
                <div style={styles.authSavedListWrap}>
                  <div style={styles.authLabelText}>Сақталған профильдер:</div>
                  <ul style={styles.authSavedList}>
                    {users.map((user) => (
                      <li key={user.id} style={styles.authSavedItem}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {user.role}{user.dept ? ` • ${user.dept}` : ""}
                          </div>
                        </div>
                        <button
                          style={styles.authSavedAction}
                          onClick={() => {
                            setLoginName(user.name);
                            setLoginError("");
                          }}
                        >
                          Таңдау
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          ) : (
            <div style={styles.authForm}>
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
              <label style={styles.authLabel}>
                <span style={styles.authLabelText}>Рөлі</span>
                <select
                  style={styles.select}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              {error && <div style={styles.authError}>{error}</div>}
              <button style={styles.btn} onClick={handleRegister}>Тіркелу</button>
            </div>
          )}

          <div style={styles.authMeta}>IdeaBoard • тіркелген профиль рөлді автоматты түрде сақтайды</div>
        </div>
      </div>
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

// Styles
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
  authPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.28), rgba(2,6,23,0.92) 55%, #020617 100%)",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 20px",
  },
  authLayout: {
    width: "min(960px, 100%)",
    display: "grid",
    gap: 32,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    alignItems: "stretch",
  },
  authHero: {
    background: "rgba(15,23,42,0.75)",
    borderRadius: 24,
    padding: 32,
    display: "grid",
    gap: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 35px 60px rgba(2,6,23,0.45)",
    backdropFilter: "blur(18px)",
  },
  authHeroTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.3,
  },
  authHeroBody: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
    opacity: 0.85,
  },
  authHeroList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: 12,
  },
  authHeroItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(17,24,39,0.7)",
    borderRadius: 18,
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid rgba(148,163,184,0.12)",
  },
  authPanel: {
    background: "#111827",
    borderRadius: 24,
    padding: 32,
    display: "grid",
    gap: 20,
    boxShadow: "0 30px 50px rgba(15,23,42,0.45)",
    border: "1px solid rgba(30,41,59,0.6)",
  },
  authSectionTitle: {
    margin: "0 0 6px",
  },
  authHint: {
    fontSize: 13,
    opacity: 0.75,
    lineHeight: 1.5,
  },
  authToggle: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  authToggleBtn: {
    border: "none",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#f8fafc",
    background: "rgba(30,41,59,0.85)",
  },
  authForm: {
    display: "grid",
    gap: 14,
  },
  authLabel: {
    display: "grid",
    gap: 6,
    fontSize: 13,
  },
  authLabelText: {
    opacity: 0.75,
  },
  authError: {
    color: "#f87171",
    fontSize: 13,
  },
  authEmpty: {
    fontSize: 13,
    opacity: 0.85,
    background: "rgba(30,41,59,0.6)",
    borderRadius: 14,
    padding: "14px 16px",
  },
  authMeta: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  },
  authSavedListWrap: {
    display: "grid",
    gap: 10,
    background: "rgba(30,41,59,0.4)",
    borderRadius: 14,
    padding: "14px 16px",
  },
  authSavedList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: 12,
  },
  authSavedItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "rgba(17,24,39,0.65)",
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(148,163,184,0.12)",
  },
  authSavedAction: {
    background: "rgba(37,99,235,0.85)",
    color: "#f8fafc",
    border: "none",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: 600,
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

