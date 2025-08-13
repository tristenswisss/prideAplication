export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  pronouns?: string
  bio?: string
  location?: string
  verified: boolean
  created_at: string
  updated_at: string
  username?: string
  follower_count?: number
  following_count?: number
  post_count?: number
  interests?: string[]
  cover_image_url?: string
}

export interface UserProfile extends User {
  is_online?: boolean
  show_profile?: boolean
  show_activities?: boolean
  appear_in_search?: boolean
  allow_direct_messages?: boolean
}

export interface Business {
  id: string
  name: string
  description: string
  category: "restaurant" | "bar" | "healthcare" | "shopping" | "service" | "hotel" | "entertainment"
  address: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  image_url?: string
  rating: number
  review_count: number
  lgbtq_friendly: boolean
  trans_friendly: boolean
  wheelchair_accessible?: boolean
  verified: boolean
  owner_id?: string
  hours?: BusinessHours
  price_range?: "$" | "$$" | "$$$" | "$$$$"
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

export interface Event {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time?: string
  location: string
  latitude?: number
  longitude?: number
  image_url?: string
  organizer_id: string
  organizer?: User
  attendee_count: number
  max_attendees?: number
  category: "celebration" | "networking" | "entertainment" | "education" | "support" | "other"
  tags: string[]
  is_free: boolean
  price?: number
  created_at: string
  updated_at: string
}

export interface CreateEventData {
  title: string
  description: string
  date: string
  start_time: string
  end_time?: string
  location: string
  latitude?: number
  longitude?: number
  image_url?: string
  max_attendees?: number
  category: "celebration" | "networking" | "entertainment" | "education" | "support" | "other"
  tags: string[]
  is_free: boolean
  price?: number
}

export interface EventAttendee {
  id: string
  event_id: string
  user_id: string
  user?: User
  status: "going" | "interested" | "not_going"
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "event_reminder" | "new_event" | "review_response" | "friend_request" | "general"
  data?: any
  read: boolean
  created_at: string
}

export interface Review {
  id: string
  business_id: string
  user_id: string
  user?: User
  rating: number
  comment?: string
  safety_rating: number
  inclusivity_rating: number
  staff_friendliness: number
  accessibility_rating?: number
  would_recommend: boolean
  visit_date?: string
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  content: string
  image_url?: string
  user_id: string
  user?: User
  likes_count: number
  comments_count: number
  shares_count: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface SafeSpace {
  id: string
  name: string
  description: string
  category: "organization" | "healthcare" | "restaurant" | "drop_in_center" | "community_center" | "other"
  address: string
  city: string
  country: string
  location?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  hours?: Record<string, string>
  services: string[]
  accessibility_features: string[]
  lgbtq_friendly: boolean
  trans_friendly: boolean
  wheelchair_accessible: boolean
  verified: boolean
  rating?: number
  review_count?: number
  created_at: string
  updated_at: string
}

// Export LiveEvent from messaging.ts for consistency
export type { LiveEvent, LiveMessage } from "./messaging"
