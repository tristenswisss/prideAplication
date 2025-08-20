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

  // Get events created by a specific organizer
  getEventsByOrganizer: async (organizerId: string): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching events by organizer:', error);
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

  // RSVP to event (upsert to avoid needing DELETE policy)
  rsvpToEvent: async (eventId: string, userId: string, status: "going" | "interested" | "not_going"): Promise<void> => {
    const { error } = await supabase
      .from('event_attendees')
      .upsert(
        { event_id: eventId, user_id: userId, status },
        { onConflict: 'event_id,user_id' }
      );

    if (error) {
      console.error('Error upserting RSVP:', error);
      throw error;
    }

    // attendee_count trigger in DB handles counts for status = 'going'
  },

  // Get user's RSVP status for an event
  getUserRSVPStatus: async (eventId: string, userId: string): Promise<"going" | "interested" | null> => {
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

    if (!data?.status || data.status === 'not_going') return null;
    return data.status as 'going' | 'interested';
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

  // Get user's events including RSVP status and RSVP date
  getUserEventsWithRSVP: async (
    userId: string,
  ): Promise<Array<Event & { rsvpStatus: 'going' | 'interested' | 'not_going'; rsvpDate: string }>> => {
    // Fetch attendee rows for this user
    const { data: attendeeRows, error: attendeeErr } = await supabase
      .from('event_attendees')
      .select('event_id, status, created_at')
      .eq('user_id', userId)
      .in('status', ['going','interested'])
      .order('created_at', { ascending: false });

    if (attendeeErr) {
      console.error('Error fetching user RSVP rows:', attendeeErr);
      return [];
    }

    if (!attendeeRows || attendeeRows.length === 0) {
      return [];
    }

    // Fetch all related events
    const eventIds = attendeeRows.map((r: any) => r.event_id);
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds);

    if (eventsErr) {
      console.error('Error fetching events for RSVP list:', eventsErr);
      return [];
    }

    const eventById: Record<string, Event> = {};
    (events || []).forEach((ev: any) => {
      eventById[ev.id] = ev as Event;
    });

    // Merge
    const merged = attendeeRows
      .map((row: any) => {
        const ev = eventById[row.event_id];
        if (!ev) return null;
        return {
          ...ev,
          rsvpStatus: row.status as 'going' | 'interested' | 'not_going',
          rsvpDate: row.created_at as string,
        };
      })
      .filter(Boolean) as Array<Event & { rsvpStatus: 'going' | 'interested' | 'not_going'; rsvpDate: string }>;

    return merged;
  },
}

export { notificationService }
