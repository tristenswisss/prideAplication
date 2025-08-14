import { supabase } from "../lib/supabase"
import { imageUploadService } from "./imageUploadService"
import type { User, UserProfile } from "../types"

export interface ProfileUpdateData {
  name?: string
  bio?: string
  location?: string
  pronouns?: string
  avatar_url?: string
  show_profile?: boolean
  show_activities?: boolean
  appear_in_search?: boolean
  allow_direct_messages?: boolean
}

export interface ProfileResponse {
  success: boolean
  data?: User
  error?: string
}

export interface UserSearchResponse {
  success: boolean
  data?: UserProfile[]
  error?: string
}

interface ProfileRecord {
  username: string
  show_profile: boolean
  appear_in_search: boolean
  allow_direct_messages: boolean
}

class ProfileService {
  async getProfile(userId: string): Promise<ProfileResponse> {
    try {
      console.log("Fetching profile for userId:", userId)

      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          profiles!inner(
            show_profile,
            show_activities,
            appear_in_search,
            allow_direct_messages
          )
        `)
        .eq("id", userId)
        .single()

      if (error) {
        console.error("Error fetching profile:", error)

        // If user doesn't exist, try to create from auth user
        if (error.code === "PGRST116") {
          console.log("User not found in database, attempting to create...")
          return await this.createUserFromAuth(userId)
        }

        return { success: false, error: error.message }
      }

      console.log("Profile fetched successfully:", data)
      return { success: true, data }
    } catch (error: any) {
      console.error("Error in getProfile:", error)
      return { success: false, error: error.message }
    }
  }

  async updateProfile(userId: string, updates: ProfileUpdateData): Promise<ProfileResponse> {
    try {
      console.log("Updating profile for userId:", userId)
      console.log("Profile data:", updates)

      // First check if user exists
      const existingUser = await this.getProfile(userId)
      if (!existingUser.success) {
        // Only attempt to create if the error is "no rows found" (PGRST116)
        if ((existingUser as any).error && String((existingUser as any).error).includes("PGRST116")) {
          console.log("User does not exist, creating new user...")
          const createResult = await this.createUserFromAuth(userId)
          if (!createResult.success) {
            return createResult
          }
        } else {
          // Propagate the original error
          return existingUser
        }
      }

      // Separate user updates from profile updates
      const userUpdates: any = {}
      const profileUpdates: any = {}

      Object.keys(updates).forEach((key) => {
        if (["show_profile", "show_activities", "appear_in_search", "allow_direct_messages"].includes(key)) {
          profileUpdates[key] = (updates as any)[key]
        } else {
          userUpdates[key] = (updates as any)[key]
        }
      })

      // Update user table
      if (Object.keys(userUpdates).length > 0) {
        const { error: userError } = await supabase
          .from("users")
          .update({
            ...userUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        if (userError) {
          console.error("Error updating user:", userError)
          return { success: false, error: userError.message }
        }
      }

      // Update profile table
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error updating profile:", profileError)
          return { success: false, error: profileError.message }
        }
      }

      // Fetch updated profile
      const updatedProfile = await this.getProfile(userId)
      return updatedProfile
    } catch (error: any) {
      console.error("Error in updateProfile:", error)
      return { success: false, error: error.message }
    }
  }

  async updateAvatar(userId: string, imageUri: string): Promise<ProfileResponse> {
    try {
      console.log("Updating avatar for userId:", userId)
      console.log("Image URI:", imageUri)

      // Validate image
      const validation = imageUploadService.validateImageUri(imageUri)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Upload image
      console.log("Uploading image...")
      const uploadResult = await imageUploadService.uploadImage(imageUri, userId, "avatars")

      if (!uploadResult.success) {
        console.error("Image upload failed:", uploadResult.error)
        return { success: false, error: uploadResult.error }
      }

      console.log("Image uploaded successfully:", uploadResult.url)

      // Update profile with new avatar URL
      const updateResult = await this.updateProfile(userId, {
        avatar_url: uploadResult.url,
      })

      if (!updateResult.success) {
        console.error("Profile update failed:", updateResult.error)
        return updateResult
      }

      console.log("Avatar updated successfully")
      return updateResult
    } catch (error: any) {
      console.error("Error in updateAvatar:", error)
      return { success: false, error: error.message }
    }
  }

  private async createUserFromAuth(userId: string): Promise<ProfileResponse> {
    try {
      console.log("Creating user from auth for userId:", userId)

      // Get user data from auth
      const { data: authUser, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser.user) {
        console.error("Error getting auth user:", authError)
        return { success: false, error: "Unable to get user information" }
      }

      // Create user record
      const userData = {
        id: userId,
        email: authUser.user.email || "",
        name: authUser.user.user_metadata?.name || authUser.user.email?.split("@")[0] || "User",
        avatar_url: authUser.user.user_metadata?.avatar_url || null,
        verified: false,
        follower_count: 0,
        following_count: 0,
        post_count: 0,
        interests: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Creating user with data:", userData)

      const { data, error } = await supabase.from("users").insert([userData]).select().single()

      if (error) {
        console.error("Error creating user:", error)
        return { success: false, error: error.message }
      }

      // Create profile record
      const profileData = {
        id: userId,
        show_profile: true,
        show_activities: true,
        appear_in_search: true,
        allow_direct_messages: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await supabase.from("profiles").insert([profileData])

      console.log("User created successfully:", data)
      return { success: true, data }
    } catch (error: any) {
      console.error("Error in createUserFromAuth:", error)
      return { success: false, error: error.message }
    }
  }

  async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current profile to delete avatar if exists
      const profile = await this.getProfile(userId)
      if (profile.success && profile.data?.avatar_url) {
        await imageUploadService.deleteImage(profile.data.avatar_url)
      }

      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) {
        console.error("Error deleting profile:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in deleteProfile:", error)
      return { success: false, error: error.message }
    }
  }

  async searchUsers(query: string, currentUserId?: string): Promise<UserSearchResponse> {
    try {
      let searchQuery = supabase
        .from("users")
        .select(`
          id, 
          name, 
          avatar_url, 
          bio, 
          location, 
          verified,
          email,
          created_at,
          updated_at,
          profiles!inner(
            show_profile,
            appear_in_search
          )
        `)
        .or(`name.ilike.%${query}%,bio.ilike.%${query}%`)
        .eq("profiles.appear_in_search", true)
        .eq("profiles.show_profile", true)
        .limit(20)

      // Exclude current user from search results
      if (currentUserId) {
        searchQuery = searchQuery.neq("id", currentUserId)
      }

      const { data, error } = await searchQuery

      if (error) {
        console.error("Error searching users:", error)
        return { success: false, error: error.message }
      }

      // Transform data to match UserProfile interface
      const transformedData: UserProfile[] = (data || []).map((user) => {
        const profile = (Array.isArray(user.profiles) ? user.profiles[0] : user.profiles) as ProfileRecord
        return {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          location: user.location,
          verified: user.verified,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
          show_profile: profile.show_profile,
          appear_in_search: profile.appear_in_search,
        }
      })

      return { success: true, data: transformedData }
    } catch (error: any) {
      console.error("Error in searchUsers:", error)
      return { success: false, error: error.message }
    }
  }

  async getUsersByIds(userIds: string[]): Promise<UserSearchResponse> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, 
          name, 
          avatar_url, 
          bio, 
          location, 
          verified,
          email,
          created_at,
          updated_at,
          profiles(
            show_profile
          )
        `)
        .in("id", userIds)

      if (error) {
        console.error("Error fetching users by IDs:", error)
        return { success: false, error: error.message }
      }

      const transformedData: UserProfile[] = (data || []).map((user) => {
        const profile = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles
        return {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          location: user.location,
          verified: user.verified,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
          show_profile: profile?.show_profile,
        }
      })

      return { success: true, data: transformedData }
    } catch (error: any) {
      console.error("Error in getUsersByIds:", error)
      return { success: false, error: error.message }
    }
  }
}

export const profileService = new ProfileService()
