import { supabase } from "../lib/supabase"
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
    const { data, error } = await supabase
      .from('buddy_matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching buddy matches:', error);
      return [];
    }

    return data || [];
  },

  // Send buddy request
  sendBuddyRequest: async (fromUserId: string, toUserId: string, message: string): Promise<BuddyRequest> => {
    const { data, error } = await supabase
      .from('buddy_requests')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending buddy request:', error);
      throw error;
    }

    return data;
  },

  // Get buddy requests
  getBuddyRequests: async (userId: string): Promise<BuddyRequest[]> => {
    const { data, error } = await supabase
      .from('buddy_requests')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching buddy requests:', error);
      return [];
    }

    return data || [];
  },

  // Respond to buddy request
  respondToBuddyRequest: async (requestId: string, response: "accepted" | "rejected"): Promise<void> => {
    const { error } = await supabase
      .from('buddy_requests')
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('Error responding to buddy request:', error);
      throw error;
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
      .from('safety_check_ins')
      .insert({
        user_id: userId,
        buddy_id: buddyId,
        location,
        status,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Error performing safety check-in:', error);
      throw error;
    }

    // If emergency, trigger alert
    if (status === "emergency") {
      console.log("EMERGENCY ALERT: User needs immediate help!")
      // In real app, this would notify emergency contacts and buddy
    }

    return data;
  },

  // Schedule meetup
  scheduleMeetup: async (meetupData: Omit<Meetup, "id" | "created_at">): Promise<Meetup> => {
    const { data, error } = await supabase
      .from('meetups')
      .insert(meetupData)
      .select()
      .single();

    if (error) {
      console.error('Error scheduling meetup:', error);
      throw error;
    }

    return data;
  },

  // Get user's meetups
  getUserMeetups: async (userId: string): Promise<Meetup[]> => {
    const { data, error } = await supabase
      .from('meetups')
      .select('*')
      .or(`organizer_id.eq.${userId},buddy_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching user meetups:', error);
      return [];
    }

    return data || [];
  },

  // Get buddy profile
  getBuddyProfile: async (userId: string): Promise<BuddyProfile | null> => {
    // For now, we'll return the user profile as the buddy profile
    // In a real app, you might have additional buddy-specific fields
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        profiles (
          *
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching buddy profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform the user data into a BuddyProfile
    const buddyProfile: BuddyProfile = {
      id: data.id,
      email: data.email,
      name: data.name,
      username: data.profiles?.username,
      avatar_url: data.avatar_url,
      bio: data.bio,
      pronouns: data.pronouns,
      interests: data.interests,
      verified: data.verified,
      follower_count: data.follower_count,
      following_count: data.following_count,
      post_count: data.post_count,
      location: data.location ? {
        latitude: 0, // These would need to be extracted from the location string
        longitude: 0,
        city: data.location
      } : undefined,
      safetyRating: 5, // Default safety rating
      buddyPreferences: {
        ageRange: [18, 100], // Default age range
        interests: data.interests || [],
        meetupTypes: [], // Default meetup types
        maxDistance: 50, // Default max distance in km
      },
      verificationStatus: "verified", // Default verification status
      lastActive: data.updated_at,
      responseRate: 100, // Default response rate
      meetupCount: 0, // Default meetup count
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return buddyProfile;
  },

  // Update buddy preferences
  updateBuddyPreferences: async (userId: string, preferences: BuddyProfile["buddyPreferences"]): Promise<void> => {
    // For now, we'll just log the preferences as updating them would require
    // additional database fields that aren't in the current schema
    console.log("Updated buddy preferences for user:", userId, preferences);
    
    // In a real app, you would update the user's preferences in the database
    // This might involve updating a separate buddy_preferences table or
    // adding fields to the profiles table
  },

  // Rate buddy after meetup
  rateBuddy: async (
    raterId: string,
    buddyId: string,
    meetupId: string,
    rating: number,
    review?: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from('buddy_ratings')
      .insert({
        rater_id: raterId,
        buddy_id: buddyId,
        meetup_id: meetupId,
        rating,
        review,
      });

    if (error) {
      console.error('Error rating buddy:', error);
      throw error;
    }
  },
}
