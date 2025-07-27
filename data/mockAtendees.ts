import type { EventAttendee, Notification } from "../types"

export const mockAttendees: EventAttendee[] = [
  {
    id: "1",
    event_id: "1",
    user_id: "user1",
    user: {
      id: "user1",
      name: "Alex Rainbow",
      email: "alex@example.com",
      avatar_url: "/placeholder.svg?height=40&width=40&text=AR",
      verified: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    status: "going",
    created_at: "2024-05-20T10:30:00Z",
    updated_at: "2024-05-20T10:30:00Z",
  },
  {
    id: "2",
    event_id: "1",
    user_id: "user2",
    user: {
      id: "user2",
      name: "Jordan Pride",
      email: "jordan@example.com",
      avatar_url: "/placeholder.svg?height=40&width=40&text=JP",
      verified: false,
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-05T00:00:00Z",
    },
    status: "interested",
    created_at: "2024-05-22T14:15:00Z",
    updated_at: "2024-05-22T14:15:00Z",
  },
]

export const mockNotifications: Notification[] = [
  {
    id: "1",
    user_id: "user1",
    title: "Event Reminder 📅",
    message: "Pride Month Kickoff Party starts in 2 hours!",
    type: "event_reminder",
    data: { event_id: "1" },
    read: false,
    created_at: "2024-06-01T16:00:00Z",
  },
  {
    id: "2",
    user_id: "user1",
    title: "New Event Near You 🎉",
    message: "LGBTQ+ Business Networking Mixer has been added to your area",
    type: "new_event",
    data: { event_id: "2" },
    read: false,
    created_at: "2024-05-25T09:30:00Z",
  },
  {
    id: "3",
    user_id: "user1",
    title: "Review Response 💬",
    message: "Rainbow Café responded to your review",
    type: "review_response",
    data: { business_id: "1", review_id: "1" },
    read: true,
    created_at: "2024-05-20T11:45:00Z",
  },
]
