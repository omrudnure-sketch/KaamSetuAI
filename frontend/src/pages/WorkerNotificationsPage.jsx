import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService.js';
import { translateNotification } from '../services/aiService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { Globe, Bell, CheckCheck, Languages, Sparkles } from 'lucide-react';

export const WorkerNotificationsPage = () => {
  const [lang, setLang] = useState('en');
  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification translation state (Step 23.6)
  const [notifTranslations, setNotifTranslations] = useState({});
  const [translatingNotifId, setTranslatingNotifId] = useState(null);

  const handleTranslateNotif = async (notifId, targetLang) => {
    try {
      setTranslatingNotifId(notifId);
      const res = await translateNotification(notifId, targetLang);
      if (res.success && res.data) {
        setNotifTranslations((prev) => ({
          ...prev,
          [notifId]: {
            translatedText: res.data.translatedMessage,
            targetLang,
            showTranslated: true,
          },
        }));
      }
    } catch (_e) {
    } finally {
      setTranslatingNotifId(null);
    }
  };

  const toggleNotifTranslation = (notifId) => {
    setNotifTranslations((prev) => {
      const existing = prev[notifId];
      if (!existing) return prev;
      return {
        ...prev,
        [notifId]: {
          ...existing,
          showTranslated: !existing.showTranslated,
        },
      };
    });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.success && res.data) {
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h1>
          <p className="text-gray-600 text-sm mt-1">Stay updated on job status, agreements, payments, and messages</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>

          <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
            <Globe className="w-4 h-4 text-indigo-600 ml-2 mr-1" />
            {['en', 'mr', 'hi'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                  lang === l ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {l === 'en' ? 'English' : l === 'mr' ? 'मराठी' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
            <Bell className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium">No notifications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                  !n.isRead ? 'bg-indigo-50/40 font-medium' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{n.title}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {n.type?.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </div>
                  {/* Translation indicator badge */}
                  {notifTranslations[n._id]?.showTranslated && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 pt-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Translated ({notifTranslations[n._id]?.targetLang?.toUpperCase()})</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-700 leading-relaxed">
                    {notifTranslations[n._id]?.showTranslated
                      ? notifTranslations[n._id]?.translatedText
                      : n.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-gray-400">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>

                    {/* Translation action */}
                    <div>
                      {notifTranslations[n._id] ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotifTranslation(n._id);
                          }}
                          className="text-indigo-600 hover:underline font-semibold"
                        >
                          {notifTranslations[n._id].showTranslated ? 'View Original' : 'View Translated'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {translatingNotifId === n._id ? (
                            <span className="text-indigo-600 animate-pulse">Translating...</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTranslateNotif(n._id, 'mr');
                                }}
                                className="text-indigo-600 hover:underline font-semibold"
                              >
                                मराठी
                              </button>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTranslateNotif(n._id, 'hi');
                                }}
                                className="text-indigo-600 hover:underline font-semibold"
                              >
                                हिंदी
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerNotificationsPage;
