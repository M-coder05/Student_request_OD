import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/formatDate';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/notifications?limit=8');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.warn('Unable to load notifications:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await apiRequest(`/notifications/${notification._id}/read`, { method: 'PATCH' });
        setNotifications((current) => current.map((item) =>
          item._id === notification._id ? { ...item, read: true } : item
        ));
        setUnreadCount((count) => Math.max(count - 1, 0));
      } catch (error) {
        showToast(error.message || 'Unable to mark notification as read', 'error');
        return;
      }
    }

    setIsOpen(false);
    const isStaff = ['faculty', 'hod', 'principal', 'admin', 'super_admin', 'demo_admin'].includes(user?.role);
    navigate(notification.type === 'Appointment' ? (isStaff ? '/appointments/requests' : '/appointments') : '/status');
  };

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <section className="notification-panel" aria-label="Notifications">
          <div className="notification-panel-heading">
            <h2>Notifications</h2>
            <span>{unreadCount} unread</span>
          </div>
          {isLoading && notifications.length === 0 ? (
            <p className="notification-empty">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">You have no notifications.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li key={notification._id}>
                  <button
                    type="button"
                    className={`notification-item${notification.read ? '' : ' is-unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notification-item-heading">
                      <strong>{notification.title}</strong>
                      {!notification.read && <span className="notification-unread-dot" aria-label="Unread" />}
                    </span>
                    <span>{notification.message}</span>
                    <small>{formatDateTime(notification.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setIsOpen(false);
              navigate('/status');
            }}
          >
            View request status
          </button>
        </section>
      )}
    </div>
  );
}
