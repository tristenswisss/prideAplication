import { supabase } from "./supabase"

export type Unsubscribe = () => void

export const realtime = {
  subscribeToMessages: (conversationId: string, onInsert: (row: any) => void): Unsubscribe => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => onInsert(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToLiveMessages: (liveEventId: string, onInsert: (row: any) => void): Unsubscribe => {
    const channel = supabase
      .channel(`live_messages:${liveEventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_messages", filter: `live_event_id=eq.${liveEventId}` },
        (payload) => onInsert(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToLiveEventUpdates: (liveEventId: string, onUpdate: (row: any) => void): Unsubscribe => {
    const channel = supabase
      .channel(`live_events:${liveEventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_events", filter: `id=eq.${liveEventId}` },
        (payload) => onUpdate(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToPosts: (onInsert: (row: any) => void): Unsubscribe => {
    const channel = supabase
      .channel("posts:all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => onInsert(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  subscribeToComments: (onInsert: (row: any) => void): Unsubscribe => {
    const channel = supabase
      .channel("comments:all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) =>
        onInsert(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}