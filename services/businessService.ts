import { supabase } from "../lib/supabase"
import type { Business } from "../types"
import { storage, STORAGE_KEYS } from "../lib/storage"

export interface BusinessSearchParams {
  query?: string
  category?: string
  location?: {
    latitude: number
    longitude: number
    radius?: number
  }
  filters?: {
    lgbtq_friendly?: boolean
    trans_friendly?: boolean
    wheelchair_accessible?: boolean
    verified?: boolean
    price_range?: string[]
    rating_min?: number
  }
  sort?: "distance" | "rating" | "name" | "newest"
  limit?: number
  offset?: number
}

export interface BusinessResponse {
  success: boolean
  businesses?: Business[]
  error?: string
  total?: number
}

export const businessService = {
  // Get all businesses
  getBusinesses: async (): Promise<BusinessResponse> => {
    try {
      // Try fast path from cache first
      const cached = await storage.getCacheItem<Business[]>(STORAGE_KEYS.BUSINESSES)
      if (cached && cached.length) {
        // Fire-and-forget background refresh
        businessService.getBusinessesFresh().catch(() => {})
        return { success: true, businesses: cached.map(normalizeBusiness) }
      }

      return await businessService.getBusinessesFresh()
    } catch (error: any) {
      console.error("Error in getBusinesses:", error)
      return { success: false, error: error.message }
    }
  },

  // Fetch from Supabase and refresh cache
  getBusinessesFresh: async (): Promise<BusinessResponse> => {
    try {
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching businesses:", error)
        return { success: false, error: error.message }
      }

      const list = (data || []).map(normalizeBusiness)
      await storage.setCacheItem(STORAGE_KEYS.BUSINESSES, list, 30)
      return { success: true, businesses: list }
    } catch (error: any) {
      console.error("Error in getBusinessesFresh:", error)
      return { success: false, error: error.message }
    }
  },

  // Search businesses
  searchBusinesses: async (params: BusinessSearchParams): Promise<BusinessResponse> => {
    try {
      let query = supabase.from("businesses").select("*", { count: "exact" })

      // Apply text search
      if (params.query) {
        query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%,address.ilike.%${params.query}%`)
      }

      // Apply category filter
      if (params.category && params.category !== "all") {
        // Normalize some UI categories to backend categories
        const map: Record<string, string> = {
          finance: "organization",
          service: "organization",
          hotel: "other",
          bar: "restaurant",
          shopping: "other",
          education: "organization",
          entertainment: "other",
        }
        const category = map[params.category] || params.category
        query = query.eq("category", category)
      }

      // Apply filters
      if (params.filters) {
        if (params.filters.lgbtq_friendly) {
          query = query.eq("lgbtq_friendly", true)
        }
        if (params.filters.trans_friendly) {
          query = query.eq("trans_friendly", true)
        }
        if (params.filters.wheelchair_accessible) {
          query = query.eq("wheelchair_accessible", true)
        }
        if (params.filters.verified) {
          query = query.eq("verified", true)
        }
        if (params.filters.price_range && params.filters.price_range.length > 0) {
          query = query.in("price_range", params.filters.price_range)
        }
        if (params.filters.rating_min) {
          query = query.gte("rating", params.filters.rating_min)
        }
      }

      // Apply sorting
      switch (params.sort) {
        case "rating":
          query = query.order("rating", { ascending: false })
          break
        case "name":
          query = query.order("name", { ascending: true })
          break
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        default:
          query = query.order("created_at", { ascending: false })
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit)
      }
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error("Error searching businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, businesses: (data || []).map(normalizeBusiness), total: count ?? undefined }
    } catch (error: any) {
      console.error("Error in searchBusinesses:", error)
      return { success: false, error: error.message }
    }
  },

  // Get businesses by category
  getBusinessesByCategory: async (category: string): Promise<BusinessResponse> => {
    try {
      if (category === "all") {
        return businessService.getBusinesses()
      }

      // Normalize some UI categories to backend categories
      const map: Record<string, string> = {
        finance: "organization",
        service: "organization",
        hotel: "other",
        bar: "restaurant",
        shopping: "other",
        education: "organization",
        entertainment: "other",
      }
      const normalized = map[category] || category

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("category", normalized)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error fetching businesses by category:", error)
        return { success: false, error: error.message }
      }

      return { success: true, businesses: (data || []).map(normalizeBusiness) }
    } catch (error: any) {
      console.error("Error in getBusinessesByCategory:", error)
      return { success: false, error: error.message }
    }
  },

  // Get business by ID
  getBusinessById: async (id: string): Promise<Business | null> => {
    try {
      const { data, error } = await supabase.from("businesses").select("*").eq("id", id).single()

      if (error) {
        console.error("Error fetching business by ID:", error)
        return null
      }

      return data ? normalizeBusiness(data) : null
    } catch (error) {
      console.error("Error in getBusinessById:", error)
      return null
    }
  },

  // Get nearby businesses
  getNearbyBusinesses: async (latitude: number, longitude: number, radius = 10): Promise<BusinessResponse> => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("rating", { ascending: false })

      if (error) {
        console.error("Error fetching nearby businesses:", error)
        return { success: false, error: error.message }
      }

      return { success: true, businesses: (data || []).map(normalizeBusiness) }
    } catch (error: any) {
      console.error("Error in getNearbyBusinesses:", error)
      return { success: false, error: error.message }
    }
  },

  // Save business (bookmark)
  saveBusiness: async (businessId: string, userId: string): Promise<void> => {
    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from("saved_businesses")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .single()

      if (existingSave) {
        // Unsave
        await supabase.from("saved_businesses").delete().eq("business_id", businessId).eq("user_id", userId)
      } else {
        // Save
        await supabase.from("saved_businesses").insert({ business_id: businessId, user_id: userId })
      }
    } catch (error) {
      console.error("Error saving business:", error)
      throw error
    }
  },

  // Get saved businesses
  getSavedBusinesses: async (userId: string): Promise<BusinessResponse> => {
    try {
      const { data, error } = await supabase
        .from("saved_businesses")
        .select(`
          *,
          businesses (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching saved businesses:", error)
        return { success: false, error: error.message }
      }

      const businesses = (data || []).map((item) => normalizeBusiness(item.businesses)).filter(Boolean)
      return { success: true, businesses }
    } catch (error: any) {
      console.error("Error in getSavedBusinesses:", error)
      return { success: false, error: error.message }
    }
  },

  // Create business
  createBusiness: async (businessData: Omit<Business, "id" | "created_at" | "updated_at">): Promise<Business> => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .insert({
          ...businessData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating business:", error)
        throw error
      }

      return normalizeBusiness(data)
    } catch (error) {
      console.error("Error in createBusiness:", error)
      throw error
    }
  },

  // Update business
  updateBusiness: async (businessId: string, businessData: Partial<Business>): Promise<Business> => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .update({
          ...businessData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId)
        .select()
        .single()

      if (error) {
        console.error("Error updating business:", error)
        throw error
      }

      return normalizeBusiness(data)
    } catch (error) {
      console.error("Error in updateBusiness:", error)
      throw error
    }
  },

  // Delete business
  deleteBusiness: async (businessId: string, userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from("businesses").delete().eq("id", businessId).eq("owner_id", userId)

      if (error) {
        console.error("Error deleting business:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in deleteBusiness:", error)
      throw error
    }
  },
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return value
  const parsed = parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeBusiness(input: any): Business {
  return {
    ...input,
    latitude: toNumber(input?.latitude),
    longitude: toNumber(input?.longitude),
    rating: toNumber(input?.rating),
  } as Business
}
