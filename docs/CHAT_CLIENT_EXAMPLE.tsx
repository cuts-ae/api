import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_role: string;
  sender_name?: string;
  message_type: string;
  created_at: string;
  attachments?: Attachment[];
  read_by?: ReadReceipt[];
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

interface ReadReceipt {
  user_id: string;
  read_at: string;
}

interface ChatSession {
  id: string;
  subject: string;
  status: string;
  unread_count?: number;
}

interface ChatWindowProps {
  sessionId: string;
  authToken: string;
  currentUserId: string;
  serverUrl?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  sessionId,
  authToken,
  currentUserId,
  serverUrl = 'http://localhost:45000'
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketInstance = io(serverUrl, {
      auth: { token: authToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      socketInstance.emit('join_session', { session_id: sessionId });
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socketInstance.on('session_joined', (data) => {
      console.log('Session joined:', data);
      setSession(data.session);
      setMessages(data.messages || []);
    });

    socketInstance.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);

      if (data.message.sender_id !== currentUserId) {
        socketInstance.emit('mark_as_read', {
          session_id: sessionId,
          message_ids: [data.message.id]
        });
      }
    });

    socketInstance.on('user_typing', (data) => {
      if (data.user_id !== currentUserId) {
        setTypingUsers(prev => new Set([...prev, data.user_name || data.user_id]));
      }
    });

    socketInstance.on('typing_stopped', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
    });

    socketInstance.on('messages_read', (data) => {
      if (data.user_id !== currentUserId) {
        setMessages(prev => prev.map(msg => ({
          ...msg,
          read_by: [
            ...(msg.read_by || []),
            { user_id: data.user_id, read_at: new Date().toISOString() }
          ]
        })));
      }
    });

    socketInstance.on('chat_accepted', (data) => {
      setSession(data.session);
      console.log('Chat accepted by agent:', data.agent_name);
    });

    socketInstance.on('chat_closed', (data) => {
      setSession(data.session);
      console.log('Chat closed');
    });

    socketInstance.on('error', (data) => {
      console.error('Socket error:', data.message);
      alert(`Error: ${data.message}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leave_session', { session_id: sessionId });
      socketInstance.disconnect();
    };
  }, [sessionId, authToken, serverUrl, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing', { session_id: sessionId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { session_id: sessionId });
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!socket || (!newMessage.trim() && attachments.length === 0)) return;

    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('message_type', attachments[0].type.startsWith('image/') ? 'image' : 'file');

      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      try {
        const response = await fetch(`${serverUrl}/api/v1/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });

        if (response.ok) {
          setNewMessage('');
          setAttachments([]);
          socket.emit('stop_typing', { session_id: sessionId });
        }
      } catch (error) {
        console.error('Error sending message with attachments:', error);
      }
    } else {
      socket.emit('send_message', {
        session_id: sessionId,
        content: newMessage,
        message_type: 'text',
        temp_id: `temp-${Date.now()}`
      });

      setNewMessage('');
      socket.emit('stop_typing', { session_id: sessionId });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5);
      setAttachments(files);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isMessageRead = (message: Message) => {
    return message.read_by && message.read_by.some(r => r.user_id !== currentUserId);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{session?.subject || 'Chat'}</h3>
        <div className="status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender_id === currentUserId ? 'sent' : 'received'} ${message.is_system_message ? 'system' : ''}`}
          >
            {message.sender_id !== currentUserId && (
              <div className="message-sender">{message.sender_name || message.sender_role}</div>
            )}

            {message.content && (
              <div className="message-content">{message.content}</div>
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="message-attachments">
                {message.attachments.map((att) => (
                  <div key={att.id} className="attachment">
                    {att.file_type.startsWith('image/') ? (
                      <img src={`${serverUrl}${att.file_url}`} alt={att.file_name} />
                    ) : (
                      <a href={`${serverUrl}${att.file_url}`} target="_blank" rel="noopener noreferrer">
                        {att.file_name}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="message-meta">
              <span className="message-time">{formatTime(message.created_at)}</span>
              {message.sender_id === currentUserId && (
                <span className="read-receipt">
                  {isMessageRead(message) ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        ))}

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {session?.status !== 'closed' && (
        <div className="chat-input">
          {attachments.length > 0 && (
            <div className="selected-attachments">
              {attachments.map((file, idx) => (
                <div key={idx} className="attachment-preview">
                  {file.name}
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
            <input
              type="file"
              id="file-input"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <button
              className="attach-button"
              onClick={() => document.getElementById('file-input')?.click()}
              title="Attach file"
            >
              📎
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              disabled={!isConnected || session?.status === 'closed'}
            />

            <button
              onClick={handleSendMessage}
              disabled={!isConnected || (!newMessage.trim() && attachments.length === 0)}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {session?.status === 'closed' && (
        <div className="chat-closed-notice">
          This chat session has been closed.
        </div>
      )}
    </div>
  );
};

export default ChatWindow;

// CSS Styles (add to your stylesheet)
const styles = `
.chat-window {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.connected {
  background: #22c55e;
}

.status-indicator.disconnected {
  background: #ef4444;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.message {
  margin-bottom: 16px;
  max-width: 70%;
}

.message.sent {
  margin-left: auto;
  text-align: right;
}

.message.received {
  margin-right: auto;
}

.message.system {
  margin: 8px auto;
  max-width: 90%;
  text-align: center;
  font-style: italic;
  opacity: 0.7;
}

.message-sender {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.message-content {
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message.sent .message-content {
  background: #0084ff;
  color: white;
}

.message-attachments {
  margin-top: 8px;
}

.message-attachments img {
  max-width: 100%;
  border-radius: 8px;
}

.message-meta {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.read-receipt {
  color: #0084ff;
}

.typing-indicator {
  font-size: 14px;
  color: #666;
  font-style: italic;
  padding: 8px;
}

.chat-input {
  border-top: 1px solid #ddd;
  background: white;
}

.selected-attachments {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f5f5;
  flex-wrap: wrap;
}

.attachment-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  font-size: 14px;
}

.attachment-preview button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.input-row {
  display: flex;
  gap: 8px;
  padding: 16px;
}

.attach-button {
  padding: 8px 12px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
}

.input-row input[type="text"] {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.send-button {
  padding: 12px 24px;
  background: #0084ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chat-closed-notice {
  padding: 16px;
  background: #fff3cd;
  color: #856404;
  text-align: center;
  font-weight: 500;
}
`;
