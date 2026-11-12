import React from 'react';
import { useParams } from 'react-router-dom';
import WhatsAppChatLayout from '../components/chat/WhatsAppChatLayout.jsx';

export const WorkerMessagesPage = () => {
  const { conversationId } = useParams();

  return (
    <div className="py-4 px-2 sm:px-4 max-w-7xl mx-auto">
      <WhatsAppChatLayout portalRole="worker" selectedConversationId={conversationId} />
    </div>
  );
};

export default WorkerMessagesPage;
