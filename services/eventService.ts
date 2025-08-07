import { notificationService } from "./notificationService"
import type { Event, EventAttendee } from "../types"
import { supabase } from "../lib/supabase"

export const eventService = {
  // Get all events
  getAllEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return data || [];
  },

  // Get events by category
  getEventsByCategory: async (category: string): Promise<Event[]> => {
    if (category === "all") {
      return eventService.getAllEvents();
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('category', category)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events by category:', error);
      return [];
    }

    return data || [];
  },

  // Get upcoming events
  getUpcomingEvents: async (): Promise<Event[]> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }

    return data || [];
  },

  // Get event by ID
  getEventById: async (id: string): Promise<Event | null> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching event by ID:', error);
      return null;
    }

    return data || null;
  },

  // RSVP to event
  rsvpToEvent: async (eventId: string, userId: string, status: "going" | "interested" | "not_going"): Promise<void> => {
    // Remove existing RSVP
    const { error: deleteError } = await supabase
      .from('event_attendees')
      .delete()
      .match({ event_id: eventId, user_id: userId });

    if (deleteError) {
      console.error('Error removing existing RSVP:', deleteError);
      throw deleteError;
    }

    // Add new RSVP if not "not_going"
    if (status !== "not_going") {
      const { error: insertError } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: userId,
          status,
        });

      if (insertError) {
        console.error('Error inserting new RSVP:', insertError);
        throw insertError;
      }
    }

    // Note: The event attendee count will be automatically updated by the database trigger
  },

  // Get user's RSVP status for an event
  getUserRSVPStatus: async (eventId: string, userId: string): Promise<"going" | "interested" | "not_going" | null> => {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('status')
      .match({ event_id: eventId, user_id: userId })
      .single();

    if (error) {
      // If no record found, user hasn't RSVP'd
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user RSVP status:', error);
      return null;
    }

    return data?.status || null;
  },

  // Get event attendees
  getEventAttendees: async (eventId: string): Promise<EventAttendee[]> => {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching event attendees:', error);
      return [];
    }

    return data || [];
  },

  // Get user's events
  getUserEvents: async (userId: string): Promise<Event[]> => {
    // First, get the events the user has RSVP'd to
    const { data: attendees, error: attendeesError } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId);

    if (attendeesError) {
      console.error('Error fetching user event attendees:', attendeesError);
      return [];
    }

    // If no events, return empty array
    if (!attendees || attendees.length === 0) {
      return [];
    }

    // Get the event IDs
    const eventIds = attendees.map(attendee => attendee.event_id);

    // Get the actual events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds);

    if (eventsError) {
      console.error('Error fetching user events:', eventsError);
      return [];
    }

    return events || [];
  },
}

export { notificationService }
