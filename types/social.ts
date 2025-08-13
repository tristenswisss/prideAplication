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
  interests: string[]        // always an array
  verified: boolean
  follower_count: number     // always a number
  following_count: number    // always a number
  post_count: number         // always a number
  is_online: boolean       // always a boolean
  created_at: string
  show_profile?: boolean
  show_activities?: boolean
  appear_in_search?: boolean
  allow_direct_messages?: boolean
  is_active?: boolean        // optional, defaults to true if not provided
  last_seen_at?: string      // optional, used for online status tracking
}


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
  business?: any
  event_id?: string
  event?: any
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

export interface PostShare {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

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
