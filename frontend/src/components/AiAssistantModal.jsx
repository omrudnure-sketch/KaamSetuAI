import React, { useState } from 'react';
import { askAiAssistant } from '../services/aiService.js';
import { useAuth } from '../context/AuthContext.jsx';

export const AiAssistantModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your KaamSetu AI Assistant (कामसेतू AI). Ask me anything about jobs, attendance, payments, or site rules!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await askAiAssistant(userText, 'en');
      if (res?.data?.response) {
        setMessages((prev) => [...prev, { sender: 'ai', text: res.data.response }]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I am having trouble connecting right now. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 ring-2 ring-surface"
        title="KaamSetu AI Assistant"
      >
        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          smart_toy
        </span>
      </button>

      {/* Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl flex flex-col max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-on-primary p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              <div>
                <div className="font-label-md font-bold text-sm leading-tight">KaamSetu AI Assistant</div>
                <div className="font-label-sm text-[10px] text-primary-fixed">कामसेतू AI सहाय्यक</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-on-primary hover:opacity-80">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[220px] max-h-[340px] bg-surface-container-low/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-on-primary font-medium rounded-tr-none'
                      : 'bg-surface-container-high text-on-surface rounded-tl-none border border-outline-variant/20'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-2xl text-xs animate-pulse">
                  AI is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-2 border-t border-surface-container-high flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI anything..."
              className="flex-1 rounded-xl bg-surface-container-low px-3 py-2 text-xs font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
