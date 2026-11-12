import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Check,
  CheckCheck,
  ArrowLeft,
  Search,
  X,
  Languages,
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  getMyConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessageRead,
  getPendingRequests,
  respondToChatRequest,
  uploadChatImage,
  uploadChatAudio,
} from '../../services/chatService.js';
import { translateChatMessage } from '../../services/aiService.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import AudioBubblePlayer from './AudioBubblePlayer.jsx';
import VoiceRecorder from './VoiceRecorder.jsx';
import ImageLightboxModal from './ImageLightboxModal.jsx';
import { getSocketBaseUrl } from '../../services/api.js';

export const WhatsAppChatLayout = ({ portalRole = 'worker', selectedConversationId = null }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'requests'
  const [conversations, setConversations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Media recording & uploading state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Translation State
  const [messageTranslations, setMessageTranslations] = useState({});
  const [translatingMsgId, setTranslatingMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    loadData();
  }, []);

  // Sync selectedConversationId route param
  useEffect(() => {
    if (selectedConversationId) {
      selectConversationById(selectedConversationId);
    }
  }, [selectedConversationId, conversations]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (activeConv && (newMsg.conversationId === activeConv._id || newMsg.conversationId === activeConv.id)) {
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id) === (newMsg._id || newMsg.id))) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.senderId !== user.id) {
          markMessageRead(newMsg._id || newMsg.id).catch(() => {});
        }
      }
      loadConversationsOnly();
    };

    const handleReadReceipt = ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          (msg._id || msg.id) === messageId ? { ...msg, isRead: true, readAt } : msg
        )
      );
    };

    const handleChatRequestReceived = () => {
      loadData();
    };

    const handleChatRequestAccepted = ({ conversationId }) => {
      loadData();
      if (activeConv && (activeConv._id === conversationId || activeConv.id === conversationId)) {
        setActiveConv((prev) => ({ ...prev, status: 'accepted' }));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleReadReceipt);
    socket.on('chat_request:received', handleChatRequestReceived);
    socket.on('chat_request:accepted', handleChatRequestAccepted);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleReadReceipt);
      socket.off('chat_request:received', handleChatRequestReceived);
      socket.off('chat_request:accepted', handleChatRequestAccepted);
    };
  }, [socket, activeConv, user]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, imagePreviewUrl]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [convRes, reqRes] = await Promise.all([
        getMyConversations(),
        getPendingRequests().catch(() => ({ data: { incoming: [], outgoing: [] } })),
      ]);

      const convList = convRes?.data || [];
      setConversations(convList);

      const pendingData = reqRes?.data || { incoming: [], outgoing: [] };
      setPendingRequests(pendingData);

      // If route param specified a conversation, select it
      if (selectedConversationId) {
        const found = convList.find((c) => (c._id || c.id) === selectedConversationId);
        if (found) {
          setActiveConv(found);
          loadMessages(found._id || found.id);
        } else {
          // Attempt direct fetch
          try {
            const single = await getConversation(selectedConversationId);
            if (single?.data) {
              setActiveConv(single.data);
              loadMessages(single.data._id || single.data.id);
            }
          } catch (_e) {}
        }
      }
    } catch (err) {
      console.error('Failed to load chat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationsOnly = async () => {
    try {
      const res = await getMyConversations();
      setConversations(res?.data || []);
      const reqRes = await getPendingRequests().catch(() => ({ data: { incoming: [], outgoing: [] } }));
      setPendingRequests(reqRes?.data || { incoming: [], outgoing: [] });
    } catch (_e) {}
  };

  const selectConversationById = (convId) => {
    const found = conversations.find((c) => (c._id || c.id) === convId);
    if (found) {
      setActiveConv(found);
      loadMessages(found._id || found.id);
    }
  };

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    const convId = conv._id || conv.id;
    navigate(`/${portalRole}/messages/${convId}`);
    loadMessages(convId);

    // Join room via socket
    if (socket) {
      socket.emit('conversation:join', { conversationId: convId });
    }
  };

  const loadMessages = async (convId) => {
    try {
      const res = await getMessages(convId);
      const msgList = res?.data || [];
      setMessages(msgList);

      // Mark unread messages as read
      msgList.forEach((m) => {
        const sender = (m.senderId?._id || m.senderId?.id || m.senderId)?.toString();
        if (sender !== user.id && !m.isRead) {
          markMessageRead(m._id || m.id).catch(() => {});
        }
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Chat Request Accept / Decline
  const handleRespondRequest = async (convId, action) => {
    try {
      await respondToChatRequest(convId, action);
      await loadData();
      if (action === 'accept') {
        const updated = await getConversation(convId);
        if (updated?.data) {
          handleSelectConv(updated.data);
          setActiveTab('chats');
        }
      } else {
        if (activeConv && (activeConv._id === convId || activeConv.id === convId)) {
          setActiveConv(null);
          navigate(`/${portalRole}/messages`);
        }
      }
    } catch (err) {
      console.error('Failed to respond to chat request:', err);
    }
  };

  // Send Text / Image Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!activeConv) return;
    if (!textInput.trim() && !selectedImageFile) return;

    try {
      setSending(true);
      const convId = activeConv._id || activeConv.id;

      let messagePayload = {
        messageType: 'text',
        content: textInput.trim(),
      };

      // Upload image first if attached
      if (selectedImageFile) {
        setUploadingMedia(true);
        const uploadRes = await uploadChatImage(convId, selectedImageFile);
        const fileData = uploadRes?.data;
        messagePayload = {
          messageType: 'image',
          content: textInput.trim() || '📷 Photo',
          attachmentUrl: fileData.fileUrl,
          attachmentName: fileData.fileName,
          attachmentSize: fileData.fileSize,
        };
        setSelectedImageFile(null);
        setImagePreviewUrl('');
      }

      const res = await sendMessage(convId, messagePayload);
      if (res?.data) {
        setMessages((prev) => [...prev, res.data]);
      }

      setTextInput('');
      loadConversationsOnly();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      setUploadingMedia(false);
    }
  };

  // Send Voice Note
  const handleSendVoiceNote = async (audioBlob, duration) => {
    if (!activeConv) return;
    try {
      setSending(true);
      const convId = activeConv._id || activeConv.id;
      const uploadRes = await uploadChatAudio(convId, audioBlob, duration);
      const fileData = uploadRes?.data;

      const messagePayload = {
        messageType: 'audio',
        content: `Voice note (${Math.round(duration)}s)`,
        attachmentUrl: fileData.fileUrl,
        attachmentName: fileData.fileName,
        attachmentSize: fileData.fileSize,
        duration: Math.round(duration),
      };

      const res = await sendMessage(convId, messagePayload);
      if (res?.data) {
        setMessages((prev) => [...prev, res.data]);
      }
      setIsRecordingVoice(false);
      loadConversationsOnly();
    } catch (err) {
      console.error('Failed to send voice note:', err);
    } finally {
      setSending(false);
    }
  };

  // File Picker Image Handler
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  // Translate Message
  const handleTranslateMsg = async (msgId, targetLang = 'mr') => {
    try {
      setTranslatingMsgId(msgId);
      const res = await translateChatMessage(msgId, targetLang);
      if (res?.success && res.data) {
        setMessageTranslations((prev) => ({
          ...prev,
          [msgId]: {
            translatedText: res.data.translatedContent,
            targetLang,
            showTranslated: true,
          },
        }));
      }
    } catch (err) {
      console.error('Translation error:', err);
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
        [msgId]: { ...existing, showTranslated: !existing.showTranslated },
      };
    });
  };

  // Participant resolution
  const getOtherParticipant = (conv) => {
    if (!conv) return null;
    const currentUserId = (user?.id || user?._id)?.toString();
    const list = Array.isArray(conv.participants) ? conv.participants : [];

    // Find participant that is not current user
    let other = list.find((p) => {
      const pId = (p?._id || p?.id || p)?.toString();
      return pId && pId !== currentUserId;
    });

    // Fallback to participantA / participantB if not matched in list
    if (!other) {
      const aId = (conv.participantA?._id || conv.participantA?.id || conv.participantA)?.toString();
      const bId = (conv.participantB?._id || conv.participantB?.id || conv.participantB)?.toString();
      if (aId && aId !== currentUserId) other = conv.participantA;
      else if (bId && bId !== currentUserId) other = conv.participantB;
    }

    if (!other && list.length > 0) {
      other = list[0];
    }

    const fallbackRole = portalRole === 'employer' ? 'Worker' : 'Employer';
    if (!other) {
      return { name: `${fallbackRole} Contact`, role: fallbackRole.toLowerCase() };
    }

    if (typeof other === 'string') {
      return { id: other, name: `${fallbackRole} Contact`, role: fallbackRole.toLowerCase() };
    }

    return other;
  };

  // Search Filter
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const other = getOtherParticipant(c);
    const q = searchQuery.toLowerCase();
    const nameMatch = other?.name?.toLowerCase().includes(q);
    const lastMsgMatch = c.lastMessage?.toLowerCase().includes(q);
    return nameMatch || lastMsgMatch;
  });

  const otherUser = activeConv ? getOtherParticipant(activeConv) : null;
  const isPendingRecipient =
    activeConv?.status === 'pending' &&
    activeConv?.initiatedBy?.toString() !== user?.id?.toString();
  const isPendingInitiator =
    activeConv?.status === 'pending' &&
    activeConv?.initiatedBy?.toString() === user?.id?.toString();

  const totalIncomingRequests = pendingRequests.incoming.length;

  return (
    <div className="flex h-[calc(100vh-5.5rem)] max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Lightbox Modal for High-Res Photos */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          caption={lightboxImage.caption}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* LEFT SIDEBAR: Conversations List & Requests */}
      <div
        className={`w-full md:w-96 flex flex-col border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/60 ${
          activeConv ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* User Profile & Tabs Header */}
        <div className="p-3.5 px-4 border-b border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold truncate leading-tight">{user?.name || 'My Messages'}</h2>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {portalRole === 'employer' ? 'Employer Workspace' : 'Worker Workspace'}
                </span>
              </div>
            </div>

            {/* End-to-End Safe Badge */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Encrypted</span>
            </div>
          </div>

          {/* Chats vs Requests Filter Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 dark:bg-white/5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={`py-1.5 rounded-lg transition-all ${
                activeTab === 'chats'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Chats ({conversations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`py-1.5 rounded-lg relative flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Requests</span>
              {totalIncomingRequests > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[10px] rounded-full font-extrabold animate-pulse">
                  {totalIncomingRequests}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 px-3 border-b border-slate-200 dark:border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List / Requests View */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {activeTab === 'requests' ? (
            /* Requests View */
            <div className="p-3 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Incoming Requests ({pendingRequests.incoming.length})
                </h4>
                {pendingRequests.incoming.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center italic">No pending chat requests</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.incoming.map((req) => {
                      const sender = getOtherParticipant(req);
                      const reqId = req._id || req.id;
                      return (
                        <div
                          key={reqId}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xs space-y-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                              {sender?.name ? sender.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold truncate">{sender?.name}</h5>
                              <span className="text-[10px] text-slate-500 font-medium capitalize">
                                {sender?.role || 'User'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2 rounded-lg italic">
                            "{req.requestMessage || 'Would like to connect with you'}"
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(reqId, 'accept')}
                              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespondRequest(reqId, 'reject')}
                              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {pendingRequests.outgoing.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Sent Requests ({pendingRequests.outgoing.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingRequests.outgoing.map((req) => {
                      const recipient = getOtherParticipant(req);
                      return (
                        <div
                          key={req._id || req.id}
                          className="p-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold">{recipient?.name}</span>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {req.requestMessage}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Awaiting response
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* All Chats View */
            <>
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium">No conversations found</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Initiate a chat request with any worker or employer to begin communicating.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const convId = conv._id || conv.id;
                  const isActive = activeConv && (activeConv._id === convId || activeConv.id === convId);
                  const other = getOtherParticipant(conv);
                  const isPending = conv.status === 'pending';

                  return (
                    <div
                      key={convId}
                      onClick={() => handleSelectConv(conv)}
                      className={`p-3 px-4 flex items-center gap-3 cursor-pointer transition-colors select-none ${
                        isActive
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                          : 'hover:bg-slate-100/60 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {other?.name ? other.name.charAt(0).toUpperCase() : (portalRole === 'employer' ? 'W' : 'E')}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white">
                            {other?.name || (portalRole === 'employer' ? 'Worker' : 'Employer')}
                          </h4>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            {conv.lastMessage || (isPending ? 'Pending chat request' : 'No messages yet')}
                          </p>

                          {isPending && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5]/30 dark:bg-[#0b141a] ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
        {!activeConv ? (
          /* Empty / Welcome State (WhatsApp Web Style) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
              <Send className="w-9 h-9 ml-1" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
              KaamSetu AI Real-Time Messaging
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              Connect instantly before and after hiring. Exchange text messages, site photos, and audio voice recordings directly with verified workers and employers.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white/70 dark:bg-white/5 py-2 px-4 rounded-full border border-slate-200 dark:border-white/10 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Real-time Socket.IO delivery with PostgreSQL persistence</span>
            </div>
          </div>
        ) : (
          /* Active Conversation View */
          <>
            {/* Chat Header */}
            <div className="p-3 px-4 border-b border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-950/80 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveConv(null);
                    navigate(`/${portalRole}/messages`);
                  }}
                  className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : (portalRole === 'employer' ? 'W' : 'E')}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold truncate text-slate-900 dark:text-white">
                      {otherUser?.name || (portalRole === 'employer' ? 'Worker' : 'Employer')}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 uppercase">
                      {otherUser?.role ? (otherUser.role === 'worker' ? 'Worker' : otherUser.role === 'employer' ? 'Employer' : otherUser.role) : (portalRole === 'employer' ? 'Worker' : 'Employer')}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    <span>Active Now</span>
                  </span>
                </div>
              </div>

              {/* Translation info tip */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-200/50 dark:bg-white/5 py-1 px-2.5 rounded-lg">
                  <Languages className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
                  <span>Translate Hindi/Marathi</span>
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <p className="text-xs font-semibold">Start the conversation</p>
                  <p className="text-[11px]">Send a message, site photo, or audio voice note below.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const msgId = msg._id || msg.id;
                  const sender = (msg.senderId?._id || msg.senderId?.id || msg.senderId)?.toString();
                  const isOutgoing = sender === user?.id?.toString();
                  const translation = messageTranslations[msgId];

                  if (msg.messageType === 'system') {
                    return (
                      <div key={msgId} className="flex justify-center my-2">
                        <span className="px-3 py-1 bg-slate-200/80 dark:bg-white/10 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msgId}
                      className={`flex flex-col group ${isOutgoing ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-2.5 px-3.5 shadow-sm transition-all ${
                          isOutgoing
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-white/5 rounded-tl-xs'
                        }`}
                      >
                        {/* Image message rendering */}
                        {msg.messageType === 'image' && msg.attachmentUrl && (
                          <div className="mb-1.5 rounded-xl overflow-hidden cursor-pointer group/img">
                            <img
                              src={
                                msg.attachmentUrl.startsWith('http') || msg.attachmentUrl.startsWith('blob:')
                                  ? msg.attachmentUrl
                                  : `${getSocketBaseUrl()}${msg.attachmentUrl}`
                              }
                              alt={msg.content || 'Photo'}
                              onClick={() =>
                                setLightboxImage({
                                  url: msg.attachmentUrl,
                                  caption: msg.content !== '📷 Photo' ? msg.content : '',
                                })
                              }
                              className="max-h-64 w-auto object-cover rounded-xl transition-transform group-hover/img:scale-[1.02]"
                            />
                          </div>
                        )}

                        {/* Audio voice note rendering */}
                        {msg.messageType === 'audio' && msg.attachmentUrl && (
                          <AudioBubblePlayer
                            audioUrl={msg.attachmentUrl}
                            duration={msg.duration || 0}
                            isOutgoing={isOutgoing}
                          />
                        )}

                        {/* Text Content */}
                        {msg.content && msg.messageType !== 'audio' && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {translation?.showTranslated ? translation.translatedText : msg.content}
                          </p>
                        )}

                        {/* Translation toggle snippet */}
                        {translation && (
                          <div className="mt-1 pt-1 border-t border-white/20 text-[10px] flex items-center justify-between">
                            <span className="opacity-80">
                              {translation.showTranslated ? `Translated (${translation.targetLang})` : 'Original'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleMsgTranslation(msgId)}
                              className="underline font-semibold ml-2 hover:opacity-100"
                            >
                              {translation.showTranslated ? 'View Original' : 'View Translation'}
                            </button>
                          </div>
                        )}

                        {/* Footer: Timestamp and Read ticks */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                            isOutgoing ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOutgoing && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-200 fill-current inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message Actions (AI Translate) on Hover / Below bubble */}
                      {!isOutgoing && msg.messageType === 'text' && (
                        <div className="flex items-center gap-1.5 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleTranslateMsg(msgId, 'mr')}
                            disabled={translatingMsgId === msgId}
                            className="hover:text-primary dark:hover:text-sky-400 flex items-center gap-1"
                          >
                            <Languages className="w-3 h-3" />
                            <span>मराठी</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleTranslateMsg(msgId, 'hi')}
                            disabled={translatingMsgId === msgId}
                            className="hover:text-primary dark:hover:text-sky-400 flex items-center gap-1"
                          >
                            <span>हिंदी</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleTranslateMsg(msgId, 'en')}
                            disabled={translatingMsgId === msgId}
                            className="hover:text-primary dark:hover:text-sky-400 flex items-center gap-1"
                          >
                            <span>English</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Drawer if Image Selected */}
            {imagePreviewUrl && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreviewUrl}
                    alt="Selected upload"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-white/10 shadow-xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                      {selectedImageFile?.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {(selectedImageFile?.size / 1024).toFixed(0)} KB • Ready to send
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageFile(null);
                      setImagePreviewUrl('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Controls / Input Area */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-950/80 shrink-0">
              {/* If request is pending and current user is recipient */}
              {isPendingRecipient ? (
                <div className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Chat request pending your response
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Accept this request to unlock direct text, photos, and audio voice communication.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleRespondRequest(activeConv._id || activeConv.id, 'accept')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      Accept Request
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespondRequest(activeConv._id || activeConv.id, 'reject')}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : isPendingInitiator ? (
                /* If request is pending and current user is initiator */
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Waiting for {otherUser?.name || 'the other party'} to accept your chat request.</span>
                </div>
              ) : isRecordingVoice ? (
                /* Voice Recorder Widget Active */
                <VoiceRecorder
                  onSendAudio={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                /* Standard WhatsApp Input Bar */
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Hidden File Input for Image */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95 shadow-2xs"
                    title="Attach image"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={selectedImageFile ? 'Add a caption...' : 'Type a message...'}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  {/* Mic / Voice Note Button */}
                  {!textInput.trim() && !selectedImageFile ? (
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-transform active:scale-95 shadow-md"
                      title="Record voice note"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : (
                    /* Send Button */
                    <button
                      type="submit"
                      disabled={sending || uploadingMedia}
                      className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-transform active:scale-95 shadow-md disabled:opacity-50"
                      title="Send message"
                    >
                      <Send className="w-5 h-5 ml-0.5 fill-current" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChatLayout;

