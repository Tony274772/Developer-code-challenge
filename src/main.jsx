import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { Activity, Code2, Medal, Plus, RefreshCcw, Search, Trophy } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "");
const platformOptions = ["leetcode", "codechef", "codeforces"];

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function App() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [syncingId, setSyncingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    platform: "leetcode",
    username: ""
  });

  async function loadLeaderboard() {
    const response = await fetch(`${API_URL}/api/leaderboard`);
    setUsers(await response.json());
  }

  useEffect(() => {
    loadLeaderboard();
    const socket = io(API_URL);
    socket.on("leaderboard:update", setUsers);
    return () => socket.disconnect();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => {
      const platformText = user.platforms.map((platform) => `${platform.platform} ${platform.username}`).join(" ");
      return `${user.name} ${platformText}`.toLowerCase().includes(term);
    });
  }, [query, users]);

  const totalSolved = users.reduce((sum, user) => sum + user.totalSolved, 0);
  const activeProfiles = users.reduce((sum, user) => sum + user.platforms.length, 0);
  const platformTotals = useMemo(() => {
    const totals = platformOptions.map((platform) => ({
      platform,
      solved: 0,
      profiles: 0
    }));

    for (const user of users) {
      for (const userPlatform of user.platforms) {
        const platformTotal = totals.find((item) => item.platform === userPlatform.platform);
        if (platformTotal) {
          platformTotal.solved += userPlatform.solved || 0;
          platformTotal.profiles += 1;
        }
      }
    }

    return totals;
  }, [users]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;

    const response = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        avatarColor: "#2563eb",
        platforms: [{ platform: form.platform, username: form.username.trim() }]
      })
    });

    if (response.ok) {
      setForm({ name: "", platform: "leetcode", username: "" });
      await loadLeaderboard();
    }
  }

  async function refreshUser(userId) {
    setSyncingId(userId);
    await fetch(`${API_URL}/api/users/${userId}/refresh`, { method: "POST" });
    setSyncingId("");
    await loadLeaderboard();
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Live coding rankboard</p>
          <h1>Developer problem-solving leaderboard</h1>
        </div>
        <div className="live-pill">
          <Activity size={18} />
          Real-time sync
        </div>
      </section>

      <section className="metrics" aria-label="Leaderboard summary">
        <article>
          <Trophy size={22} />
          <span>{users.length}</span>
          <p>Ranked coders</p>
        </article>
        <article>
          <Code2 size={22} />
          <span>{totalSolved.toLocaleString()}</span>
          <p>Total questions</p>
        </article>
        <article>
          <Medal size={22} />
          <span>{activeProfiles}</span>
          <p>Linked profiles</p>
        </article>
      </section>

      <section className="platform-breakdown" aria-label="Platform totals">
        {platformTotals.map((platform) => (
          <article key={platform.platform}>
            <div>
              <span>{platform.platform}</span>
              <p>{platform.profiles} profiles</p>
            </div>
            <strong>{platform.solved.toLocaleString()}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>Add coder</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Student or team member"
              />
            </label>
            <label>
              Platform
              <select
                value={form.platform}
                onChange={(event) => setForm({ ...form, platform: event.target.value })}
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder="Platform handle"
              />
            </label>
            <button type="submit">
              <Plus size={18} />
              Add to leaderboard
            </button>
          </form>
        </aside>

        <section className="leaderboard">
          <div className="table-tools">
            <h2>Rankings</h2>
            <label className="search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users or platforms"
              />
            </label>
          </div>

          <div className="rows">
            {filteredUsers.map((user) => (
              <article className="rank-row" key={user._id}>
                <div className="rank">#{user.rank}</div>
                <div className="avatar" style={{ background: user.avatarColor }}>
                  {initials(user.name)}
                </div>
                <div className="person">
                  <h3>{user.name}</h3>
                  <div className="platforms">
                    {user.platforms.map((platform) => (
                      <a
                        key={`${platform.platform}-${platform.username}`}
                        href={platform.profileUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={`platform-count ${platform.status?.startsWith("sync-failed") ? "warning" : ""}`}
                      >
                        <span>{platform.platform}</span>
                        <strong>{platform.solved.toLocaleString()}</strong>
                      </a>
                    ))}
                  </div>
                </div>
                <div className="solved">
                  <strong>{user.totalSolved.toLocaleString()}</strong>
                  <span>questions</span>
                </div>
                <button
                  className="icon-button"
                  title="Refresh this coder"
                  onClick={() => refreshUser(user._id)}
                  disabled={syncingId === user._id}
                >
                  <RefreshCcw size={18} className={syncingId === user._id ? "spin" : ""} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
