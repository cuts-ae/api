# Real-time Chat System Documentation

## Overview

A production-quality real-time chat system built with Socket.io for the support feature. Includes WebSocket communication, typing indicators, read receipts, file uploads, and agent assignment.

## Features

- Real-time bidirectional communication via WebSocket
- Typing indicators
- Read receipts
- File/photo upload support (images, PDFs, documents)
- Chat session management
- Agent assignment and acceptance
- Message history persistence
- Automatic reconnection handling
- User presence tracking

## Architecture

### Database Schema

#### chat_sessions
- Manages chat sessions between customers and support agents
- Tracks session status: `waiting`, `active`, `resolved`, `closed`
- Links to tickets, restaurants, customers, and agents

#### chat_messages
- Stores all chat messages
- Supports multiple message types: `text`, `image`, `file`, `system`
- Tracks sender information and timestamps

#### message_attachments
- Stores file metadata for uploaded attachments
- Includes file name, type, size, and URLs

#### message_read_receipts
- Tracks which users have read which messages
- Enables read receipt functionality

#### typing_indicators
- Temporary storage for typing indicators
- Auto-expires after 10 seconds

### WebSocket Events

#### Client to Server

**Authentication**
```javascript
socket.auth = { token: 'JWT_TOKEN' };
```

**Join Session**
```javascript
socket.emit('join_session', {
  session_id: 'uuid'
});
```

**Send Message**
```javascript
socket.emit('send_message', {
  session_id: 'uuid',
  content: 'Message text',
  message_type: 'text',
  temp_id: 'client-generated-id'
});
```

**Typing Indicator**
```javascript
socket.emit('typing', {
  session_id: 'uuid'
});
```

**Stop Typing**
```javascript
socket.emit('stop_typing', {
  session_id: 'uuid'
});
```

**Mark as Read**
```javascript
socket.emit('mark_as_read', {
  session_id: 'uuid',
  message_ids: ['uuid1', 'uuid2']
});
```

**Accept Chat (Support Agent)**
```javascript
socket.emit('accept_chat', {
  session_id: 'uuid'
});
```

**Close Chat**
```javascript
socket.emit('close_chat', {
  session_id: 'uuid'
});
```

**Leave Session**
```javascript
socket.emit('leave_session', {
  session_id: 'uuid'
});
```

#### Server to Client

**Session Joined**
```javascript
socket.on('session_joined', (data) => {
  // data.session - session details
  // data.messages - message history
  // data.participants - current participants
});
```

**New Message**
```javascript
socket.on('new_message', (data) => {
  // data.message - the new message object
});
```

**Message Sent Confirmation**
```javascript
socket.on('message_sent', (data) => {
  // data.message_id - server-generated message ID
  // data.temp_id - client-provided temp ID
  // data.sent_at - timestamp
});
```

**User Typing**
```javascript
socket.on('user_typing', (data) => {
  // data.session_id
  // data.user_id
  // data.user_name
});
```

**Typing Stopped**
```javascript
socket.on('typing_stopped', (data) => {
  // data.session_id
  // data.user_id
});
```

**Messages Read**
```javascript
socket.on('messages_read', (data) => {
  // data.session_id
  // data.user_id
  // data.message_ids (optional)
});
```

**User Joined**
```javascript
socket.on('user_joined', (data) => {
  // data.user_id
  // data.role
  // data.name
});
```

**User Left**
```javascript
socket.on('user_left', (data) => {
  // data.user_id
  // data.role
});
```

**Chat Accepted**
```javascript
socket.on('chat_accepted', (data) => {
  // data.session - updated session
  // data.agent_id
  // data.agent_name
});
```

**Chat Closed**
```javascript
socket.on('chat_closed', (data) => {
  // data.session - updated session
  // data.closed_by - user ID who closed
});
```

**Session Status Changed**
```javascript
socket.on('session_status_changed', (data) => {
  // data.session_id
  // data.status
  // data.agent_id (if applicable)
});
```

**Error**
```javascript
socket.on('error', (data) => {
  // data.message - error message
});
```

### REST API Endpoints

#### Create Chat Session
```
POST /api/v1/chat/sessions
Authorization: Bearer {token}

Body:
{
  "subject": "Need help with order",
  "category": "order_issue",
  "priority": "high",
  "restaurant_id": "uuid",
  "initial_message": "My order is delayed"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "Need help with order",
    "status": "waiting",
    ...
  }
}
```

#### Get Active Sessions
```
GET /api/v1/chat/sessions
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "subject": "...",
      "status": "active",
      "unread_count": 3,
      ...
    }
  ]
}
```

#### Get Session Details
```
GET /api/v1/chat/sessions/:sessionId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "...",
    "status": "active",
    "unread_count": 3,
    "last_message": { ... }
  }
}
```

#### Get Session Messages
```
GET /api/v1/chat/sessions/:sessionId/messages?limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Hello",
      "sender_role": "customer",
      "created_at": "...",
      "attachments": [],
      "read_by": []
    }
  ]
}
```

#### Send Message with Attachments
```
POST /api/v1/chat/sessions/:sessionId/messages
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- content: "Check this screenshot"
- message_type: "image"
- attachments: [File1, File2]

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "Check this screenshot",
    "attachments": [
      {
        "file_name": "screenshot.png",
        "file_url": "/uploads/chat-attachments/...",
        ...
      }
    ]
  }
}
```

#### Upload Attachment (Pre-upload)
```
POST /api/v1/chat/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- attachments: [File1, File2]

Response:
{
  "success": true,
  "data": [
    {
      "file_name": "document.pdf",
      "file_url": "/uploads/chat-attachments/...",
      "file_size": 102400,
      "file_type": "application/pdf"
    }
  ]
}
```

#### Mark Messages as Read
```
POST /api/v1/chat/sessions/:sessionId/read
Authorization: Bearer {token}

Body (optional):
{
  "message_ids": ["uuid1", "uuid2"]
}

Response:
{
  "success": true,
  "message": "Messages marked as read"
}
```

#### Assign Agent (Support Only)
```
POST /api/v1/chat/sessions/:sessionId/assign
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "agent_id": "uuid",
    ...
  }
}
```

#### Update Session Status
```
PATCH /api/v1/chat/sessions/:sessionId/status
Authorization: Bearer {token}

Body:
{
  "status": "closed"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "closed",
    ...
  }
}
```

## Client Implementation Example

```javascript
import io from 'socket.io-client';

class ChatClient {
  constructor(serverUrl, authToken) {
    this.socket = io(serverUrl, {
      auth: { token: authToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupEventHandlers();
    this.typingTimeout = null;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    this.socket.on('session_joined', (data) => {
      console.log('Joined session:', data.session.id);
      this.displayMessages(data.messages);
    });

    this.socket.on('new_message', (data) => {
      this.appendMessage(data.message);
    });

    this.socket.on('user_typing', (data) => {
      this.showTypingIndicator(data.user_name);
    });

    this.socket.on('typing_stopped', (data) => {
      this.hideTypingIndicator(data.user_id);
    });

    this.socket.on('messages_read', (data) => {
      this.updateReadReceipts(data);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });
  }

  joinSession(sessionId) {
    this.socket.emit('join_session', { session_id: sessionId });
  }

  sendMessage(sessionId, content, messageType = 'text') {
    const tempId = `temp-${Date.now()}`;
    this.socket.emit('send_message', {
      session_id: sessionId,
      content,
      message_type: messageType,
      temp_id: tempId
    });
    return tempId;
  }

  handleTyping(sessionId) {
    this.socket.emit('typing', { session_id: sessionId });

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.socket.emit('stop_typing', { session_id: sessionId });
    }, 3000);
  }

  markAsRead(sessionId, messageIds = null) {
    this.socket.emit('mark_as_read', {
      session_id: sessionId,
      message_ids: messageIds
    });
  }

  leaveSession(sessionId) {
    this.socket.emit('leave_session', { session_id: sessionId });
  }

  disconnect() {
    this.socket.disconnect();
  }

  displayMessages(messages) {
    // Implementation
  }

  appendMessage(message) {
    // Implementation
  }

  showTypingIndicator(userName) {
    // Implementation
  }

  hideTypingIndicator(userId) {
    // Implementation
  }

  updateReadReceipts(data) {
    // Implementation
  }
}

export default ChatClient;
```

## Error Handling

The system includes comprehensive error handling:

1. **Authentication Errors**: Invalid or missing tokens
2. **Authorization Errors**: Unauthorized access to sessions
3. **Validation Errors**: Invalid data or missing required fields
4. **Connection Errors**: Network issues, reconnection logic
5. **File Upload Errors**: Invalid file types, size limits exceeded

## File Upload Limits

- Maximum file size: 10MB
- Maximum files per upload: 5
- Allowed types:
  - Images: JPEG, JPG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT

## Database Migration

Run the migration to set up chat tables:

```bash
psql -d your_database -f database/chat-system-migration.sql
```

## Environment Variables

No additional environment variables required. Uses existing:
- `JWT_SECRET` - for WebSocket authentication
- `PORT` - server port (default: 45000)

## Monitoring and Maintenance

1. **Typing Indicator Cleanup**: Automatic cleanup every 30 seconds
2. **Connection Monitoring**: Built-in ping/pong with Socket.io
3. **Error Logging**: Comprehensive console logging for debugging

## Security Features

1. **JWT Authentication**: All WebSocket connections require valid JWT
2. **Authorization Checks**: Session-level access control
3. **File Type Validation**: Only allowed file types can be uploaded
4. **File Size Limits**: Prevents abuse with 10MB limit
5. **CORS Protection**: Restricted origin access

## Performance Considerations

1. **Message Pagination**: Default 50 messages per request
2. **Connection Pooling**: PostgreSQL connection pooling
3. **Efficient Queries**: Indexed database queries
4. **Typing Indicator Throttling**: 10-second auto-expiry
5. **In-memory User Tracking**: Fast participant lookups

## Testing

The system can be tested using:
- Socket.io client library
- Postman (for REST endpoints)
- Browser DevTools (WebSocket tab)

## Production Deployment

1. Run database migration
2. Ensure upload directory permissions
3. Configure allowed CORS origins
4. Set up reverse proxy (nginx) for WebSocket support
5. Enable SSL/TLS for secure WebSocket (WSS)
