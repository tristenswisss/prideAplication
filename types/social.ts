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
  created_at: string
  updated_at: string
}

export type Business = {}

export interface Post {
  id: string
  user_id: string
  user?: UserProfile
  content: string
  images: string[]
  location?: {
    name: string
    latitude: number
    longitude: number
  }
  business_id?: string
  business?: Business
  event_id?: string
  event?: Event
  likes_count: number
  comments_count: number
  shares_count: number
  tags: string[]
  is_liked: boolean
  is_saved: boolean
  visibility: "public" | "followers" | "private"
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  user?: UserProfile
  content: string
  likes_count: number
  is_liked: boolean
  parent_id?: string
  replies?: Comment[]
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface SavedPost {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export type Event = {}

export interface PushNotification {
  id: string
  user_id: string
  title: string
  body: string
  data: any
  type: "nearby_event" | "new_follower" | "post_like" | "comment" | "event_reminder" | "business_update"
  sent_at: string
  read: boolean
}
