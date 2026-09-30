import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, createGroup, inviteMember, getGroupStreaks } from '../lib/groupApi';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

export default function GroupsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [createError, setCreateError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [streaks, setStreaks] = useState([]);
  const [streaksLoading, setStreaksLoading] = useState(false);
  const [streaksError, setStreaksError] = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);

  async function fetchGroups() {
    try {
      const data = await getGroups();
      setGroups(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleCreateGroup(e) {
    e.preventDefault();
    setCreateError(null);
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName('');
      await fetchGroups();
    } catch (err) {
      setCreateError(err.message);
    }
  }

  async function handleSelectGroup(group) {
    setSelectedGroup(group);
    setInviteEmail('');
    setInviteStatus(null);
    setStreaksError(null);
    setStreaksLoading(true);
    try {
      const data = await getGroupStreaks(group._id);
      setStreaks(data);
    } catch (err) {
      setStreaksError(err.message);
    } finally {
      setStreaksLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteStatus(null);
    try {
      await inviteMember(selectedGroup._id, inviteEmail.trim());
      setInviteStatus({ ok: true, msg: `Invite sent to ${inviteEmail.trim()}` });
      setInviteEmail('');
    } catch (err) {
      setInviteStatus({ ok: false, msg: err.message });
    }
  }

  return (
    <div id="app-container">
      <header className="app-header">
        <h1>Habit Tracker</h1>
        <div className="header-actions">
          <button type="button" className="btn-nav" onClick={() => navigate('/')}>My Habits</button>
          <NotificationBell />
          <button type="button" className="btn-logout" onClick={logout}>Log Out</button>
        </div>
      </header>

      <main className="app-main">
        {/* Create Group */}
        <div className="card form-section">
          <div className="form-section-header">
            <div className="form-section-icon">👥</div>
            <div>
              <p className="section-title">Accountability Groups</p>
              <p className="section-subtitle">Create a group and invite others to track streaks together</p>
            </div>
          </div>
          <form className="group-create-form" onSubmit={handleCreateGroup}>
            <input
              type="text"
              className="form-input"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">Create Group</button>
          </form>
          {createError && <p className="form-error">{createError}</p>}
        </div>

        {/* Groups List + Detail */}
        <div className="groups-layout">
          {/* Left: group list */}
          <div className="card groups-list">
            <h2 className="groups-list-title">Your Groups</h2>
            {groups.length === 0 ? (
              <p className="groups-empty">No groups yet. Create one above.</p>
            ) : (
              <ul className="groups-ul">
                {groups.map((g) => (
                  <li key={g._id}>
                    <button
                      type="button"
                      className={`group-item-btn${selectedGroup?._id === g._id ? ' group-item-btn--active' : ''}`}
                      onClick={() => handleSelectGroup(g)}
                    >
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: group detail */}
          {selectedGroup && (
            <div className="card group-detail">
              <h2 className="group-detail-title">{selectedGroup.name}</h2>

              {/* Invite form */}
              <form className="invite-form" onSubmit={handleInvite}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">Invite</button>
              </form>
              {inviteStatus && (
                <p className={inviteStatus.ok ? 'invite-success' : 'form-error'}>
                  {inviteStatus.msg}
                </p>
              )}

              {/* Streak leaderboard */}
              <h3 className="leaderboard-title">Streak Leaderboard</h3>
              {streaksLoading && <p className="groups-empty">Loading streaks…</p>}
              {streaksError && <p className="form-error">{streaksError}</p>}
              {!streaksLoading && !streaksError && (
                <ul className="leaderboard-list">
                  {streaks.map((member, i) => (
                    <li key={member.userId} className="leaderboard-item">
                      <span className="leaderboard-rank">#{i + 1}</span>
                      <span className="leaderboard-email">{member.email}</span>
                      <span className="leaderboard-streak">
                        {member.streak > 0 ? `🔥 ${member.streak}d` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
