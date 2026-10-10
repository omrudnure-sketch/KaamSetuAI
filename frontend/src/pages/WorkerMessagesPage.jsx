import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyConversations, getMessages, sendMessage, markMessageRead } from '../services/chatService.js';
import { translateChatMessage } from '../services/aiService.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { Send, Globe, MessageSquare, ArrowLeft, Check, CheckCheck, Languages, Sparkles } from 'lucide-react';

export const WorkerMessagesPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [lang, setLang] = useState('en');
  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Message Translation State (Step 23.5)
  const [messageTranslations, setMessageTranslations] = useState({});
  const [translatingMsgId, setTranslatingMsgId] = useState(null);

  const handleTranslateMsg = async (msgId, targetLang) => {
    try {
      setTranslatingMsgId(msgId);
      const res = await translateChatMessage(msgId, targetLang);
      if (res.success && res.data) {
        setMessageTranslations((prev) => ({
          ...prev,
          [msgId]: {
            translatedText: res.data.translatedContent,
            targetLang,
            showTranslated: true,
          },
        }));
      }
    } catch (_err) {
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const toggleMsgTranslation = (msgId) => {
    setMessageTranslations((prev) => {
      const existing = prev[msgId];
      if (!existing) return prev;
      return {
        ...prev,
        [msgId]: {
          ...existing,
          showTranslated: !existing.showTranslated,
        },
      };
    });
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversationMessages(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (newMsg) => {
      if (activeConv && newMsg.conversationId === activeConv._id) {
        setMessages((prev) => [...prev, newMsg]);
        if (newMsg.senderId !== user.id) {
          markMessageRead(newMsg._id).catch(() => {});
        }
      }
      fetchConversations();
    });

    socket.on('typing:start', (data) => {
      if (activeConv && data.conversationId === activeConv._id && data.userId !== user.id) {
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', (data) => {
      if (activeConv && data.conversationId === activeConv._id && data.userId !== user.id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [socket, activeConv]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await getMyConversations();
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (_err) {
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (cId) => {
    try {
      const res = await getMessages(cId);
      if (res.success && res.data) {
        setMessages(res.data);
      }
      const conv = conversations.find((c) => c._id === cId);
      if (conv) setActiveConv(conv);

      if (socket) {
        socket.emit('conversation:join', { conversationId: cId });
      }
    } catch (_err) {}
  };

  const handleSelectConversation = (conv) => {
    setActiveConv(conv);
    navigate(`/worker/messages/${conv._id}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !activeConv) return;

    const content = textInput.trim();
    setTextInput('');

    try {
      const res = await sendMessage(activeConv._id, { content });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        fetchConversations();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  const getOtherParticipantName = (conv) => {
    const other = conv.participants?.find((p) => p._id !== user.id);
    return other?.name || 'User';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Top Header & Language Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages & Chat</h1>
          <p className="text-gray-600 text-sm mt-1">Real-time messaging with employers and project contacts</p>
        </div>
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

      {/* Main Chat Layout */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
        {/* Sidebar Conversations List */}
        <div className={`border-r border-gray-100 flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Conversations</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-xs text-gray-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No active conversations found.</div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[500px]">
              {conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    conversationId === conv._id ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">{getOtherParticipantName(conv)}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{conv.lastMessage || 'Click to open conversation'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className={`md:col-span-2 flex flex-col justify-between ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/worker/messages')} className="md:hidden text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{getOtherParticipantName(activeConv)}</h3>
                    <p className="text-xs text-gray-500">
                      {activeConv.projectId?.name || activeConv.jobId?.title || 'Project Conversation'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="p-4 overflow-y-auto max-h-[420px] flex-1 space-y-3 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-12">No messages yet. Send a greeting to start chatting!</div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user.id || m.senderId?._id === user.id;
                    return (
                      <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1.5 shadow-sm ${
                            isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border text-gray-900 rounded-bl-none'
                          }`}
                        >
                          {/* Translated indicator badge */}
                          {messageTranslations[m._id]?.showTranslated && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Translated ({messageTranslations[m._id]?.targetLang?.toUpperCase()})</span>
                            </div>
                          )}

                          <p className="leading-relaxed">
                            {messageTranslations[m._id]?.showTranslated
                              ? messageTranslations[m._id]?.translatedText
                              : m.content}
                          </p>

                          <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-black/5">
                            {/* Translation action buttons */}
                            <div className="flex items-center gap-1 text-[10px]">
                              {messageTranslations[m._id] ? (
                                <button
                                  type="button"
                                  onClick={() => toggleMsgTranslation(m._id)}
                                  className="underline opacity-80 hover:opacity-100"
                                >
                                  {messageTranslations[m._id].showTranslated ? 'Original' : 'Translated'}
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                                  {translatingMsgId === m._id ? (
                                    <span className="animate-pulse">Translating...</span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleTranslateMsg(m._id, 'mr')}
                                        className="hover:underline font-semibold"
                                      >
                                        मराठी
                                      </button>
                                      <span>·</span>
                                      <button
                                        type="button"
                                        onClick={() => handleTranslateMsg(m._id, 'hi')}
                                        className="hover:underline font-semibold"
                                      >
                                        हिंदी
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className={`flex items-center gap-1 text-[10px] ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (m.readAt ? <CheckCheck className="w-3 h-3 text-cyan-300" /> : <Check className="w-3 h-3" />)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {isTyping && <div className="text-xs text-gray-400 italic">Other party is typing...</div>}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400 space-y-2">
              <MessageSquare className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-medium">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerMessagesPage;
