export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender?: UserProfile
  content: string
  type: "text" | "image" | "location" | "system"
  read: boolean
  sent_at: string
  created_at: string
  updated_at: string
   message_type: "text" | "image" | "video" | "file"
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  participants: UserProfile[]
  participant_profiles?: UserProfile[]
  last_message?: Message
  unread_count: number
  is_group: boolean
  group_name?: string
  group_avatar?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  username?: string
  avatar_url?: string
  bio?: string
  verified: boolean
  is_online?: boolean
  created_at: string
  updated_at: string
}

export interface LiveEvent {
  id: string
  event_id: string
  title: string
  description: string
  host_id: string
  host?: UserProfile
  stream_url?: string
  is_live: boolean
  viewer_count: number
  max_viewers?: number
  scheduled_start?: string
  actual_start?: string
  ended_at?: string
  created_at: string
}

export interface LiveMessage {
  id: string
  live_event_id: string
  user_id: string
  user?: UserProfile
  content: string
  type: "message" | "join" | "leave" | "system"
  created_at: string
}

export interface LiveReaction {
  id: string
  live_event_id: string
  user_id: string
  reaction: "like" | "love" | "laugh" | "wow" | "sad" | "angry"
  created_at: string
}
