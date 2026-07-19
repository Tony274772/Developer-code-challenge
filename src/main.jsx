import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { Activity, Code2, Medal, PencilLine, Plus, RefreshCcw, Search, Trash2, Trophy, X } from "lucide-react";
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
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", platforms: [] });
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [actionError, setActionError] = useState("");
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

  async function refreshLeaderboard() {
    setRefreshingAll(true);
    await fetch(`${API_URL}/api/leaderboard/refresh`, { method: "POST" });
    setRefreshingAll(false);
    await loadLeaderboard();
  }

  async function deleteUser(userId) {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: "DELETE",
      headers: {
        "x-admin-access-code": accessCode.trim()
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload.message || "Delete failed");
      return;
    }

    setActionError("");
    setDeleteTargetUser(null);
    if (editingUser?._id === userId) {
      closeEditUser();
    }
    await loadLeaderboard();
  }

  function openEditUser(user) {
    setActionError("");
    setEditingUser(user);
    setEditForm({
      name: user.name,
      platforms: user.platforms.map((platform) => ({
        platform: platform.platform,
        username: platform.username
      }))
    });
  }

  function closeEditUser() {
    setEditingUser(null);
    setEditForm({ name: "", platforms: [] });
    setActionError("");
  }

  function openDeleteUser(user) {
    setActionError("");
    setDeleteTargetUser(user);
  }

  function closeDeleteUser() {
    setDeleteTargetUser(null);
    setActionError("");
  }

  async function saveUserChanges(event) {
    event.preventDefault();
    if (!editingUser) return;

    const name = editForm.name.trim();
    const platforms = editForm.platforms
      .map((platform) => ({
        platform: platform.platform,
        username: platform.username.trim()
      }))
      .filter((platform) => platform.username);

    if (!name || platforms.length === 0) return;

    const response = await fetch(`${API_URL}/api/users/${editingUser._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-access-code": accessCode.trim()
      },
      body: JSON.stringify({
        name,
        platforms
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setActionError(payload.message || "Save failed");
      return;
    }

    setActionError("");
    closeEditUser();
    await loadLeaderboard();
  }

  async function confirmDeleteUser(event) {
    event.preventDefault();
    if (!deleteTargetUser) return;

    await deleteUser(deleteTargetUser._id);
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
            <div className="table-actions">
              <label className="search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search users or platforms"
                />
              </label>
              <button className="refresh-button" onClick={refreshLeaderboard} disabled={refreshingAll}>
                <RefreshCcw size={18} className={refreshingAll ? "spin" : ""} />
                Refresh all
              </button>
            </div>
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
                <div className="row-actions">
                  <button
                    className="icon-button"
                    title="Edit this coder"
                    onClick={() => openEditUser(user)}
                  >
                    <PencilLine size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    title="Delete this coder"
                    onClick={() => openDeleteUser(user)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      {editingUser ? (
        <div className="modal-backdrop" onClick={closeEditUser}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edit coder</p>
                <h2>Correct the name or platform handles</h2>
              </div>
              <button className="icon-button" onClick={closeEditUser} aria-label="Close edit form">
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={saveUserChanges}>
              <p className="modal-description">Enter the shared admin code to save changes.</p>

              <label>
                Name
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  placeholder="Correct display name"
                />
              </label>

              {editForm.platforms.map((platform, index) => (
                <label key={`${platform.platform}-${index}`}>
                  {platform.platform} username
                  <input
                    value={platform.username}
                    onChange={(event) => {
                      const nextPlatforms = [...editForm.platforms];
                      nextPlatforms[index] = { ...platform, username: event.target.value };
                      setEditForm({ ...editForm, platforms: nextPlatforms });
                    }}
                    placeholder="Correct platform handle"
                  />
                </label>
              ))}

              <label>
                Admin code
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Shared access code"
                  type="password"
                />
              </label>

              {actionError ? <p className="modal-error">{actionError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeEditUser}>
                  Cancel
                </button>
                <button type="submit">Save changes</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deleteTargetUser ? (
        <div className="modal-backdrop" onClick={closeDeleteUser}>
          <section className="modal delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Delete coder</p>
                <h2>Remove {deleteTargetUser.name}?</h2>
              </div>
              <button className="icon-button" onClick={closeDeleteUser} aria-label="Close delete form">
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={confirmDeleteUser}>
              <p className="modal-description">
                This will permanently delete the user and all of their platform data.
              </p>

              <label>
                Admin code
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Shared access code"
                  type="password"
                />
              </label>

              {actionError ? <p className="modal-error">{actionError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeDeleteUser}>
                  Cancel
                </button>
                <button type="submit" className="danger-button">
                  Delete user
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
