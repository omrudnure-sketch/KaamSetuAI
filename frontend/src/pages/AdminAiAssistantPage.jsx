import React, { useState, useEffect, useRef } from 'react';
import { queryAdminAiAssistant, getAdminAiHistory } from '../services/adminService.js';
import {
  Sparkles,
  Send,
  Database,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Table as TableIcon,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'Show delayed projects.',
  'Which skill has the largest supply gap?',
  'How many workers are awaiting verification?',
  'How many verified electricians are available in Pune?',
  'What is the current recorded payment total?',
  'Show open complaints.',
  'Show unresolved disputes.',
  'Show employers with unusually high cancellation rates.',
];

export const AdminAiAssistantPage = () => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getAdminAiHistory();
        if (res?.data && res.data.length > 0) {
          const formatted = res.data.map((item) => ({
            question: item.question,
            answer: item.response,
            intent: item.intent,
            metrics: item.metrics,
            records: item.records,
            sources: item.sources,
            generatedAt: item.createdAt,
          }));
          setConversation(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch assistant history', err);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, loading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setError('');
    setLoading(true);

    try {
      const res = await queryAdminAiAssistant(cleanQuestion);
      if (res?.success && res.data) {
        setConversation((prev) => [
          ...prev,
          {
            question: cleanQuestion,
            answer: res.data.answer,
            intent: res.data.intent,
            metrics: res.data.metrics,
            records: res.data.records,
            sources: res.data.sources,
            generatedAt: res.data.generatedAt,
          },
        ]);
        setQuestion('');
      } else {
        setError(res?.error?.message || 'Failed to obtain AI answer.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggested = (q) => {
    setQuestion(q);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-2 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
              Admin AI Analytics Assistant
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Read-only conversational intelligence answering operational questions with live MongoDB analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-[11px] font-bold">
            Read-Only Safeguards Active
          </span>
        </div>
      </div>

      {/* Suggested Questions Bar */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-primary" /> Suggested Questions
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectSuggested(sq)}
              className="text-xs px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant border border-outline-variant/30 transition-all font-medium flex items-center gap-1.5 cursor-pointer text-left"
            >
              <span>{sq}</span>
              <ArrowRight className="w-3 h-3 text-on-surface-variant/70" />
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread Area */}
      <div className="min-h-[380px] max-h-[560px] overflow-y-auto space-y-5 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
        {conversation.length === 0 && !loading && (
          <div className="text-center py-16 space-y-3">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-primary">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-on-surface">No queries asked yet</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Ask any question about platform supply, shortages, payments, delayed projects, or verification backlog above.
            </p>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className="space-y-3">
            {/* Admin User Question Bubble */}
            <div className="flex justify-end">
              <div className="max-w-xl p-3.5 rounded-2xl rounded-br-sm bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-sm">
                {msg.question}
              </div>
            </div>

            {/* AI Assistant Response Card */}
            <div className="flex justify-start">
              <div className="max-w-3xl w-full p-4 sm:p-5 rounded-2xl rounded-bl-sm bg-surface-container-low border border-outline-variant/40 space-y-3 shadow-xs">
                {/* Header with intent and timestamp */}
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant border-b border-surface-container-high pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-on-surface">KaamSetu AI Assistant</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono uppercase">
                      {msg.intent}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    {msg.generatedAt ? new Date(msg.generatedAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>

                {/* Main Text Response */}
                <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
                  {msg.answer}
                </p>

                {/* Supporting Metric Cards */}
                {msg.metrics && Object.keys(msg.metrics).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {Object.entries(msg.metrics).map(([key, val], mi) => {
                      if (typeof val === 'object' && val !== null) return null;
                      return (
                        <div
                          key={mi}
                          className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20"
                        >
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant block truncate">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm font-extrabold text-primary mt-0.5 block truncate">
                            {String(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Supporting Records Table (if any records returned) */}
                {msg.records && msg.records.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-surface-container-high">
                    <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                      <TableIcon className="w-3 h-3 text-primary" />
                      Supporting Database Records ({msg.records.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-[11px]">
                      <table className="w-full text-left">
                        <thead className="bg-surface-container-low text-[10px] uppercase text-on-surface-variant sticky top-0">
                          <tr>
                            {Object.keys(msg.records[0]).slice(0, 4).map((col) => (
                              <th key={col} className="p-2">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {msg.records.slice(0, 8).map((rec, ri) => (
                            <tr key={ri} className="hover:bg-surface-container-low/50">
                              {Object.keys(msg.records[0]).slice(0, 4).map((col) => (
                                <td key={col} className="p-2 text-on-surface truncate max-w-[140px]">
                                  {typeof rec[col] === 'boolean'
                                    ? rec[col] ? 'Yes' : 'No'
                                    : String(rec[col] ?? 'N/A')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Data Sources and Integrity Footer */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="text-[10px] text-on-surface-variant font-mono flex items-center gap-2 pt-1 border-t border-surface-container-high/60">
                    <span>Data Sources:</span>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((s, si) => (
                        <span key={si} className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-3 text-xs text-on-surface-variant">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              <span>Analyzing live platform database records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about supply, shortages, delayed projects, payments..."
            maxLength={500}
            className="flex-1 px-3 py-2 bg-transparent text-sm text-on-surface placeholder-on-surface-variant/60 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="p-2.5 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
            title="Ask Assistant"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px] text-on-surface-variant px-2 pt-1 font-mono">
          <span>Supported intents: Skills, Delayed, Workers, Verifications, Payments, Complaints</span>
          <span>{question.length}/500</span>
        </div>
      </form>
    </div>
  );
};

export default AdminAiAssistantPage;
