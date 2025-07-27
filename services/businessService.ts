import { mockBusinesses } from "../data/mockBusinesses"
import type { Business } from "../types"

export const businessService = {
  // Get all businesses
  getAllBusinesses: async (): Promise<Business[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    return mockBusinesses
  },

  // Get businesses by category
  getBusinessesByCategory: async (category: string): Promise<Business[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (category === "all") {
      return mockBusinesses
    }
    return mockBusinesses.filter((business) => business.category === category)
  },

  // Search businesses
  searchBusinesses: async (query: string): Promise<Business[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const lowercaseQuery = query.toLowerCase()
    return mockBusinesses.filter(
      (business) =>
        business.name.toLowerCase().includes(lowercaseQuery) ||
        business.description.toLowerCase().includes(lowercaseQuery) ||
        business.category.toLowerCase().includes(lowercaseQuery),
    )
  },

  // Get businesses near location
  getBusinessesNearLocation: async (latitude: number, longitude: number, radius = 10): Promise<Business[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Simple distance calculation (in a real app, you'd use proper geolocation)
    return mockBusinesses.filter((business) => {
      const distance = Math.sqrt(
        Math.pow(business.latitude - latitude, 2) + Math.pow(business.longitude - longitude, 2),
      )
      return distance <= radius / 100 // Rough conversion for demo
    })
  },

  // Get business by ID
  getBusinessById: async (id: string): Promise<Business | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockBusinesses.find((business) => business.id === id) || null
  },

  // Get featured businesses (highest rated)
  getFeaturedBusinesses: async (): Promise<Business[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockBusinesses.filter((business) => business.rating >= 4.7).slice(0, 5)
  },
}
