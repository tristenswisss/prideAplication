import { mockReviews } from "../data/mockReviews"
import type { Review } from "../types"

export const reviewService = {
  // Get reviews for a business
  getBusinessReviews: async (businessId: string): Promise<Review[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockReviews.filter((review) => review.business_id === businessId)
  },

  // Add a new review
  addReview: async (review: Omit<Review, "id" | "created_at" | "updated_at" | "helpful_count">): Promise<Review> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substr(2, 9),
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockReviews.push(newReview)
    return newReview
  },

  // Mark review as helpful
  markReviewHelpful: async (reviewId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const review = mockReviews.find((r) => r.id === reviewId)
    if (review) {
      review.helpful_count += 1
    }
  },

  // Get user's reviews
  getUserReviews: async (userId: string): Promise<Review[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockReviews.filter((review) => review.user_id === userId)
  },

  // Calculate average ratings for a business
  getBusinessRatings: async (businessId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const reviews = mockReviews.filter((review) => review.business_id === businessId)

    if (reviews.length === 0) {
      return {
        overall: 0,
        safety: 0,
        inclusivity: 0,
        staff: 0,
        accessibility: 0,
        count: 0,
      }
    }

    return {
      overall: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
      safety: reviews.reduce((sum, r) => sum + r.safety_rating, 0) / reviews.length,
      inclusivity: reviews.reduce((sum, r) => sum + r.inclusivity_rating, 0) / reviews.length,
      staff: reviews.reduce((sum, r) => sum + r.staff_friendliness, 0) / reviews.length,
      accessibility: reviews.reduce((sum, r) => sum + (r.accessibility_rating || 0), 0) / reviews.length,
      count: reviews.length,
    }
  },
}
