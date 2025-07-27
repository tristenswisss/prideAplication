import type { LiveEvent, LiveMessage, UserProfile } from "../types/messaging"

// Mock data for live events
const mockLiveEvents: LiveEvent[] = [
  {
    id: "live1",
    event_id: "1",
    title: "Pride Month Kickoff - Live Stream",
    description:
      "Join us for the official Pride Month kickoff celebration with live performances and community updates!",
    host_id: "user2",
    host: {
      id: "user2",
      email: "jordan@example.com",
      name: "Jordan Pride",
      username: "jordanpride",
      avatar_url: "/placeholder.svg?height=50&width=50&text=JP",
      bio: "Trans rights are human rights 🏳️‍⚧️",
      pronouns: "he/him",
      location: "Oakland, CA",
      interests: ["activism", "photography"],
      verified: false,
      follower_count: 189,
      following_count: 203,
      post_count: 67,
      is_online: true,
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-05T00:00:00Z",
    },
    stream_url: "https://example.com/stream/live1",
    is_live: true,
    viewer_count: 127,
    started_at: "2024-01-25T19:00:00Z",
    max_viewers: 156,
    chat_enabled: true,
    created_at: "2024-01-25T18:45:00Z",
  },
  {
    id: "live2",
    event_id: "3",
    title: "Drag Show Rehearsal",
    description: "Behind the scenes look at tonight's drag show preparation!",
    host_id: "user3",
    host: {
      id: "user3",
      email: "sam@example.com",
      name: "Sam Fabulous",
      username: "samfab",
      avatar_url: "/placeholder.svg?height=50&width=50&text=SF",
      bio: "Drag queen 💄",
      pronouns: "she/her",
      location: "San Francisco, CA",
      interests: ["drag", "performance"],
      verified: true,
      follower_count: 567,
      following_count: 89,
      post_count: 134,
      is_online: true,
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    is_live: false,
    viewer_count: 0,
    max_viewers: 89,
    chat_enabled: true,
    created_at: "2024-01-25T16:00:00Z",
  },
]

const mockLiveMessages: { [liveEventId: string]: LiveMessage[] } = {
  live1: [
    {
      id: "live_msg1",
      live_event_id: "live1",
      user_id: "user1",
      user: {
        id: "user1",
        name: "Alex Rainbow",
        avatar_url: "/placeholder.svg?height=40&width=40&text=AR",
        verified: true,
        is_online: true,
      } as UserProfile,
      content: "This is amazing! So excited for Pride Month! 🏳️‍🌈",
      message_type: "chat",
      sent_at: "2024-01-25T19:05:00Z",
    },
    {
      id: "live_msg2",
      live_event_id: "live1",
      user_id: "user3",
      user: {
        id: "user3",
        name: "Sam Fabulous",
        avatar_url: "/placeholder.svg?height=40&width=40&text=SF",
        verified: true,
        is_online: true,
      } as UserProfile,
      content: "The decorations look incredible! 💄✨",
      message_type: "chat",
      sent_at: "2024-01-25T19:07:00Z",
    },
    {
      id: "live_msg3",
      live_event_id: "live1",
      user_id: "user4",
      content: "❤️",
      message_type: "reaction",
      metadata: { reaction: "❤️" },
      sent_at: "2024-01-25T19:08:00Z",
    },
  ],
}

export const liveEventService = {
  // Live Events
  getLiveEvents: async (): Promise<LiveEvent[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockLiveEvents.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1
      if (!a.is_live && b.is_live) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  },

  getLiveEvent: async (liveEventId: string): Promise<LiveEvent | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockLiveEvents.find((event) => event.id === liveEventId) || null
  },

  createLiveEvent: async (eventId: string, hostId: string, title: string, description: string): Promise<LiveEvent> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newLiveEvent: LiveEvent = {
      id: Math.random().toString(36).substr(2, 9),
      event_id: eventId,
      title,
      description,
      host_id: hostId,
      is_live: false,
      viewer_count: 0,
      max_viewers: 0,
      chat_enabled: true,
      created_at: new Date().toISOString(),
    }

    mockLiveEvents.unshift(newLiveEvent)
    return newLiveEvent
  },

  startLiveStream: async (liveEventId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const liveEvent = mockLiveEvents.find((event) => event.id === liveEventId)
    if (liveEvent) {
      liveEvent.is_live = true
      liveEvent.started_at = new Date().toISOString()
      liveEvent.stream_url = `https://example.com/stream/${liveEventId}`
    }
  },

  endLiveStream: async (liveEventId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const liveEvent = mockLiveEvents.find((event) => event.id === liveEventId)
    if (liveEvent) {
      liveEvent.is_live = false
      liveEvent.ended_at = new Date().toISOString()
      liveEvent.max_viewers = Math.max(liveEvent.max_viewers, liveEvent.viewer_count)
      liveEvent.viewer_count = 0
    }
  },

  joinLiveStream: async (liveEventId: string, userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const liveEvent = mockLiveEvents.find((event) => event.id === liveEventId)
    if (liveEvent && liveEvent.is_live) {
      liveEvent.viewer_count += 1
      liveEvent.max_viewers = Math.max(liveEvent.max_viewers, liveEvent.viewer_count)

      // Add join message
      const joinMessage: LiveMessage = {
        id: Math.random().toString(36).substr(2, 9),
        live_event_id: liveEventId,
        user_id: userId,
        content: "joined the stream",
        message_type: "join",
        sent_at: new Date().toISOString(),
      }

      if (!mockLiveMessages[liveEventId]) {
        mockLiveMessages[liveEventId] = []
      }
      mockLiveMessages[liveEventId].push(joinMessage)
    }
  },

  leaveLiveStream: async (liveEventId: string, userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const liveEvent = mockLiveEvents.find((event) => event.id === liveEventId)
    if (liveEvent && liveEvent.viewer_count > 0) {
      liveEvent.viewer_count -= 1

      // Add leave message
      const leaveMessage: LiveMessage = {
        id: Math.random().toString(36).substr(2, 9),
        live_event_id: liveEventId,
        user_id: userId,
        content: "left the stream",
        message_type: "leave",
        sent_at: new Date().toISOString(),
      }

      if (!mockLiveMessages[liveEventId]) {
        mockLiveMessages[liveEventId] = []
      }
      mockLiveMessages[liveEventId].push(leaveMessage)
    }
  },

  // Live Chat
  getLiveMessages: async (liveEventId: string): Promise<LiveMessage[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockLiveMessages[liveEventId] || []
  },

  sendLiveMessage: async (
    liveEventId: string,
    userId: string,
    content: string,
    messageType: LiveMessage["message_type"] = "chat",
    metadata?: LiveMessage["metadata"],
  ): Promise<LiveMessage> => {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const newMessage: LiveMessage = {
      id: Math.random().toString(36).substr(2, 9),
      live_event_id: liveEventId,
      user_id: userId,
      content,
      message_type: messageType,
      metadata,
      sent_at: new Date().toISOString(),
    }

    if (!mockLiveMessages[liveEventId]) {
      mockLiveMessages[liveEventId] = []
    }
    mockLiveMessages[liveEventId].push(newMessage)

    return newMessage
  },

  // Reactions
  sendReaction: async (liveEventId: string, userId: string, reaction: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    await liveEventService.sendLiveMessage(liveEventId, userId, reaction, "reaction", { reaction })
  },
}
