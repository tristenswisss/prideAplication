import { supabase } from "../lib/supabase"
import type { LiveEvent, LiveMessage, UserProfile } from "../types/messaging"

export const liveEventService = {
  // Live Events
  getLiveEvents: async (): Promise<LiveEvent[]> => {
    const { data, error } = await supabase
      .from("live_events")
      .select(
        `*, host:users!live_events_host_id_fkey ( id, email, name, avatar_url, verified, created_at, updated_at )`,
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching live events:", error)
      return []
    }

    return (data || []).map((evt: any) => ({
      id: evt.id,
      event_id: evt.event_id,
      title: evt.title,
      description: evt.description,
      host_id: evt.host_id,
      host: (evt.host || undefined) as UserProfile | undefined,
      stream_url: evt.stream_url || undefined,
      is_live: !!evt.is_live,
      viewer_count: evt.viewer_count || 0,
      max_viewers: evt.max_viewers || 0,
      started_at: evt.started_at || undefined,
      ended_at: evt.ended_at || undefined,
      chat_enabled: evt.chat_enabled ?? true,
      created_at: evt.created_at,
    }))
  },

  getLiveEvent: async (liveEventId: string): Promise<LiveEvent | null> => {
    const { data, error } = await supabase
      .from("live_events")
      .select(
        `*, host:users!live_events_host_id_fkey ( id, email, name, avatar_url, verified, created_at, updated_at )`,
      )
      .eq("id", liveEventId)
      .single()

    if (error) {
      console.error("Error fetching live event:", error)
      return null
    }

    return data
      ? {
          id: data.id,
          event_id: data.event_id,
          title: data.title,
          description: data.description,
          host_id: data.host_id,
          host: (data.host || undefined) as UserProfile | undefined,
          stream_url: data.stream_url || undefined,
          is_live: !!data.is_live,
          viewer_count: data.viewer_count || 0,
          max_viewers: data.max_viewers || 0,
          started_at: data.started_at || undefined,
          ended_at: data.ended_at || undefined,
          chat_enabled: data.chat_enabled ?? true,
          created_at: data.created_at,
        }
      : null
  },

  createLiveEvent: async (
    eventId: string | undefined,
    hostId: string,
    title: string,
    description: string,
  ): Promise<LiveEvent> => {
    const { data, error } = await supabase
      .from("live_events")
      .insert({
        event_id: eventId ?? null,
        title,
        description,
        host_id: hostId,
        is_live: false,
        viewer_count: 0,
        max_viewers: 0,
        chat_enabled: true,
      })
      .select(
        `*, host:users!live_events_host_id_fkey ( id, email, name, avatar_url, verified, created_at, updated_at )`,
      )
      .single()

    if (error) {
      console.error("Error creating live event:", error)
      throw error
    }

    return {
      id: data.id,
      event_id: data.event_id,
      title: data.title,
      description: data.description,
      host_id: data.host_id,
      host: (data.host || undefined) as UserProfile | undefined,
      is_live: !!data.is_live,
      viewer_count: data.viewer_count || 0,
      max_viewers: data.max_viewers || 0,
      chat_enabled: data.chat_enabled ?? true,
      created_at: data.created_at,
    }
  },

  startLiveStream: async (liveEventId: string): Promise<void> => {
    const { error } = await supabase
      .from("live_events")
      .update({
        is_live: true,
        started_at: new Date().toISOString(),
        stream_url: `rtmp://stream.example/${liveEventId}`,
      })
      .eq("id", liveEventId)

    if (error) {
      console.error("Error starting live stream:", error)
      throw error
    }
  },

  endLiveStream: async (liveEventId: string): Promise<void> => {
    // Fetch current counts to compute max
    const { data } = await supabase
      .from("live_events")
      .select("viewer_count, max_viewers")
      .eq("id", liveEventId)
      .single()

    const currentCount = data?.viewer_count ?? 0
    const maxViewers = Math.max(data?.max_viewers ?? 0, currentCount)

    const { error } = await supabase
      .from("live_events")
      .update({ is_live: false, ended_at: new Date().toISOString(), max_viewers: maxViewers, viewer_count: 0 })
      .eq("id", liveEventId)

    if (error) {
      console.error("Error ending live stream:", error)
      throw error
    }
  },

  joinLiveStream: async (liveEventId: string, userId: string): Promise<void> => {
    // Increment viewer_count and maybe max_viewers
    // Note: For strict atomicity, implement a DB function; this is acceptable in most cases
    const { data, error } = await supabase
      .from("live_events")
      .select("viewer_count, max_viewers, is_live")
      .eq("id", liveEventId)
      .single()

    if (error) {
      console.error("Error reading live event:", error)
      throw error
    }
    if (!data?.is_live) return

    const newViewerCount = (data.viewer_count ?? 0) + 1
    const newMax = Math.max(data.max_viewers ?? 0, newViewerCount)

    const { error: updErr } = await supabase
      .from("live_events")
      .update({ viewer_count: newViewerCount, max_viewers: newMax })
      .eq("id", liveEventId)
    if (updErr) {
      console.error("Error updating viewer count:", updErr)
    }

    // Add join system message
    await supabase.from("live_messages").insert({
      live_event_id: liveEventId,
      user_id: userId,
      content: "joined the stream",
      message_type: "join",
    })
  },

  leaveLiveStream: async (liveEventId: string, userId: string): Promise<void> => {
    const { data } = await supabase
      .from("live_events")
      .select("viewer_count")
      .eq("id", liveEventId)
      .single()

    const curr = data?.viewer_count ?? 0
    const next = Math.max(0, curr - 1)

    const { error } = await supabase.from("live_events").update({ viewer_count: next }).eq("id", liveEventId)
    if (error) {
      console.error("Error decrementing viewer count:", error)
    }

    await supabase.from("live_messages").insert({
      live_event_id: liveEventId,
      user_id: userId,
      content: "left the stream",
      message_type: "leave",
    })
  },

  // Live Chat
  getLiveMessages: async (liveEventId: string): Promise<LiveMessage[]> => {
    const { data, error } = await supabase
      .from("live_messages")
      .select(
        `*, user:users!live_messages_user_id_fkey ( id, email, name, avatar_url, verified, created_at, updated_at )`,
      )
      .eq("live_event_id", liveEventId)
      .order("sent_at", { ascending: true })

    if (error) {
      console.error("Error fetching live messages:", error)
      return []
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      live_event_id: m.live_event_id,
      user_id: m.user_id,
      user: (m.user || undefined) as UserProfile | undefined,
      content: m.content,
      message_type: (m.message_type || "chat") as LiveMessage["message_type"],
      sent_at: m.sent_at,
      created_at: m.created_at,
      metadata: m.metadata || undefined,
    }))
  },

  sendLiveMessage: async (
    liveEventId: string,
    userId: string,
    content: string,
    messageType: LiveMessage["message_type"] = "chat",
    metadata?: LiveMessage["metadata"],
  ): Promise<LiveMessage> => {
    const { data, error } = await supabase
      .from("live_messages")
      .insert({
        live_event_id: liveEventId,
        user_id: userId,
        content,
        message_type: messageType,
        metadata: metadata ?? null,
      })
      .select(
        `*, user:users!live_messages_user_id_fkey ( id, email, name, avatar_url, verified, created_at, updated_at )`,
      )
      .single()

    if (error) {
      console.error("Error sending live message:", error)
      throw error
    }

    return {
      id: data.id,
      live_event_id: data.live_event_id,
      user_id: data.user_id,
      user: (data.user || undefined) as UserProfile | undefined,
      content: data.content,
      message_type: (data.message_type || "chat") as LiveMessage["message_type"],
      sent_at: data.sent_at,
      created_at: data.created_at,
      metadata: data.metadata || undefined,
    }
  },

  // Reactions
  sendReaction: async (liveEventId: string, userId: string, reaction: string): Promise<void> => {
    await liveEventService.sendLiveMessage(liveEventId, userId, reaction, "reaction", { reaction })
  },
}
