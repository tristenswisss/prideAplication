import type { Message, Conversation, UserProfile } from "../types/messaging"

// Mock data for messaging
const mockUsers: UserProfile[] = [
  {
    id: "user1",
    email: "alex@example.com",
    name: "Alex Rainbow",
    username: "alexrainbow",
    avatar_url: "/placeholder.svg?height=50&width=50&text=AR",
    bio: "Living my truth 🏳️‍🌈",
    pronouns: "they/them",
    location: "San Francisco, CA",
    interests: ["coffee", "pride", "community"],
    verified: true,
    follower_count: 234,
    following_count: 156,
    post_count: 42,
    is_online: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
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
    is_online: false,
    last_seen: "2024-01-25T10:30:00Z",
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-05T00:00:00Z",
  },
  {
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
]

const mockConversations: Conversation[] = [
  {
    id: "conv1",
    participants: ["current_user", "user1"],
    participant_profiles: [mockUsers[0]],
    last_message: {
      id: "msg1",
      conversation_id: "conv1",
      sender_id: "user1",
      sender: mockUsers[0],
      content: "Hey! Thanks for the coffee recommendation. Rainbow Café was amazing! ☕🏳️‍🌈",
      message_type: "text",
      read: false,
      sent_at: "2024-01-25T16:45:00Z",
    },
    unread_count: 1,
    is_group: false,
    created_at: "2024-01-25T14:00:00Z",
    updated_at: "2024-01-25T16:45:00Z",
  },
  {
    id: "conv2",
    participants: ["current_user", "user2"],
    participant_profiles: [mockUsers[1]],
    last_message: {
      id: "msg2",
      conversation_id: "conv2",
      sender_id: "current_user",
      content: "See you at the Pride planning meeting tonight! 🌈",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T15:20:00Z",
    },
    unread_count: 0,
    is_group: false,
    created_at: "2024-01-24T18:00:00Z",
    updated_at: "2024-01-25T15:20:00Z",
  },
  {
    id: "conv3",
    participants: ["current_user", "user1", "user2", "user3"],
    participant_profiles: [mockUsers[0], mockUsers[1], mockUsers[2]],
    last_message: {
      id: "msg3",
      conversation_id: "conv3",
      sender_id: "user3",
      sender: mockUsers[2],
      content: "Can't wait for the drag show this weekend! 💄✨",
      message_type: "text",
      read: false,
      sent_at: "2024-01-25T17:10:00Z",
    },
    unread_count: 2,
    is_group: true,
    group_name: "Pride Squad 🏳️‍🌈",
    group_avatar: "/placeholder.svg?height=50&width=50&text=PS",
    created_at: "2024-01-20T12:00:00Z",
    updated_at: "2024-01-25T17:10:00Z",
  },
]

const mockMessages: { [conversationId: string]: Message[] } = {
  conv1: [
    {
      id: "msg1-1",
      conversation_id: "conv1",
      sender_id: "current_user",
      content: "Hi Alex! I saw your post about Rainbow Café. Is it really as LGBTQ+ friendly as it looks?",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T14:30:00Z",
      delivered_at: "2024-01-25T14:30:05Z",
      read_at: "2024-01-25T14:32:00Z",
    },
    {
      id: "msg1-2",
      conversation_id: "conv1",
      sender_id: "user1",
      sender: mockUsers[0],
      content:
        "Oh absolutely! The staff is incredible and they have Pride flags everywhere. Plus the owner is part of our community! 🏳️‍🌈",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T14:35:00Z",
      delivered_at: "2024-01-25T14:35:02Z",
      read_at: "2024-01-25T14:36:00Z",
    },
    {
      id: "msg1-3",
      conversation_id: "conv1",
      sender_id: "current_user",
      content: "That sounds perfect! I'll definitely check it out this weekend. Thanks for the rec! ☕",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T14:40:00Z",
      delivered_at: "2024-01-25T14:40:03Z",
      read_at: "2024-01-25T14:42:00Z",
    },
    {
      id: "msg1-4",
      conversation_id: "conv1",
      sender_id: "user1",
      sender: mockUsers[0],
      content: "Hey! Thanks for the coffee recommendation. Rainbow Café was amazing! ☕🏳️‍🌈",
      message_type: "text",
      read: false,
      sent_at: "2024-01-25T16:45:00Z",
      delivered_at: "2024-01-25T16:45:01Z",
    },
  ],
  conv2: [
    {
      id: "msg2-1",
      conversation_id: "conv2",
      sender_id: "user2",
      sender: mockUsers[1],
      content: "Hey! Are you coming to the Pride planning meeting tonight?",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T15:00:00Z",
      delivered_at: "2024-01-25T15:00:02Z",
      read_at: "2024-01-25T15:05:00Z",
    },
    {
      id: "msg2-2",
      conversation_id: "conv2",
      sender_id: "current_user",
      content: "Yes! Wouldn't miss it. What time does it start again?",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T15:10:00Z",
      delivered_at: "2024-01-25T15:10:01Z",
      read_at: "2024-01-25T15:12:00Z",
    },
    {
      id: "msg2-3",
      conversation_id: "conv2",
      sender_id: "user2",
      sender: mockUsers[1],
      content: "7 PM at Rainbow Café! Perfect timing after your visit there 😊",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T15:15:00Z",
      delivered_at: "2024-01-25T15:15:02Z",
      read_at: "2024-01-25T15:18:00Z",
    },
    {
      id: "msg2-4",
      conversation_id: "conv2",
      sender_id: "current_user",
      content: "See you at the Pride planning meeting tonight! 🌈",
      message_type: "text",
      read: true,
      sent_at: "2024-01-25T15:20:00Z",
      delivered_at: "2024-01-25T15:20:01Z",
      read_at: "2024-01-25T15:22:00Z",
    },
  ],
}

export const messagingService = {
  // Conversations
  getConversations: async (userId: string): Promise<Conversation[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockConversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  },

  createConversation: async (participantIds: string[], isGroup = false, groupName?: string): Promise<Conversation> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newConversation: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      participants: ["current_user", ...participantIds],
      participant_profiles: mockUsers.filter((user) => participantIds.includes(user.id)),
      unread_count: 0,
      is_group: isGroup,
      group_name: groupName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockConversations.unshift(newConversation)
    return newConversation
  },

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockMessages[conversationId] || []
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    messageType: Message["message_type"] = "text",
    metadata?: Message["metadata"],
  ): Promise<Message> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      metadata,
      read: false,
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    }

    if (!mockMessages[conversationId]) {
      mockMessages[conversationId] = []
    }
    mockMessages[conversationId].push(newMessage)

    // Update conversation
    const conversation = mockConversations.find((c) => c.id === conversationId)
    if (conversation) {
      conversation.last_message = newMessage
      conversation.updated_at = new Date().toISOString()
      if (senderId !== "current_user") {
        conversation.unread_count += 1
      }
    }

    return newMessage
  },

  markAsRead: async (conversationId: string, messageIds: string[]): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const messages = mockMessages[conversationId]
    if (messages) {
      messages.forEach((message) => {
        if (messageIds.includes(message.id)) {
          message.read = true
          message.read_at = new Date().toISOString()
        }
      })
    }

    // Update conversation unread count
    const conversation = mockConversations.find((c) => c.id === conversationId)
    if (conversation) {
      conversation.unread_count = Math.max(0, conversation.unread_count - messageIds.length)
    }
  },

  // User search for new conversations
  searchUsers: async (query: string): Promise<UserProfile[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username?.toLowerCase().includes(query.toLowerCase()),
    )
  },

  // Online status
  updateOnlineStatus: async (userId: string, isOnline: boolean): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      user.is_online = isOnline
      if (!isOnline) {
        user.last_seen = new Date().toISOString()
      }
    }
  },

  getUserOnlineStatus: async (userId: string): Promise<{ isOnline: boolean; lastSeen?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const user = mockUsers.find((u) => u.id === userId)
    return {
      isOnline: user?.is_online || false,
      lastSeen: user?.last_seen,
    }
  },
}
