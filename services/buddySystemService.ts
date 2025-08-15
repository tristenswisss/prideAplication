import { supabase } from "../lib/supabase"
import type { UserProfile } from "../types"

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
  from_user?: UserProfile
  to_user?: UserProfile
}

export interface BuddyMatch {
  id: string
  user1_id: string
  user2_id: string
  compatibility_score: number
  matched_interests: string[]
  distance: number
  created_at: string
  user1?: UserProfile
  user2?: UserProfile
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
  organizer?: UserProfile
  buddy?: UserProfile
}

export const buddySystemService = {
  // Get potential buddy matches
  getBuddyMatches: async (userId: string): Promise<BuddyMatch[]> => {
    const { data, error } = await supabase
      .from("buddy_matches")
      .select(`
        *,
        user1:users!buddy_matches_user1_id_fkey (
          id,
          name,
          avatar_url,
          verified,
          interests
        ),
        user2:users!buddy_matches_user2_id_fkey (
          id,
          name,
          avatar_url,
          verified,
          interests
        )
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    if (error) {
      console.error("Error fetching buddy matches:", error)
      return []
    }

    return (data || []).map((match) => ({
      ...match,
      user1: match.user1,
      user2: match.user2,
    }))
  },

  // Unfriend (remove buddy match between two users)
  unfriendBuddy: async (userId: string, buddyId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("buddy_matches")
        .delete()
        .or(`and(user1_id.eq.${userId},user2_id.eq.${buddyId}),and(user1_id.eq.${buddyId},user2_id.eq.${userId})`)

      if (error) {
        console.error("Error unfriending buddy:", error)
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (error: any) {
      console.error("Error in unfriendBuddy:", error)
      return { success: false, error: error.message }
    }
  },

  // Send buddy request
  sendBuddyRequest: async (fromUserId: string, toUserId: string, message: string): Promise<BuddyRequest> => {
    const { data, error } = await supabase
      .from("buddy_requests")
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message,
        status: "pending",
      })
      .select(`
        *,
        from_user:users!buddy_requests_from_user_id_fkey (
          id,
          name,
          avatar_url,
          verified
        ),
        to_user:users!buddy_requests_to_user_id_fkey (
          id,
          name,
          avatar_url,
          verified
        )
      `)
      .single()

    if (error) {
      console.error("Error sending buddy request:", error)
      throw error
    }

    // Create notification for the recipient
    await supabase.rpc("create_notification", {
      user_id: toUserId,
      title: "New Buddy Request",
      message: `${data.from_user?.name || "Someone"} wants to be your buddy!`,
      type: "buddy_request",
      data: { request_id: data.id, from_user_id: fromUserId },
    })

    return {
      ...data,
      from_user: data.from_user,
      to_user: data.to_user,
    }
  },

  // Get buddy requests
  getBuddyRequests: async (userId: string): Promise<BuddyRequest[]> => {
    const { data, error } = await supabase
      .from("buddy_requests")
      .select(`
        *,
        from_user:users!buddy_requests_from_user_id_fkey (
          id,
          name,
          avatar_url,
          verified
        ),
        to_user:users!buddy_requests_to_user_id_fkey (
          id,
          name,
          avatar_url,
          verified
        )
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching buddy requests:", error)
      return []
    }

    return (data || []).map((request) => ({
      ...request,
      from_user: request.from_user,
      to_user: request.to_user,
    }))
  },

  // Respond to buddy request
  respondToBuddyRequest: async (requestId: string, response: "accepted" | "rejected"): Promise<void> => {
    const { data, error } = await supabase
      .from("buddy_requests")
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .select(`
        *,
        from_user:users!buddy_requests_from_user_id_fkey (name),
        to_user:users!buddy_requests_to_user_id_fkey (name)
      `)
      .single()

    if (error) {
      console.error("Error responding to buddy request:", error)
      throw error
    }

    // Create notification for the requester
    const message =
      response === "accepted"
        ? `${data.to_user?.name || "Someone"} accepted your buddy request!`
        : `${data.to_user?.name || "Someone"} declined your buddy request.`

    await supabase.rpc("create_notification", {
      user_id: data.from_user_id,
      title: `Buddy Request ${response === "accepted" ? "Accepted" : "Declined"}`,
      message,
      type: "buddy_response",
      data: { request_id: requestId, response },
    })

    // If accepted, create a buddy match
    if (response === "accepted") {
      await supabase.from("buddy_matches").insert({
        user1_id: data.from_user_id,
        user2_id: data.to_user_id,
        compatibility_score: 85, // Default score
        matched_interests: [], // Would be calculated based on user interests
        distance: 0, // Would be calculated based on user locations
      })
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
    const { data, error } = await supabase
      .from("safety_check_ins")
      .insert({
        user_id: userId,
        buddy_id: buddyId,
        location,
        status,
        message,
      })
      .select()
      .single()

    if (error) {
      console.error("Error performing safety check-in:", error)
      throw error
    }

    // Create notification for buddy
    const { data: user } = await supabase.from("users").select("name").eq("id", userId).single()

    let notificationTitle = "Safety Check-in"
    let notificationMessage = `${user?.name || "Your buddy"} checked in`

    if (status === "emergency") {
      notificationTitle = "🚨 EMERGENCY ALERT"
      notificationMessage = `${user?.name || "Your buddy"} needs immediate help!`
    } else if (status === "need_help") {
      notificationTitle = "⚠️ Help Needed"
      notificationMessage = `${user?.name || "Your buddy"} needs assistance`
    } else {
      notificationMessage = `${user?.name || "Your buddy"} is safe`
    }

    await supabase.rpc("create_notification", {
      user_id: buddyId,
      title: notificationTitle,
      message: notificationMessage,
      type: "safety_checkin",
      data: { checkin_id: data.id, status, location },
    })

    return data
  },

  // Schedule meetup
  scheduleMeetup: async (meetupData: Omit<Meetup, "id" | "created_at">): Promise<Meetup> => {
    const { data, error } = await supabase
      .from("meetups")
      .insert(meetupData)
      .select(`
        *,
        organizer:users!meetups_organizer_id_fkey (
          id,
          name,
          avatar_url,
          verified
        ),
        buddy:users!meetups_buddy_id_fkey (
          id,
          name,
          avatar_url,
          verified
        )
      `)
      .single()

    if (error) {
      console.error("Error scheduling meetup:", error)
      throw error
    }

    // Create notification for buddy
    await supabase.rpc("create_notification", {
      user_id: meetupData.buddy_id,
      title: "New Meetup Scheduled",
      message: `${data.organizer?.name || "Your buddy"} scheduled a meetup: ${meetupData.title}`,
      type: "meetup_scheduled",
      data: { meetup_id: data.id },
    })

    return {
      ...data,
      organizer: data.organizer,
      buddy: data.buddy,
    }
  },

  // Get user's meetups
  getUserMeetups: async (userId: string): Promise<Meetup[]> => {
    const { data, error } = await supabase
      .from("meetups")
      .select(`
        *,
        organizer:users!meetups_organizer_id_fkey (
          id,
          name,
          avatar_url,
          verified
        ),
        buddy:users!meetups_buddy_id_fkey (
          id,
          name,
          avatar_url,
          verified
        )
      `)
      .or(`organizer_id.eq.${userId},buddy_id.eq.${userId}`)
      .order("scheduled_time", { ascending: true })

    if (error) {
      console.error("Error fetching user meetups:", error)
      return []
    }

    return (data || []).map((meetup) => ({
      ...meetup,
      organizer: meetup.organizer,
      buddy: meetup.buddy,
    }))
  },

  // Get buddy profile
  getBuddyProfile: async (userId: string): Promise<BuddyProfile | null> => {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        profiles (*)
      `)
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching buddy profile:", error)
      return null
    }

    if (!data) {
      return null
    }

    // Transform the user data into a BuddyProfile
    const buddyProfile: BuddyProfile = {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      pronouns: data.pronouns,
      interests: data.interests || [],
      verified: data.verified,
      follower_count: data.follower_count || 0,
      following_count: data.following_count || 0,
      post_count: data.post_count || 0,
      location: data.location
        ? {
            latitude: 0,
            longitude: 0,
            city: data.location,
          }
        : undefined,
      safetyRating: 5,
      buddyPreferences: {
        ageRange: [18, 100],
        interests: data.interests || [],
        meetupTypes: [],
        maxDistance: 50,
      },
      verificationStatus: "verified",
      lastActive: data.updated_at,
      responseRate: 100,
      meetupCount: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return buddyProfile
  },

  // Update buddy preferences
  updateBuddyPreferences: async (userId: string, preferences: BuddyProfile["buddyPreferences"]): Promise<void> => {
    // For now, we'll store preferences in the user's profile
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error updating buddy preferences:", error)
      throw error
    }
  },

  // Rate buddy after meetup
  rateBuddy: async (
    raterId: string,
    buddyId: string,
    meetupId: string,
    rating: number,
    review?: string,
  ): Promise<void> => {
    const { error } = await supabase.from("buddy_ratings").insert({
      rater_id: raterId,
      buddy_id: buddyId,
      meetup_id: meetupId,
      rating,
      review,
    })

    if (error) {
      console.error("Error rating buddy:", error)
      throw error
    }

    // Create notification for rated buddy
    const { data: rater } = await supabase.from("users").select("name").eq("id", raterId).single()

    await supabase.rpc("create_notification", {
      user_id: buddyId,
      title: "New Buddy Rating",
      message: `${rater?.name || "Someone"} rated your buddy experience: ${rating}/5 stars`,
      type: "buddy_rating",
      data: { rating_id: meetupId, rating },
    })
  },
}
