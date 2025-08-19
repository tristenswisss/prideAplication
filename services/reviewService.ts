import { supabase } from "../lib/supabase"
import type { Review } from "../types"
import { mockReviews } from "../data/mockReviews"

const isUuid = (value: string): boolean => {
  // Basic UUID v4 pattern check; prevents Postgres 22P02 errors on non-uuid ids like "1"
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
}

export const reviewService = {
  // Get reviews for a business
  getBusinessReviews: async (businessId: string): Promise<Review[]> => {
    // If we are in mock mode (non-UUID ids), avoid hitting Supabase and use local mock data to prevent 22P02
    if (!isUuid(businessId)) {
      return mockReviews.filter((r) => r.business_id === businessId)
    }
    const { data, error } = await supabase
      .from("reviews")
      .select("*, user:users!reviews_user_id_fkey ( id, name, avatar_url, verified, created_at, updated_at )")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching business reviews:", error)
      return []
    }

    return (data || []).map((r: any) => ({ ...r, user: r.user }))
  },

  // Add a new review
  addReview: async (
    review: Omit<Review, "id" | "created_at" | "updated_at" | "helpful_count" | "user">,
  ): Promise<Review> => {
    // Guard against stray properties like `user` which are not columns in `reviews`
    const {
      business_id,
      user_id,
      rating,
      comment,
      safety_rating,
      inclusivity_rating,
      staff_friendliness,
      accessibility_rating,
      would_recommend,
      visit_date,
      // @ts-expect-error ensure no stray `user` sneaks through
      user: _ignoredUser,
      ...rest
    } = review as any

    const payload = {
      business_id,
      user_id,
      rating,
      comment,
      safety_rating,
      inclusivity_rating,
      staff_friendliness,
      accessibility_rating,
      would_recommend,
      visit_date,
    }

    // Ignore any additional unexpected fields to avoid PostgREST 204 errors
    const { data, error } = await supabase
      .from("reviews")
      .insert({ ...payload })
      .select("*")
      .single()

    if (error) {
      console.error("Error adding review:", error)
      throw error
    }

    return data as Review
  },

  // Mark review as helpful
  markReviewHelpful: async (reviewId: string): Promise<void> => {
    // For simplicity, increment helpful_count client-side via RPC or update
    const { data, error } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single()

    if (error) {
      console.error("Error reading review:", error)
      throw error
    }

    const next = (data?.helpful_count || 0) + 1
    const { error: updErr } = await supabase.from("reviews").update({ helpful_count: next }).eq("id", reviewId)
    if (updErr) {
      console.error("Error updating helpful count:", updErr)
      throw updErr
    }
  },

  // Get user's reviews
  getUserReviews: async (userId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user reviews:", error)
      return []
    }

    return data || []
  },

  // Calculate average ratings for a business
  getBusinessRatings: async (businessId: string) => {
    // Guard against non-UUID ids which cause Postgres 22P02 when filtering UUID columns
    let reviews: any[] = []
    if (!isUuid(businessId)) {
      reviews = mockReviews.filter((r) => r.business_id === businessId)
        .map((r) => ({
          rating: r.rating,
          safety_rating: r.safety_rating,
          inclusivity_rating: r.inclusivity_rating,
          staff_friendliness: r.staff_friendliness,
          accessibility_rating: r.accessibility_rating,
        }))
    } else {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating, safety_rating, inclusivity_rating, staff_friendliness, accessibility_rating")
        .eq("business_id", businessId)
      if (error) {
        console.error("Error calculating business ratings:", error)
        return { overall: 0, safety: 0, inclusivity: 0, staff: 0, accessibility: 0, count: 0 }
      }
      reviews = data || []
    }

    const count = reviews.length
    if (count === 0) {
      return { overall: 0, safety: 0, inclusivity: 0, staff: 0, accessibility: 0, count: 0 }
    }

    const avg = (key: keyof typeof reviews[number]) =>
      reviews.reduce((sum: number, r: any) => sum + (r[key] || 0), 0) / count

    return {
      overall: avg("rating" as any),
      safety: avg("safety_rating" as any),
      inclusivity: avg("inclusivity_rating" as any),
      staff: avg("staff_friendliness" as any),
      accessibility: avg("accessibility_rating" as any),
      count,
    }
  },
}
