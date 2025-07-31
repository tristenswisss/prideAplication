import type { Event } from "../types"

interface CreateEventData {
  title: string
  description: string
  date: string
  endDate?: string
  location: string
  latitude?: number
  longitude?: number
  category: string
  isVirtual: boolean
  isTicketed: boolean
  ticketPrice?: number
  maxAttendees?: number
  tags: string[]
  imageUrl?: string
}

class EventCreationService {
  async createEvent(eventData: CreateEventData): Promise<Event> {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Map category string to Event category type
      const categoryMap: Record<string, Event["category"]> = {
        celebration: "celebration",
        networking: "networking",
        entertainment: "entertainment",
        education: "education",
        support: "support",
        other: "other",
      }

      // Ensure the category is one of the allowed values, defaulting to "other"
      const eventCategory = categoryMap[eventData.category] || "other"

      const newEvent: Event = {
        id: Date.now().toString(),
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        start_time: "00:00:00", // Default start time
        end_time: "23:59:59", // Default end time
        location: eventData.location,
        latitude: eventData.latitude || 37.7749,
        longitude: eventData.longitude || -122.4194,
        category: eventCategory,
        organizer_id: "current_user_id", // This would come from auth context
        attendee_count: 0,
        max_attendees: eventData.maxAttendees || 100,
        tags: eventData.tags,
        image_url: eventData.imageUrl || "",
        price: eventData.ticketPrice || 0,
        is_free: !eventData.isTicketed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // In a real app, this would make an API call to create the event
      // const response = await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(eventData)
      // })
      // return await response.json()

      return newEvent
    } catch (error) {
      console.error("Error creating event:", error)
      throw new Error("Failed to create event")
    }
  }

  async updateEvent(eventId: string, eventData: Partial<CreateEventData>): Promise<Event> {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In a real app, this would update the event via API
      throw new Error("Event update not implemented")
    } catch (error) {
      console.error("Error updating event:", error)
      throw new Error("Failed to update event")
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // In a real app, this would delete the event via API
      console.log(`Event ${eventId} deleted`)
    } catch (error) {
      console.error("Error deleting event:", error)
      throw new Error("Failed to delete event")
    }
  }

  validateEventData(eventData: CreateEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!eventData.title.trim()) {
      errors.push("Event title is required")
    }

    if (!eventData.description.trim()) {
      errors.push("Event description is required")
    }

    if (!eventData.date) {
      errors.push("Event date is required")
    } else {
      const eventDate = new Date(eventData.date)
      const now = new Date()
      if (eventDate <= now) {
        errors.push("Event date must be in the future")
      }
    }

    if (!eventData.location.trim() && !eventData.isVirtual) {
      errors.push("Event location is required for in-person events")
    }

    if (!eventData.category) {
      errors.push("Event category is required")
    }

    if (eventData.isTicketed && eventData.ticketPrice !== undefined && eventData.ticketPrice < 0) {
      errors.push("Ticket price cannot be negative")
    }

    if (eventData.maxAttendees !== undefined && eventData.maxAttendees < 1) {
      errors.push("Maximum attendees must be at least 1")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  getEventCategories(): string[] {
    return [
      "celebration",
      "networking",
      "education",
      "support",
      "social",
      "activism",
      "arts",
      "sports",
      "health",
      "other",
    ]
  }

  getPopularTags(): string[] {
    return [
      "pride",
      "community",
      "lgbtq",
      "trans",
      "queer",
      "bisexual",
      "lesbian",
      "gay",
      "nonbinary",
      "ally",
      "youth",
      "seniors",
      "family",
      "professional",
      "creative",
      "wellness",
      "activism",
      "education",
      "support",
      "social",
    ]
  }
}

export const eventCreationService = new EventCreationService()
