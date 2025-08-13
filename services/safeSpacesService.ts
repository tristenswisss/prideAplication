import { supabase } from "../lib/supabase"
import type { SafeSpace } from "../types"

export interface CrisisContact {
  id: string
  name: string
  description: string
  phone: string
  email?: string
  website?: string
  category: "mental_health" | "health" | "youth" | "domestic_violence" | "emergency" | "other"
  country: string
  available_hours: string
  languages: string[]
  services: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SafeSpacesResponse {
  success: boolean
  data?: SafeSpace[]
  error?: string
}

export interface CrisisContactsResponse {
  success: boolean
  data?: CrisisContact[]
  error?: string
}

class SafeSpacesService {
  async getAllSafeSpaces(): Promise<SafeSpacesResponse> {
    try {
      const { data, error } = await supabase.from("safe_spaces").select("*").eq("verified", true).order("name")

      if (error) {
        console.error("Error fetching safe spaces:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getAllSafeSpaces:", error)
      return { success: false, error: error.message }
    }
  }

  async getSafeSpacesByCategory(category: string): Promise<SafeSpacesResponse> {
    try {
      const { data, error } = await supabase
        .from("safe_spaces")
        .select("*")
        .eq("category", category)
        .eq("verified", true)
        .order("name")

      if (error) {
        console.error("Error fetching safe spaces by category:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getSafeSpacesByCategory:", error)
      return { success: false, error: error.message }
    }
  }

  async getSafeSpacesByLocation(country: string, city?: string): Promise<SafeSpacesResponse> {
    try {
      let query = supabase.from("safe_spaces").select("*").eq("country", country).eq("verified", true)

      if (city) {
        query = query.eq("city", city)
      }

      const { data, error } = await query.order("name")

      if (error) {
        console.error("Error fetching safe spaces by location:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getSafeSpacesByLocation:", error)
      return { success: false, error: error.message }
    }
  }

  async searchSafeSpaces(query: string): Promise<SafeSpacesResponse> {
    try {
      const { data, error } = await supabase
        .from("safe_spaces")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .eq("verified", true)
        .order("name")

      if (error) {
        console.error("Error searching safe spaces:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in searchSafeSpaces:", error)
      return { success: false, error: error.message }
    }
  }

  async getSafeSpaceById(id: string): Promise<{ success: boolean; data?: SafeSpace; error?: string }> {
    try {
      const { data, error } = await supabase.from("safe_spaces").select("*").eq("id", id).single()

      if (error) {
        console.error("Error fetching safe space by ID:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      console.error("Error in getSafeSpaceById:", error)
      return { success: false, error: error.message }
    }
  }

  async getCrisisContacts(country?: string): Promise<CrisisContactsResponse> {
    try {
      let query = supabase.from("crisis_contacts").select("*").eq("is_active", true)

      if (country) {
        query = query.eq("country", country)
      }

      const { data, error } = await query.order("name")

      if (error) {
        console.error("Error fetching crisis contacts:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getCrisisContacts:", error)
      return { success: false, error: error.message }
    }
  }

  async getCrisisContactsByCategory(category: string, country?: string): Promise<CrisisContactsResponse> {
    try {
      let query = supabase.from("crisis_contacts").select("*").eq("category", category).eq("is_active", true)

      if (country) {
        query = query.eq("country", country)
      }

      const { data, error } = await query.order("name")

      if (error) {
        console.error("Error fetching crisis contacts by category:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getCrisisContactsByCategory:", error)
      return { success: false, error: error.message }
    }
  }

  getSafeSpaceCategories(): Array<{ id: string; name: string; icon: string }> {
    return [
      { id: "organization", name: "Organizations", icon: "business" },
      { id: "healthcare", name: "Healthcare", icon: "local-hospital" },
      { id: "restaurant", name: "Restaurants & Cafes", icon: "restaurant" },
      { id: "drop_in_center", name: "Drop-in Centers", icon: "home" },
      { id: "community_center", name: "Community Centers", icon: "people" },
      { id: "other", name: "Other", icon: "more-horiz" },
    ]
  }

  getCrisisContactCategories(): Array<{ id: string; name: string; icon: string }> {
    return [
      { id: "mental_health", name: "Mental Health", icon: "psychology" },
      { id: "health", name: "Health Services", icon: "local-hospital" },
      { id: "youth", name: "Youth Support", icon: "child-care" },
      { id: "domestic_violence", name: "Domestic Violence", icon: "shield" },
      { id: "emergency", name: "Emergency Services", icon: "emergency" },
      { id: "other", name: "Other Support", icon: "help" },
    ]
  }
}

export const safeSpacesService = new SafeSpacesService()
