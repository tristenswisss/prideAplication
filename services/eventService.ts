import { notificationService } from "./notificationService"
import type { Event, EventAttendee } from "../types"
import { supabase } from "../lib/supabase"
import { queryCache } from "../lib/queryCache"

export const eventService = {
  // Get all events with caching
  getAllEvents: async (): Promise<Event[]> => {
    const cacheKey = 'getAllEvents'

    // Try to get from cache first
    const cached = await queryCache.get<Event[]>(cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:users!events_organizer_id_fkey (id, name, avatar_url, profiles(username))
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    const events: Event[] = (data || []).map((row: any) => {
      const organizer = row.organizer || null
      const profile = Array.isArray(organizer?.profiles) ? organizer.profiles[0] : organizer?.profiles
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        date: row.date,
        time: row.start_time,
        start_time: row.start_time,
        end_time: row.end_time,
        location: row.location,
        organizer_id: row.organizer_id,
        organizer: organizer ? { id: organizer.id, name: organizer.name, avatar_url: organizer.avatar_url, verified: false, created_at: row.created_at, updated_at: row.updated_at, email: "" , username: profile?.username } as any : undefined,
        category: row.category,
        tags: row.tags || [],
        is_free: row.is_free,
        price: row.price,
        max_attendees: row.max_attendees,
        attendee_count: row.attendee_count || 0,
        current_attendees: row.attendee_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as Event
    })

    // Cache the result for 10 minutes
    await queryCache.set(cacheKey, events, undefined, 10 * 60 * 1000)

    return events;
  },

  // Get events with pagination
  getEventsPaginated: async (page: number = 1, limit: number = 20): Promise<{ events: Event[], total: number, hasMore: boolean }> => {
    const offset = (page - 1) * limit
    const cacheKey = `getEventsPaginated_${page}_${limit}`

    // Try to get from cache first
    const cached = await queryCache.get<{ events: Event[], total: number, hasMore: boolean }>(cacheKey)
    if (cached) {
      return cached
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    // Get paginated events
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:users!events_organizer_id_fkey (id, name, avatar_url, profiles(username))
      `)
      .order('date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching paginated events:', error);
      return { events: [], total: 0, hasMore: false };
    }

    const events: Event[] = (data || []).map((row: any) => {
      const organizer = row.organizer || null
      const profile = Array.isArray(organizer?.profiles) ? organizer.profiles[0] : organizer?.profiles
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        date: row.date,
        time: row.start_time,
        start_time: row.start_time,
        end_time: row.end_time,
        location: row.location,
        organizer_id: row.organizer_id,
        organizer: organizer ? { id: organizer.id, name: organizer.name, avatar_url: organizer.avatar_url, verified: false, created_at: row.created_at, updated_at: row.updated_at, email: "" , username: profile?.username } as any : undefined,
        category: row.category,
        tags: row.tags || [],
        is_free: row.is_free,
        price: row.price,
        max_attendees: row.max_attendees,
        attendee_count: row.attendee_count || 0,
        current_attendees: row.attendee_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as Event
    })

    const result = {
      events,
      total: totalCount || 0,
      hasMore: (offset + limit) < (totalCount || 0)
    }

    // Cache the result for 5 minutes
    await queryCache.set(cacheKey, result, undefined, 5 * 60 * 1000)

    return result;
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

  // Get events created by a specific organizer/user
  getEventsByOrganizer: async (organizerId: string): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events by organizer:', error);
      return [];
    }

    return data || [];
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

    // Invalidate related caches
    await queryCache.invalidatePattern('getAllEvents')
    await queryCache.invalidatePattern('getEventsPaginated')
    await queryCache.invalidatePattern(`getUserEvents_${userId}`)

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
