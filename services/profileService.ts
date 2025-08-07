import { supabase } from "../lib/supabase"
import type { User } from "../types"

export const profileService = {
  // Update user profile in the database
  updateProfile: async (userId: string, profileData: Partial<User>) => {
    try {
      console.log('Updating profile for userId:', userId)
      console.log('Profile data:', profileData)

      // First, check if the user exists and get current data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)

      if (fetchError) {
        throw new Error(`Failed to fetch existing user: ${fetchError.message}`)
      }

      if (!existingUser || existingUser.length === 0) {
        throw new Error(`User not found with ID: ${userId}`)
      }

      if (existingUser.length > 1) {
        throw new Error(`Multiple users found with ID: ${userId}. Database integrity issue.`)
      }

      console.log('Existing user found:', existingUser[0])

      // Prepare update data, removing undefined values
      const updateData = {
        name: profileData.name,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        pronouns: profileData.pronouns,
        location: profileData.location,
        updated_at: new Date().toISOString()
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      console.log('Sanitized update data:', updateData)

      // Update the user's profile in the users table
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        throw new Error(`Database update error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from update operation')
      }

      if (data.length > 1) {
        console.warn('Multiple rows updated, this should not happen:', data)
      }

      console.log('Update successful:', data[0])

      // Also update the user's metadata in Supabase Auth
      if (profileData.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: profileData.name
          }
        })

        if (authError) {
          console.warn('Failed to update auth metadata:', authError.message)
          // Don't throw here as the main profile update was successful
        }
      }

      return { data: data[0], error: null }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      return { data: null, error: error.message || 'Failed to update profile' }
    }
  },

  // Get user profile from the database
  getProfile: async (userId: string) => {
    try {
      console.log('Fetching profile for userId:', userId)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)

      if (error) {
        throw new Error(`Database query error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error(`User not found with ID: ${userId}`)
      }

      if (data.length > 1) {
        console.warn('Multiple users found with same ID:', data)
        throw new Error(`Multiple users found with ID: ${userId}. Database integrity issue.`)
      }

      console.log('Profile fetched successfully:', data[0])
      return { data: data[0], error: null }
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      return { data: null, error: error.message || 'Failed to fetch profile' }
    }
  },

  // Helper function to check user data integrity
  checkUserIntegrity: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', userId)

      if (error) {
        return { valid: false, error: error.message }
      }

      return {
        valid: true,
        userCount: data?.length || 0,
        userData: data?.[0] || null,
        error: null
      }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }
}