import { storage } from "../lib/storage"
import type { UserProfile } from "../types/social"

export interface BuddyProfile extends Omit<UserProfile, "location"> {
  location?: {
    latitude: number
    longitude: number
    city: string
  }
  safetyRating: number
  buddyPreferences: {
    ageRange: [number, number]
    interests: string[]
    meetupTypes: string[]
    maxDistance: number
  }
  verificationStatus: "pending" | "verified" | "rejected"
  lastActive: string
  responseRate: number
  meetupCount: number
}

export interface BuddyRequest {
  id: string
  from_user_id: string
  to_user_id: string
  message: string
  status: "pending" | "accepted" | "rejected"
  created_at: string
  updated_at: string
}

export interface BuddyMatch {
  id: string
  user1_id: string
  user2_id: string
  compatibility_score: number
  matched_interests: string[]
  distance: number
  created_at: string
}

export interface SafetyCheckIn {
  id: string
  user_id: string
  buddy_id: string
  location: {
    latitude: number
    longitude: number
  }
  status: "safe" | "need_help" | "emergency"
  message?: string
  created_at: string
}

export interface Meetup {
  id: string
  organizer_id: string
  buddy_id: string
  title: string
  description: string
  location: {
    name: string
    latitude: number
    longitude: number
  }
  scheduled_time: string
  status: "planned" | "confirmed" | "completed" | "cancelled"
  safety_plan: {
    check_in_time: string
    emergency_contact: string
    safe_word: string
  }
  created_at: string
}

export const buddySystemService = {
  // Get potential buddy matches
  getBuddyMatches: async (userId: string): Promise<BuddyMatch[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Mock buddy matches
    const mockMatches: BuddyMatch[] = [
      {
        id: "match1",
        user1_id: userId,
        user2_id: "user2",
        compatibility_score: 85,
        matched_interests: ["hiking", "coffee", "lgbtq+ events"],
        distance: 2.5,
        created_at: new Date().toISOString(),
      },
      {
        id: "match2",
        user1_id: userId,
        user2_id: "user3",
        compatibility_score: 78,
        matched_interests: ["art", "museums", "pride events"],
        distance: 4.2,
        created_at: new Date().toISOString(),
      },
    ]

    return mockMatches
  },

  // Send buddy request
  sendBuddyRequest: async (fromUserId: string, toUserId: string, message: string): Promise<BuddyRequest> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const request: BuddyRequest = {
      id: Math.random().toString(36).substr(2, 9),
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Store request locally
    const requests = (await storage.getItem<BuddyRequest[]>("buddy_requests")) || []
    requests.push(request)
    await storage.setItem("buddy_requests", requests)

    return request
  },

  // Get buddy requests
  getBuddyRequests: async (userId: string): Promise<BuddyRequest[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const requests = (await storage.getItem<BuddyRequest[]>("buddy_requests")) || []
    return requests.filter((req) => req.to_user_id === userId || req.from_user_id === userId)
  },

  // Respond to buddy request
  respondToBuddyRequest: async (requestId: string, response: "accepted" | "rejected"): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const requests = (await storage.getItem<BuddyRequest[]>("buddy_requests")) || []
    const requestIndex = requests.findIndex((req) => req.id === requestId)

    if (requestIndex !== -1) {
      requests[requestIndex].status = response
      requests[requestIndex].updated_at = new Date().toISOString()
      await storage.setItem("buddy_requests", requests)
    }
  },

  // Perform safety check-in
  performSafetyCheckIn: async (
    userId: string,
    buddyId: string,
    location: { latitude: number; longitude: number },
    status: "safe" | "need_help" | "emergency",
    message?: string,
  ): Promise<SafetyCheckIn> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const checkIn: SafetyCheckIn = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      buddy_id: buddyId,
      location,
      status,
      message,
      created_at: new Date().toISOString(),
    }

    // Store check-in locally
    const checkIns = (await storage.getItem<SafetyCheckIn[]>("safety_checkins")) || []
    checkIns.push(checkIn)
    await storage.setItem("safety_checkins", checkIns)

    // If emergency, trigger alert
    if (status === "emergency") {
      console.log("EMERGENCY ALERT: User needs immediate help!")
      // In real app, this would notify emergency contacts and buddy
    }

    return checkIn
  },

  // Schedule meetup
  scheduleMeetup: async (meetupData: Omit<Meetup, "id" | "created_at">): Promise<Meetup> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const meetup: Meetup = {
      ...meetupData,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    }

    // Store meetup locally
    const meetups = (await storage.getItem<Meetup[]>("buddy_meetups")) || []
    meetups.push(meetup)
    await storage.setItem("buddy_meetups", meetups)

    return meetup
  },

  // Get user's meetups
  getUserMeetups: async (userId: string): Promise<Meetup[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const meetups = (await storage.getItem<Meetup[]>("buddy_meetups")) || []
    return meetups.filter((meetup) => meetup.organizer_id === userId || meetup.buddy_id === userId)
  },

  // Get buddy profile
  getBuddyProfile: async (userId: string): Promise<BuddyProfile | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Mock buddy profile
    const mockProfile: BuddyProfile = {
      id: userId,
      email: "buddy@example.com",
      name: "Alex Johnson",
      username: "alex_buddy",
      avatar_url: "/placeholder.svg?height=100&width=100&text=AJ",
      bio: "Love exploring new places and meeting new people! Always up for coffee or a good hike.",
      pronouns: "they/them",
      interests: ["hiking", "coffee", "art", "lgbtq+ events", "photography"],
      verified: true,
      follower_count: 150,
      following_count: 200,
      post_count: 45,
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: "San Francisco, CA",
      },
      safetyRating: 4.8,
      buddyPreferences: {
        ageRange: [25, 35],
        interests: ["outdoor activities", "cultural events", "food"],
        meetupTypes: ["coffee", "hiking", "events", "museums"],
        maxDistance: 10,
      },
      verificationStatus: "verified",
      lastActive: new Date().toISOString(),
      responseRate: 95,
      meetupCount: 23,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    return mockProfile
  },

  // Update buddy preferences
  updateBuddyPreferences: async (userId: string, preferences: BuddyProfile["buddyPreferences"]): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    // In real app, this would update the user's preferences in the database
    console.log("Updated buddy preferences for user:", userId, preferences)
  },

  // Rate buddy after meetup
  rateBuddy: async (
    raterId: string,
    buddyId: string,
    meetupId: string,
    rating: number,
    review?: string,
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const buddyRating = {
      id: Math.random().toString(36).substr(2, 9),
      rater_id: raterId,
      buddy_id: buddyId,
      meetup_id: meetupId,
      rating,
      review,
      created_at: new Date().toISOString(),
    }

    // Store rating locally
    const ratings = (await storage.getItem<any[]>("buddy_ratings")) || []
    ratings.push(buddyRating)
    await storage.setItem("buddy_ratings", ratings)
  },
}
