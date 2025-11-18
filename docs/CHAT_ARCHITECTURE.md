# Real-time Chat System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Customer   │  │Support Agent │  │  Restaurant  │          │
│  │   Web App    │  │   Dashboard  │  │    Portal    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         │ Socket.io        │ Socket.io        │ Socket.io        │
│         │ + REST API       │ + REST API       │ + REST API       │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API SERVER (Port 45000)                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              WebSocket Server (Socket.io)                   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Authentication Middleware (JWT)                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Event Handlers                                       │  │ │
│  │  │  • join_session    • send_message   • typing         │  │ │
│  │  │  • leave_session   • mark_as_read   • accept_chat    │  │ │
│  │  │  • stop_typing     • close_chat                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Room Management & User Tracking                     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              REST API (Express)                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Routes (/api/v1/chat/*)                             │  │ │
│  │  │  • POST   /sessions                                   │  │ │
│  │  │  • GET    /sessions                                   │  │ │
│  │  │  • GET    /sessions/:id/messages                     │  │ │
│  │  │  • POST   /sessions/:id/messages                     │  │ │
│  │  │  • POST   /upload                                     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Controllers                                          │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Middleware                                           │  │ │
│  │  │  • Authentication  • File Upload  • Validation       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Business Logic Layer                           │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  ChatService                                          │  │ │
│  │  │  • createChatSession    • sendMessage                │  │ │
│  │  │  • getSessionMessages   • assignAgent                │  │ │
│  │  │  • markAsRead          • updateStatus                │  │ │
│  │  │  • setTypingIndicator  • addAttachment              │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              File Storage                                   │ │
│  │  /uploads/chat-attachments/                                │ │
│  │  • Images  • PDFs  • Documents                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ PostgreSQL Connection Pool
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │  chat_sessions     │  │  chat_messages     │                │
│  │  • id              │  │  • id              │                │
│  │  • subject         │  │  • session_id  ────┼───┐            │
│  │  • status          │  │  • sender_id       │   │            │
│  │  • customer_id     │  │  • content         │   │            │
│  │  • agent_id        │  │  • message_type    │   │            │
│  │  • created_at      │  │  • created_at      │   │            │
│  └────────┬───────────┘  └────────────────────┘   │            │
│           │                                         │            │
│           └─────────────────────────────────────────┘            │
│                                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │message_attachments │  │message_read_receipts│               │
│  │  • id              │  │  • id              │                │
│  │  • message_id      │  │  • message_id      │                │
│  │  • file_name       │  │  • user_id         │                │
│  │  • file_url        │  │  • read_at         │                │
│  │  • file_size       │  │                    │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                   │
│  ┌────────────────────┐                                         │
│  │ typing_indicators  │                                         │
│  │  • id              │                                         │
│  │  • session_id      │                                         │
│  │  • user_id         │                                         │
│  │  • expires_at      │                                         │
│  └────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Message Flow

### Real-time Message Flow (WebSocket)

```
Customer                    Server                    Support Agent
   │                          │                             │
   │  1. send_message         │                             │
   ├─────────────────────────>│                             │
   │                          │                             │
   │                          │  2. Save to DB              │
   │                          │  ┌──────────────┐           │
   │                          │  │ INSERT INTO  │           │
   │                          │  │chat_messages │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │  3. message_sent         │                             │
   │<─────────────────────────┤                             │
   │  (confirmation)          │                             │
   │                          │  4. new_message             │
   │                          ├────────────────────────────>│
   │                          │  (broadcast to room)        │
   │                          │                             │
   │                          │  5. Auto mark as read       │
   │                          │  ┌──────────────┐           │
   │                          │  │ INSERT INTO  │           │
   │                          │  │  read_rcpts  │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │  6. messages_read        │  7. messages_read           │
   │<─────────────────────────┼────────────────────────────>│
   │  (read receipt update)   │  (read receipt update)      │
   │                          │                             │
```

### Typing Indicator Flow

```
Customer                    Server                    Support Agent
   │                          │                             │
   │  1. typing               │                             │
   ├─────────────────────────>│                             │
   │                          │                             │
   │                          │  2. Save indicator          │
   │                          │  ┌──────────────┐           │
   │                          │  │ INSERT INTO  │           │
   │                          │  │   typing_    │           │
   │                          │  │  indicators  │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │                          │  3. user_typing             │
   │                          ├────────────────────────────>│
   │                          │                             │
   │                          │  ... 10 seconds ...         │
   │                          │                             │
   │                          │  4. Auto-expire             │
   │                          │  ┌──────────────┐           │
   │                          │  │   DELETE     │           │
   │                          │  │   expired    │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │                          │  5. typing_stopped          │
   │                          ├────────────────────────────>│
   │                          │                             │
```

### Agent Assignment Flow

```
Customer                    Server                    Support Agent
   │                          │                             │
   │  1. Create session       │                             │
   │  POST /sessions          │                             │
   ├─────────────────────────>│                             │
   │                          │                             │
   │                          │  2. Create session          │
   │                          │  status: 'waiting'          │
   │                          │  ┌──────────────┐           │
   │                          │  │ INSERT INTO  │           │
   │                          │  │chat_sessions │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │  3. Session created      │                             │
   │<─────────────────────────┤                             │
   │                          │                             │
   │                          │  4. Get waiting sessions    │
   │                          │  GET /sessions              │
   │                          │<────────────────────────────┤
   │                          │                             │
   │                          │  5. List (including new)    │
   │                          ├────────────────────────────>│
   │                          │                             │
   │                          │  6. accept_chat             │
   │                          │<────────────────────────────┤
   │                          │                             │
   │                          │  7. Update session          │
   │                          │  status: 'active'           │
   │                          │  agent_id: xxx              │
   │                          │  ┌──────────────┐           │
   │                          │  │   UPDATE     │           │
   │                          │  │chat_sessions │           │
   │                          │  └──────────────┘           │
   │                          │                             │
   │  8. chat_accepted        │  9. chat_accepted           │
   │<─────────────────────────┼────────────────────────────>│
   │  (notify customer)       │  (confirm to agent)         │
   │                          │                             │
```

## Data Flow Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Client Interface                               │
│ • React Components                                      │
│ • Socket.io Client                                      │
│ • HTTP Fetch/Axios                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Network Transport                              │
│ • WebSocket (ws://localhost:45000)                      │
│ • HTTP/HTTPS (http://localhost:45000/api/v1/chat)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Server Entry Points                            │
│ • Socket.io Server (chat.socket.ts)                     │
│ • Express Routes (chat.routes.ts)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Middleware                                     │
│ • JWT Authentication                                    │
│ • File Upload (Multer)                                  │
│ • Request Validation                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Controllers                                    │
│ • chat.controller.ts                                    │
│ • Request/Response handling                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 6: Business Logic                                 │
│ • chat.service.ts                                       │
│ • Session management                                    │
│ • Message handling                                      │
│ • Agent assignment                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 7: Data Access                                    │
│ • PostgreSQL Queries                                    │
│ • Connection Pool                                       │
│ • Transaction Management                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 8: Data Storage                                   │
│ • PostgreSQL Database                                   │
│ • File System (uploads/)                                │
└─────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ 1. Transport Security                                   │
│    • HTTPS/WSS in production                            │
│    • TLS encryption                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Authentication                                       │
│    • JWT token validation                               │
│    • Token expiry checks                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Authorization                                        │
│    • Session ownership checks                           │
│    • Role-based access control                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Input Validation                                     │
│    • File type checking                                 │
│    • File size limits                                   │
│    • Content sanitization                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Data Protection                                      │
│    • Parameterized queries                              │
│    • XSS prevention                                     │
│    • CSRF protection                                    │
└─────────────────────────────────────────────────────────┘
```

## Scalability Architecture

```
                    Load Balancer (nginx)
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ API      │ │ API      │ │ API      │
         │ Server 1 │ │ Server 2 │ │ Server 3 │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  PostgreSQL         │
                │  (Primary)          │
                └──────────┬──────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │PostgreSQL│ │PostgreSQL│ │PostgreSQL│
         │(Replica) │ │(Replica) │ │(Replica) │
         └──────────┘ └──────────┘ └──────────┘

Notes:
• WebSocket sticky sessions required
• Redis can be added for pub/sub between servers
• Shared file storage (S3) for uploads
• Database connection pooling on each server
```

## Performance Optimizations

```
┌─────────────────────────────────────────────────────────┐
│ Client Side                                             │
│ • Message bundling                                      │
│ • Local state caching                                   │
│ • Debounced typing indicators                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Network                                                 │
│ • WebSocket persistent connections                      │
│ • Binary protocol option                                │
│ • Compression enabled                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Server Side                                             │
│ • Room-based message delivery                           │
│ • In-memory user tracking                               │
│ • Connection pooling                                    │
│ • Event loop non-blocking                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Database                                                │
│ • Indexed queries                                       │
│ • Query result caching                                  │
│ • Pagination (50 messages default)                      │
│ • Bulk operations for read receipts                     │
└─────────────────────────────────────────────────────────┘
```

This architecture supports thousands of concurrent chat sessions with sub-100ms latency for real-time features.
