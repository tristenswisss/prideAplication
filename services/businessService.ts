import { supabase } from "../lib/supabase"
import type { Business } from "../types"

export interface BusinessResponse {
  success: boolean
  data?: Business[]
  error?: string
}

export interface SingleBusinessResponse {
  success: boolean
  data?: Business
  error?: string
}

// Fixed interface to match Supabase's actual return structure
interface SavedBusinessRecord {
  business_id: string
  created_at: string
  businesses: Business | null  // Single business object, not array
}

// Alternative interface for the raw Supabase response
interface SupabaseSavedBusinessRecord {
  business_id: string
  created_at: string
  businesses: Business | Business[] | null  // Could be single object or array depending on query
}

class BusinessService {
  async getAllBusinesses(): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("verified", true)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error fetching businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getAllBusinesses:", error)
      return { success: false, error: error.message }
    }
  }

  async getBusinessesByCategory(category: string): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("category", category)
        .eq("verified", true)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error fetching businesses by category:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getBusinessesByCategory:", error)
      return { success: false, error: error.message }
    }
  }

  async searchBusinesses(query: string): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`)
        .eq("verified", true)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error searching businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in searchBusinesses:", error)
      return { success: false, error: error.message }
    }
  }

  async getBusinessById(id: string): Promise<SingleBusinessResponse> {
    try {
      const { data, error } = await supabase.from("businesses").select("*").eq("id", id).single()

      if (error) {
        console.error("Error fetching business by ID:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      console.error("Error in getBusinessById:", error)
      return { success: false, error: error.message }
    }
  }

  async getNearbyBusinesses(latitude: number, longitude: number, radius = 10): Promise<BusinessResponse> {
    try {
      // Using a simple distance calculation (this could be improved with PostGIS)
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("verified", true)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error fetching nearby businesses:", error)
        return { success: false, error: error.message }
      }

      // Filter by distance (simple calculation)
      const filtered = (data || []).filter((business) => {
        if (!business.latitude || !business.longitude) return false

        const distance = this.calculateDistance(latitude, longitude, business.latitude, business.longitude)

        return distance <= radius
      })

      return { success: true, data: filtered }
    } catch (error: any) {
      console.error("Error in getNearbyBusinesses:", error)
      return { success: false, error: error.message }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in kilometers
    return d
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  async saveBusiness(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("saved_businesses").insert([{ user_id: userId, business_id: businessId }])

      if (error) {
        console.error("Error saving business:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in saveBusiness:", error)
      return { success: false, error: error.message }
    }
  }

  async unsaveBusiness(userId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("saved_businesses")
        .delete()
        .eq("user_id", userId)
        .eq("business_id", businessId)

      if (error) {
        console.error("Error unsaving business:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in unsaveBusiness:", error)
      return { success: false, error: error.message }
    }
  }

  async getSavedBusinesses(userId: string): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("saved_businesses")
        .select(`
          business_id,
          created_at,
          businesses (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching saved businesses:", error)
        return { success: false, error: error.message }
      }

      // Type-safe handling of the response
      const rawData = data as unknown as SupabaseSavedBusinessRecord[]
      
      if (!rawData) {
        return { success: true, data: [] }
      }

      // Transform and filter the data to match Business[] interface
      const businesses: Business[] = rawData
        .filter((item): item is SupabaseSavedBusinessRecord & { businesses: Business } => {
          // Type guard to ensure businesses exists and is not null
          return item.businesses !== null && 
                 item.businesses !== undefined && 
                 !Array.isArray(item.businesses) &&
                 typeof item.businesses === 'object'
        })
        .map((item) => ({
          ...item.businesses,
          // You can add custom properties here if needed
          // savedAt: item.created_at,
        }))

      return { success: true, data: businesses }
    } catch (error: any) {
      console.error("Error in getSavedBusinesses:", error)
      return { success: false, error: error.message }
    }
  }

  // Helper method to check if a business is saved by a user
  async isBusinessSaved(userId: string, businessId: string): Promise<{ success: boolean; isSaved: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("saved_businesses")
        .select("business_id")
        .eq("user_id", userId)
        .eq("business_id", businessId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Error checking if business is saved:", error)
        return { success: false, isSaved: false, error: error.message }
      }

      return { success: true, isSaved: !!data }
    } catch (error: any) {
      console.error("Error in isBusinessSaved:", error)
      return { success: false, isSaved: false, error: error.message }
    }
  }

  // Helper method to get saved business count for a user
  async getSavedBusinessCount(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from("saved_businesses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      if (error) {
        console.error("Error getting saved business count:", error)
        return { success: false, count: 0, error: error.message }
      }

      return { success: true, count: count || 0 }
    } catch (error: any) {
      console.error("Error in getSavedBusinessCount:", error)
      return { success: false, count: 0, error: error.message }
    }
  }

  // Helper method to get business ratings and reviews
  async getBusinessRatings(businessId: string): Promise<{
    success: boolean
    averageRating?: number
    totalReviews?: number
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from("business_reviews")
        .select("rating")
        .eq("business_id", businessId)

      if (error) {
        console.error("Error fetching business ratings:", error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: true, averageRating: 0, totalReviews: 0 }
      }

      const totalReviews = data.length
      const averageRating = data.reduce((sum, review) => sum + review.rating, 0) / totalReviews

      return {
        success: true,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        totalReviews
      }
    } catch (error: any) {
      console.error("Error in getBusinessRatings:", error)
      return { success: false, error: error.message }
    }
  }

  // Helper method to get featured businesses
  async getFeaturedBusinesses(limit = 5): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("verified", true)
        .eq("featured", true)
        .order("rating", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching featured businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getFeaturedBusinesses:", error)
      return { success: false, error: error.message }
    }
  }

  // Helper method to get recently added businesses
  async getRecentBusinesses(limit = 10): Promise<BusinessResponse> {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("verified", true)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching recent businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getRecentBusinesses:", error)
      return { success: false, error: error.message }
    }
  }
}

export const businessService = new BusinessService()