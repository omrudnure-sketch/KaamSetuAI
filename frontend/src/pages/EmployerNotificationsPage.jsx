import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService.js';
import { Bell, CheckCheck, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const EmployerNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res?.success && Array.isArray(res?.data)) {
        setNotifications(res.data);
      }
    } catch (_err) {
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      fetchNotifications();
    } catch (_e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      fetchNotifications();
    } catch (_e) {}
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="ks-badge-cyan">
              <Sparkles className="w-3.5 h-3.5" /> Real-time Activity
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>Employer Notifications</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Real-time updates on worker applications, contract milestones, daily punches, and platform notices
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="ks-btn-outline text-xs px-4 py-2 font-bold flex items-center gap-1.5 self-start sm:self-auto relative z-10"
        >
          <CheckCheck className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="ks-glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-2">
            <Bell className="w-10 h-10 text-slate-400 opacity-60" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No notifications found.</p>
            <p className="text-xs">When workers apply or send messages, alerts will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:border-white/5">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                  !n.isRead
                    ? 'bg-primary/5 dark:bg-white/5 font-medium'
                    : 'hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{n.title}</span>
                    <span className="ks-badge-cyan text-[10px] uppercase font-bold">
                      {n.type?.replace(/_/g, ' ') || 'Notice'}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary dark:bg-sky-400" />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerNotificationsPage;
