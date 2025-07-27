import { storage, STORAGE_KEYS } from "./storage"
import type { Business, Event } from "../types"

export interface SearchFilters {
  category?: string
  lgbtqFriendly?: boolean
  transFriendly?: boolean
  wheelchairAccessible?: boolean
  verified?: boolean
  rating?: number
  priceRange?: string
  distance?: number
  openNow?: boolean
}

export interface SearchResult {
  businesses: Business[]
  events: Event[]
  totalResults: number
}

export const searchService = {
  // Advanced search with filters
  search: async (query: string, filters: SearchFilters = {}): Promise<SearchResult> => {
    try {
      // Get cached data for offline search
      const businesses = (await storage.getCacheItem<Business[]>(STORAGE_KEYS.BUSINESSES)) || []
      const events = (await storage.getCacheItem<Event[]>(STORAGE_KEYS.EVENTS)) || []

      // Search businesses
      let filteredBusinesses = businesses.filter((business) => {
        // Text search
        const matchesQuery =
          !query ||
          business.name.toLowerCase().includes(query.toLowerCase()) ||
          business.description.toLowerCase().includes(query.toLowerCase()) ||
          business.category.toLowerCase().includes(query.toLowerCase()) ||
          business.address.toLowerCase().includes(query.toLowerCase())

        if (!matchesQuery) return false

        // Apply filters
        if (filters.category && business.category !== filters.category) return false
        if (filters.lgbtqFriendly !== undefined && business.lgbtq_friendly !== filters.lgbtqFriendly) return false
        if (filters.transFriendly !== undefined && business.trans_friendly !== filters.transFriendly) return false
        if (
          filters.wheelchairAccessible !== undefined &&
          business.wheelchair_accessible !== filters.wheelchairAccessible
        )
          return false
        if (filters.verified !== undefined && business.verified !== filters.verified) return false
        if (filters.rating && business.rating < filters.rating) return false
        if (filters.priceRange && business.price_range !== filters.priceRange) return false

        return true
      })

      // Search events
      let filteredEvents = events.filter((event) => {
        const matchesQuery =
          !query ||
          event.title.toLowerCase().includes(query.toLowerCase()) ||
          event.description.toLowerCase().includes(query.toLowerCase()) ||
          event.location.toLowerCase().includes(query.toLowerCase()) ||
          event.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))

        if (!matchesQuery) return false

        // Apply filters
        if (filters.category && event.category !== filters.category) return false

        return true
      })

      // Sort results by relevance
      filteredBusinesses = sortByRelevance(filteredBusinesses, query)
      filteredEvents = sortEventsByRelevance(filteredEvents, query)

      // Save search to history
      if (query.trim()) {
        await saveSearchHistory(query, filters)
      }

      return {
        businesses: filteredBusinesses,
        events: filteredEvents,
        totalResults: filteredBusinesses.length + filteredEvents.length,
      }
    } catch (error) {
      console.error("Error performing search:", error)
      return { businesses: [], events: [], totalResults: 0 }
    }
  },

  // Get search suggestions
  getSuggestions: async (query: string): Promise<string[]> => {
    try {
      const businesses = (await storage.getCacheItem<Business[]>(STORAGE_KEYS.BUSINESSES)) || []
      const events = (await storage.getCacheItem<Event[]>(STORAGE_KEYS.EVENTS)) || []

      const suggestions = new Set<string>()

      // Business name suggestions
      businesses.forEach((business) => {
        if (business.name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(business.name)
        }
      })

      // Event title suggestions
      events.forEach((event) => {
        if (event.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(event.title)
        }
      })

      // Category suggestions
      const categories = [
        "restaurant",
        "bar",
        "healthcare",
        "shopping",
        "service",
        "hotel",
        "entertainment",
        "celebration",
        "networking",
        "education",
        "support",
      ]
      categories.forEach((category) => {
        if (category.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(category)
        }
      })

      return Array.from(suggestions).slice(0, 5)
    } catch (error) {
      console.error("Error getting suggestions:", error)
      return []
    }
  },

  // Get search history
  getSearchHistory: async (): Promise<string[]> => {
    try {
      return (await storage.getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY)) || []
    } catch (error) {
      console.error("Error getting search history:", error)
      return []
    }
  },

  // Clear search history
  clearSearchHistory: async (): Promise<void> => {
    try {
      await storage.removeItem(STORAGE_KEYS.SEARCH_HISTORY)
    } catch (error) {
      console.error("Error clearing search history:", error)
    }
  },
}

// Helper functions
const sortByRelevance = (businesses: Business[], query: string): Business[] => {
  if (!query) return businesses.sort((a, b) => b.rating - a.rating)

  return businesses.sort((a, b) => {
    const aScore = getRelevanceScore(a, query)
    const bScore = getRelevanceScore(b, query)
    return bScore - aScore
  })
}

const sortEventsByRelevance = (events: Event[], query: string): Event[] => {
  if (!query) return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return events.sort((a, b) => {
    const aScore = getEventRelevanceScore(a, query)
    const bScore = getEventRelevanceScore(b, query)
    return bScore - aScore
  })
}

const getRelevanceScore = (business: Business, query: string): number => {
  const lowerQuery = query.toLowerCase()
  let score = 0

  // Exact name match gets highest score
  if (business.name.toLowerCase() === lowerQuery) score += 100
  else if (business.name.toLowerCase().includes(lowerQuery)) score += 50

  // Description match
  if (business.description.toLowerCase().includes(lowerQuery)) score += 20

  // Category match
  if (business.category.toLowerCase().includes(lowerQuery)) score += 30

  // Rating bonus
  score += business.rating * 5

  // Verification bonus
  if (business.verified) score += 10

  return score
}

const getEventRelevanceScore = (event: Event, query: string): number => {
  const lowerQuery = query.toLowerCase()
  let score = 0

  // Exact title match gets highest score
  if (event.title.toLowerCase() === lowerQuery) score += 100
  else if (event.title.toLowerCase().includes(lowerQuery)) score += 50

  // Description match
  if (event.description.toLowerCase().includes(lowerQuery)) score += 20

  // Tags match
  event.tags.forEach((tag) => {
    if (tag.toLowerCase().includes(lowerQuery)) score += 15
  })

  // Upcoming events get priority
  const eventDate = new Date(event.date)
  const now = new Date()
  if (eventDate > now) score += 25

  return score
}

const saveSearchHistory = async (query: string, filters: SearchFilters): Promise<void> => {
  try {
    const history = (await storage.getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY)) || []

    // Remove if already exists
    const filteredHistory = history.filter((item) => item !== query)

    // Add to beginning
    filteredHistory.unshift(query)

    // Keep only last 20 searches
    const limitedHistory = filteredHistory.slice(0, 20)

    await storage.setItem(STORAGE_KEYS.SEARCH_HISTORY, limitedHistory)
  } catch (error) {
    console.error("Error saving search history:", error)
  }
}
