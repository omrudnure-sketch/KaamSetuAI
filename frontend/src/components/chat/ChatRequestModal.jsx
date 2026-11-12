import React, { useState } from 'react';
import { X, Send, Sparkles, AlertCircle, MessageSquare, CheckCircle } from 'lucide-react';
import { sendChatRequest } from '../../services/chatService.js';
import { useNavigate } from 'react-router-dom';

export const ChatRequestModal = ({
  isOpen,
  recipient,
  jobId = null,
  projectId = null,
  currentUserRole = 'employer',
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const defaultNote =
    currentUserRole === 'employer'
      ? `Hi ${recipient?.name || 'there'}, we are interested in discussing work opportunities with you.`
      : `Hi ${recipient?.name || 'Sir/Ma\'am'}, I am interested in your project and would like to discuss work details.`;

  const [message, setMessage] = useState(defaultNote);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !recipient) return null;

  const quickChips =
    currentUserRole === 'employer'
      ? [
          'Immediate work available for your trade.',
          'Are you available to start this week?',
          'Would like to discuss daily rates & project schedule.',
        ]
      : [
          'I have relevant experience in this work.',
          'Are you currently hiring for this role?',
          'Available to start work immediately.',
        ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient.id && !recipient._id) {
      setError('Invalid recipient user.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const targetId = recipient.id || recipient._id;
      const res = await sendChatRequest({
        recipientId: String(targetId),
        initialMessage: message.trim() || defaultNote,
        jobId: jobId || null,
        projectId: projectId || null,
      });

      setSuccess(true);

      const conv = res?.data;
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(conv);
        } else {
          const targetPortal = currentUserRole === 'employer' ? 'employer' : 'worker';
          navigate(`/${targetPortal}/messages${conv?._id ? `/${conv._id}` : ''}`);
        }
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send chat request';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-sky-500/20 text-primary dark:text-sky-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Start Conversation</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Pre-Agreement Chat Request</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Profile Snippet */}
        <div className="p-4 px-5 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-sky-400 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
            {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{recipient.name}</h4>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40">
                {recipient.role || (currentUserRole === 'employer' ? 'Worker' : 'Employer')}
              </span>
            </div>
            {recipient.trade && (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">{recipient.trade}</p>
            )}
          </div>
        </div>

        {/* Body & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Chat request sent! Redirecting to messages...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Introductory Message</span>
              <span className="text-[11px] text-slate-400 font-normal">{message.length}/500</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a brief introduction or what work you need to discuss..."
              className="ks-input text-xs sm:text-sm py-2.5 resize-none w-full"
              required
            />
          </div>

          {/* Suggested Quick Notes */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary dark:text-sky-400" />
              <span>Quick templates:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(`Hi ${recipient.name || 'there'}, ${chip}`)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Sending a chat request allows you to exchange real-time text, images, and audio voice messages before any formal hiring agreement is finalized.
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ks-btn-outline px-4 py-2 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || !message.trim()}
              className="ks-btn-primary px-5 py-2 text-xs font-extrabold flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatRequestModal;

