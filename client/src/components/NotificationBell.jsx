import { useState, useEffect, useRef } from 'react';
import { getNotifications, respondToInvite } from '../lib/groupApi';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  async function fetchNotifications() {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleRespond(notificationId, action) {
    setError(null);
    try {
      await respondToInvite(notificationId, action);
      await fetchNotifications();
    } catch (err) {
      setError(err.message);
    }
  }

  const pending = notifications.filter((n) => n.status === 'pending');

  return (
    <div className="notif-bell-wrapper" ref={ref}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${pending.length > 0 ? `, ${pending.length} pending` : ''}`}
      >
        <span className="notif-bell-icon">🔔</span>
        {pending.length > 0 && (
          <span className="notif-bell-badge">{pending.length}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">Notifications</div>
          {error && <p className="notif-error">{error}</p>}
          {notifications.length === 0 ? (
            <p className="notif-empty">No notifications</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n._id} className={`notif-item notif-item--${n.status}`}>
                  <div className="notif-item-text">
                    <strong>{n.senderId?.email ?? 'Someone'}</strong> invited you to join{' '}
                    <strong>{n.groupId?.name ?? 'a group'}</strong>
                  </div>
                  {n.status === 'pending' ? (
                    <div className="notif-item-actions">
                      <button
                        type="button"
                        className="btn-accept"
                        onClick={() => handleRespond(n._id, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn-reject"
                        onClick={() => handleRespond(n._id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className={`notif-status notif-status--${n.status}`}>
                      {n.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
