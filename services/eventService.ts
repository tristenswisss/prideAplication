import { mockEvents } from "../data/mockEvents"
import { mockAttendees } from "../data/mockAtendees"
import { notificationService } from "./notificationService"
import type { Event, EventAttendee } from "../types"

export const eventService = {
  // Get all events
  getAllEvents: async (): Promise<Event[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return mockEvents
  },

  // Get events by category
  getEventsByCategory: async (category: string): Promise<Event[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (category === "all") {
      return mockEvents
    }
    return mockEvents.filter((event) => event.category === category)
  },

  // Get upcoming events
  getUpcomingEvents: async (): Promise<Event[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const now = new Date()
    return mockEvents.filter((event) => new Date(event.date) >= now)
  },

  // Get event by ID
  getEventById: async (id: string): Promise<Event | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockEvents.find((event) => event.id === id) || null
  },

  // RSVP to event
  rsvpToEvent: async (eventId: string, userId: string, status: "going" | "interested" | "not_going"): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Remove existing RSVP
    const existingIndex = mockAttendees.findIndex(
      (attendee) => attendee.event_id === eventId && attendee.user_id === userId,
    )
    if (existingIndex !== -1) {
      mockAttendees.splice(existingIndex, 1)
    }

    // Add new RSVP if not "not_going"
    if (status !== "not_going") {
      const newAttendee: EventAttendee = {
        id: Math.random().toString(36).substr(2, 9),
        event_id: eventId,
        user_id: userId,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockAttendees.push(newAttendee)
    }

    // Update event attendee count
    const event = mockEvents.find((e) => e.id === eventId)
    if (event) {
      const goingCount = mockAttendees.filter((a) => a.event_id === eventId && a.status === "going").length
      event.attendee_count = goingCount
    }
  },

  // Get user's RSVP status for an event
  getUserRSVPStatus: async (eventId: string, userId: string): Promise<"going" | "interested" | "not_going" | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const attendee = mockAttendees.find((a) => a.event_id === eventId && a.user_id === userId)
    return attendee?.status || null
  },

  // Get event attendees
  getEventAttendees: async (eventId: string): Promise<EventAttendee[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockAttendees.filter((attendee) => attendee.event_id === eventId)
  },

  // Get user's events
  getUserEvents: async (userId: string): Promise<Event[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const userEventIds = mockAttendees
      .filter((attendee) => attendee.user_id === userId)
      .map((attendee) => attendee.event_id)

    return mockEvents.filter((event) => userEventIds.includes(event.id))
  },
}

export { notificationService }
