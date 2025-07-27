export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender?: UserProfile
  content: string
  message_type: "text" | "image" | "location" | "event_share"
  metadata?: {
    image_url?: string
    location?: {
      name: string
      latitude: number
      longitude: number
    }
    event_id?: string
  }
  read: boolean
  sent_at: string
  delivered_at?: string
  read_at?: string
}

export interface Conversation {
  id: string
  participants: string[]
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
  cover_image_url?: string
  bio?: string
  pronouns?: string
  location?: string
  interests: string[]
  verified: boolean
  follower_count: number
  following_count: number
  post_count: number
  is_online: boolean
  last_seen?: string
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
  started_at?: string
  ended_at?: string
  max_viewers: number
  chat_enabled: boolean
  created_at: string
}

export interface LiveMessage {
  id: string
  live_event_id: string
  user_id: string
  user?: UserProfile
  content: string
  message_type: "chat" | "join" | "leave" | "reaction"
  metadata?: {
    reaction?: string
  }
  sent_at: string
}
