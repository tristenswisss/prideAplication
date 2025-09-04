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

  // Suggest a new location (pending approval)
  async suggestSafeSpace(payload: Omit<SafeSpace, "id" | "verified" | "created_at" | "updated_at"> & { suggested_by: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("safe_space_suggestions").insert({
        ...payload,
        status: "pending",
      })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async listSuggestions(status: "pending" | "approved" | "rejected" = "pending"): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.from("safe_space_suggestions").select("*").eq("status", status).order("created_at", { ascending: false })
      if (error) return { success: false, error: error.message }
      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async approveSuggestion(suggestionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: suggestion, error: fetchError } = await supabase.from("safe_space_suggestions").select("*").eq("id", suggestionId).single()
      if (fetchError || !suggestion) return { success: false, error: fetchError?.message || "Not found" }

      const normalizeCategory = (cat?: string | null) => {
        const c = (cat || "").toLowerCase()
        switch (c) {
          case "organization":
            return "organization"
          case "clinic":
          case "healthcare":
            return "clinic"
          case "restaurant":
            return "restaurant"
          case "cafe":
            return "cafe"
          case "drop_in_center":
            return "drop_in_center"
          case "community_center":
          case "other":
          default:
            return "organization"
        }
      }

      const insertPayload = {
        name: suggestion.name,
        description: suggestion.description,
        category: normalizeCategory(suggestion.category),
        address: suggestion.address,
        city: suggestion.city,
        country: suggestion.country,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        phone: suggestion.phone,
        email: suggestion.email,
        website: suggestion.website,
        services: suggestion.services,
        lgbtq_friendly: suggestion.lgbtq_friendly,
        trans_friendly: suggestion.trans_friendly,
        wheelchair_accessible: suggestion.wheelchair_accessible,
        verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from("safe_spaces").insert(insertPayload)
      if (insertError) return { success: false, error: insertError.message }

      const { error: updateError } = await supabase.from("safe_space_suggestions").update({ status: "approved" }).eq("id", suggestionId)
      if (updateError) return { success: false, error: updateError.message }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async rejectSuggestion(suggestionId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("safe_space_suggestions").update({ status: "rejected", rejection_reason: reason || null }).eq("id", suggestionId)
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const safeSpacesService = new SafeSpacesService()
