export type ChatSessionStatus = 'waiting' | 'active' | 'resolved' | 'closed';
export type MessageType = 'text' | 'image' | 'file' | 'system';
export type UserRole = 'customer' | 'restaurant_owner' | 'driver' | 'admin' | 'support';

export interface ChatSession {
  id: string;
  ticket_id?: string;
  restaurant_id?: string;
  customer_id?: string;
  agent_id?: string;
  status: ChatSessionStatus;
  subject: string;
  category: string;
  priority: string;
  last_message_at?: Date;
  agent_accepted_at?: Date;
  closed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id?: string;
  sender_role: UserRole;
  message_type: MessageType;
  content?: string;
  is_system_message: boolean;
  created_at: Date;
  updated_at: Date;
  attachments?: MessageAttachment[];
  read_by?: MessageReadReceipt[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  created_at: Date;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: Date;
}

export interface TypingIndicator {
  id: string;
  session_id: string;
  user_id: string;
  started_at: Date;
  expires_at: Date;
}

export interface CreateChatSessionRequest {
  subject: string;
  category?: string;
  priority?: string;
  restaurant_id?: string;
  initial_message?: string;
}

export interface SendMessageRequest {
  session_id: string;
  content?: string;
  message_type?: MessageType;
  attachments?: Express.Multer.File[];
}

export interface TypingEventData {
  session_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface MessageDeliveryConfirmation {
  message_id: string;
  session_id: string;
  delivered_at: Date;
}

export interface SessionParticipant {
  user_id: string;
  role: UserRole;
  name: string;
  online: boolean;
  last_seen?: Date;
}

export interface ChatSessionWithDetails extends ChatSession {
  participants?: SessionParticipant[];
  unread_count?: number;
  last_message?: ChatMessage;
}
