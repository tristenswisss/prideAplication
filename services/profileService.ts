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
          profiles (
            username,
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
        if ((error as any).code === "PGRST116") {
          console.log("User not found in database, attempting to create...")
          return await this.createUserFromAuth(userId)
        }

        return { success: false, error: (error as any).message }
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
        console.log("User does not exist, creating new user...")
        const createResult = await this.createUserFromAuth(userId)
        if (!createResult.success) {
          return createResult
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

      const { error } = await supabase.from("users").insert([userData])
      if (error && (error as any).code !== "23505") {
        // 23505 = unique violation; ignore if user already exists
        console.error("Error creating user:", error)
        return { success: false, error: (error as any).message }
      }

      // Create profile record if missing
      const profileData = {
        id: userId,
        username: authUser.user.email?.split("@")[0] || "user",
        show_profile: true,
        show_activities: true,
        appear_in_search: true,
        allow_direct_messages: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: profileInsertError } = await supabase.from("profiles").insert([profileData])
      if (profileInsertError && (profileInsertError as any).code !== "23505") {
        console.error("Error creating profile:", profileInsertError)
        // non-fatal; continue
      }

      // Return the fresh profile
      const result = await this.getProfile(userId)
      if (!result.success) return { success: true, data: userData as unknown as User }
      return result
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
      const trimmedQuery = (query || "").trim()

      // If there is no query, return empty result to avoid PostgREST logic parsing issues with ilike.%%
      if (!trimmedQuery) {
        return { success: true, data: [] }
      }

      // Exclude users blocked by the current user
      let blockedIds: string[] = []
      if (currentUserId) {
        const { data: blocked } = await supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", currentUserId)
        if (Array.isArray(blocked)) {
          blockedIds = blocked.map((b: any) => b.blocked_user_id)
        }
      }

      const baseSelect = `
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
          username,
          show_profile,
          appear_in_search,
          allow_direct_messages
        )
      `

      // Query A: search users by name/bio
      let usersByNameOrBio = supabase
        .from("users")
        .select(baseSelect)
        .or(`name.ilike.%${trimmedQuery}%,bio.ilike.%${trimmedQuery}%`)
        .eq("profiles.appear_in_search", true)
        .eq("profiles.show_profile", true)

      // Query B: search users by username via profiles relationship
      let usersByUsername = supabase
        .from("users")
        .select(baseSelect)
        // Join profiles to make sure we can filter it
        .eq("profiles.appear_in_search", true)
        .eq("profiles.show_profile", true)
        .ilike("profiles.username", `%${trimmedQuery}%`)

      // Exclude current user from search results
      if (currentUserId) {
        usersByNameOrBio = usersByNameOrBio.neq("id", currentUserId)
        usersByUsername = usersByUsername.neq("id", currentUserId)
      }

      if (blockedIds.length > 0) {
        const blockedList = `(${blockedIds.join(",")})`
        usersByNameOrBio = usersByNameOrBio.not("id", "in", blockedList)
        usersByUsername = usersByUsername.not("id", "in", blockedList)
      }

      const [nameBioResult, usernameResult] = await Promise.all([
        usersByNameOrBio.limit(20),
        usersByUsername.limit(20),
      ])

      const errors = [nameBioResult.error, usernameResult.error].filter(Boolean) as any[]
      if (errors.length > 0) {
        const firstError = errors[0]
        console.error("Error searching users:", firstError)
        return { success: false, error: firstError.message }
      }

      const combined: any[] = [
        ...(nameBioResult.data || []),
        ...(usernameResult.data || []),
      ]

      // Dedupe by user id
      const seen = new Set<string>()
      const deduped = combined.filter((u) => {
        const id = u.id as string
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

      // Transform data to match UserProfile interface
      const transformedData: UserProfile[] = deduped.slice(0, 20).map((user: any) => {
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
          username: profile?.username,
          show_profile: profile?.show_profile,
          appear_in_search: profile?.appear_in_search,
          allow_direct_messages: profile?.allow_direct_messages,
        } as unknown as UserProfile
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
            username,
            show_profile
          )
        `)
        .in("id", userIds)

      if (error) {
        console.error("Error fetching users by IDs:", error)
        return { success: false, error: error.message }
      }

      const transformedData: UserProfile[] = (data || []).map((user: any) => {
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
          username: profile?.username,
          show_profile: profile?.show_profile,
        } as unknown as UserProfile
      })

      return { success: true, data: transformedData }
    } catch (error: any) {
      console.error("Error in getUsersByIds:", error)
      return { success: false, error: error.message }
    }
  }
}

export const profileService = new ProfileService()
