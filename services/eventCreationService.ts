import { supabase } from "../lib/supabase"
import type { Event } from "../types"

export interface CreateEventData {
  title: string
  description: string
  date: string
  start_time: string
  end_time?: string
  location: string
  organizer_id: string
  category: Event["category"]
  tags: string[]
  is_free: boolean
  price?: number
  max_attendees?: number
  requires_approval?: boolean
  isVirtual: boolean
  virtual_link?: string
  isTicketed: boolean
}

export interface EventCreationResponse {
  success: boolean
  event?: Event
  error?: string
}

export class EventCreationService {
  static async createEvent(eventData: CreateEventData): Promise<EventCreationResponse> {
    try {
      console.log("Creating event with data:", eventData)

      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.organizer_id) {
        return { success: false, error: "Missing required fields" }
      }

      // Validate date and time
      const eventDate = new Date(eventData.date)
      if (eventDate < new Date()) {
        return { success: false, error: "Event date cannot be in the past" }
      }

      // Prepare data for database
      const dbEventData = {
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        date: eventData.date,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location.trim(),
        organizer_id: eventData.organizer_id,
        category: eventData.category,
        tags: eventData.tags,
        is_free: eventData.is_free,
        price: eventData.price || null,
        max_attendees: eventData.max_attendees || null,
        requires_approval: eventData.requires_approval || false,
        is_virtual: eventData.isVirtual,
        virtual_link: eventData.virtual_link || null,
        requires_tickets: eventData.isTicketed,
        status: "upcoming" as const,
        attendee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Database event data:", dbEventData)

      // Insert event into database
      const { data, error } = await supabase.from("events").insert([dbEventData]).select().single()

      if (error) {
        console.error("Database error creating event:", error)
        return { success: false, error: `Failed to create event: ${error.message}` }
      }

      if (!data) {
        return { success: false, error: "No data returned from event creation" }
      }

      // Transform database response to Event type
      const createdEvent: Event = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        organizer_id: data.organizer_id,
        category: data.category,
        tags: data.tags || [],
        is_free: data.is_free,
        price: data.price,
        max_attendees: data.max_attendees,
        attendee_count: data.attendee_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      console.log("Event created successfully:", createdEvent)
      return { success: true, event: createdEvent }
    } catch (error: any) {
      console.error("Error in createEvent:", error)
      return { success: false, error: error.message || "Failed to create event" }
    }
  }

  static async updateEvent(eventId: string, eventData: Partial<CreateEventData>): Promise<EventCreationResponse> {
    try {
      if (!eventId) {
        return { success: false, error: "Event ID is required" }
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      // Only include fields that are provided
      if (eventData.title) updateData.title = eventData.title.trim()
      if (eventData.description) updateData.description = eventData.description.trim()
      if (eventData.date) updateData.date = eventData.date
      if (eventData.start_time) updateData.start_time = eventData.start_time
      if (eventData.end_time) updateData.end_time = eventData.end_time
      if (eventData.location) updateData.location = eventData.location.trim()
      if (eventData.category) updateData.category = eventData.category
      if (eventData.tags) updateData.tags = eventData.tags
      if (typeof eventData.is_free === "boolean") updateData.is_free = eventData.is_free
      if (eventData.price !== undefined) updateData.price = eventData.price
      if (eventData.max_attendees !== undefined) updateData.max_attendees = eventData.max_attendees
      if (typeof eventData.requires_approval === "boolean") updateData.requires_approval = eventData.requires_approval
      if (typeof eventData.isVirtual === "boolean") updateData.is_virtual = eventData.isVirtual
      if (eventData.virtual_link !== undefined) updateData.virtual_link = eventData.virtual_link
      if (typeof eventData.isTicketed === "boolean") updateData.requires_tickets = eventData.isTicketed

      // Update event in database
      const { data, error } = await supabase.from("events").update(updateData).eq("id", eventId).select().single()

      if (error) {
        console.error("Database error updating event:", error)
        return { success: false, error: `Failed to update event: ${error.message}` }
      }

      if (!data) {
        return { success: false, error: "No data returned from event update" }
      }

      // Transform database response to Event type
      const updatedEvent: Event = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        organizer_id: data.organizer_id,
        category: data.category,
        tags: data.tags || [],
        is_free: data.is_free,
        price: data.price,
        max_attendees: data.max_attendees,
        attendee_count: data.attendee_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      return { success: true, event: updatedEvent }
    } catch (error: any) {
      console.error("Error in updateEvent:", error)
      return { success: false, error: error.message || "Failed to update event" }
    }
  }

  static async deleteEvent(eventId: string, organizerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!eventId || !organizerId) {
        return { success: false, error: "Event ID and organizer ID are required" }
      }

      // Verify the user is the organizer
      const { data: event, error: fetchError } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", eventId)
        .single()

      if (fetchError) {
        return { success: false, error: `Failed to fetch event: ${fetchError.message}` }
      }

      if (event.organizer_id !== organizerId) {
        return { success: false, error: "Only the event organizer can delete this event" }
      }

      // Delete the event
      const { error } = await supabase.from("events").delete().eq("id", eventId)

      if (error) {
        console.error("Database error deleting event:", error)
        return { success: false, error: `Failed to delete event: ${error.message}` }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in deleteEvent:", error)
      return { success: false, error: error.message || "Failed to delete event" }
    }
  }

  static validateEventData(eventData: CreateEventData): string[] {
    const errors: string[] = []

    if (!eventData.title?.trim()) {
      errors.push("Event title is required")
    }

    if (!eventData.description?.trim()) {
      errors.push("Event description is required")
    }

    if (!eventData.location?.trim() && !eventData.isVirtual) {
      errors.push("Location is required for non-virtual events")
    }

    if (eventData.isVirtual && !eventData.virtual_link?.trim()) {
      errors.push("Virtual link is required for virtual events")
    }

    if (!eventData.date) {
      errors.push("Event date is required")
    } else {
      const eventDate = new Date(eventData.date)
      if (eventDate < new Date()) {
        errors.push("Event date cannot be in the past")
      }
    }

    if (!eventData.start_time) {
      errors.push("Start time is required")
    }

    if (!eventData.end_time) {
      errors.push("End time is required")
    }

    if (eventData.start_time && eventData.end_time) {
      const startTime = new Date(`2000-01-01T${eventData.start_time}`)
      const endTime = new Date(`2000-01-01T${eventData.end_time}`)
      if (endTime <= startTime) {
        errors.push("End time must be after start time")
      }
    }

    if (!eventData.is_free && (!eventData.price || eventData.price <= 0)) {
      errors.push("Price must be greater than 0 for paid events")
    }

    if (eventData.max_attendees && eventData.max_attendees <= 0) {
      errors.push("Max attendees must be greater than 0")
    }

    return errors
  }

  getEventCategories(): string[] {
    return ["celebration", "networking", "entertainment", "education", "support", "other"]
  }

  getPopularTags(): string[] {
    return [
      "pride",
      "networking",
      "social",
      "support",
      "education",
      "celebration",
      "community",
      "workshop",
      "discussion",
      "fundraiser",
      "volunteer",
      "activism",
    ]
  }

  async getUserEvents(userId: string): Promise<{ success: boolean; data?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          organizer:users(id, name, avatar_url)
        `)
        .eq("organizer_id", userId)
        .order("date", { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error fetching user events:", error)
      return { success: false, error: error.message }
    }
  }
}

export const eventCreationService = EventCreationService
