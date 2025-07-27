import type { Post, Comment, UserProfile } from "../types/social"

// Mock data for social features
const mockPosts: Post[] = [
  {
    id: "1",
    user_id: "user1",
    user: {
      id: "user1",
      email: "alex@example.com",
      name: "Alex Rainbow",
      username: "alexrainbow",
      avatar_url: "/placeholder.svg?height=50&width=50&text=AR",
      bio: "Living my truth 🏳️‍🌈 | Coffee lover ☕ | Safe space advocate",
      pronouns: "they/them",
      location: "San Francisco, CA",
      interests: ["coffee", "pride", "community", "art"],
      verified: true,
      follower_count: 234,
      following_count: 156,
      post_count: 42,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    content:
      "Just had the most amazing experience at Rainbow Café! ☕🏳️‍🌈 The barista used my correct pronouns without me having to ask, and they have the cutest Pride flag cookies. This is what inclusive business looks like! #SafeSpaces #PrideCommunity",
    images: ["/placeholder.svg?height=300&width=400&text=Rainbow+Café+Interior"],
    location: {
      name: "Rainbow Café",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    business_id: "1",
    likes_count: 47,
    comments_count: 12,
    shares_count: 8,
    tags: ["SafeSpaces", "PrideCommunity", "Coffee"],
    is_liked: false,
    is_saved: false,
    visibility: "public",
    created_at: "2024-01-25T14:30:00Z",
    updated_at: "2024-01-25T14:30:00Z",
  },
  {
    id: "2",
    user_id: "user2",
    user: {
      id: "user2",
      email: "jordan@example.com",
      name: "Jordan Pride",
      username: "jordanpride",
      avatar_url: "/placeholder.svg?height=50&width=50&text=JP",
      bio: "Trans rights are human rights 🏳️‍⚧️ | Activist | Photographer",
      pronouns: "he/him",
      location: "Oakland, CA",
      interests: ["activism", "photography", "trans rights", "community"],
      verified: false,
      follower_count: 189,
      following_count: 203,
      post_count: 67,
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-05T00:00:00Z",
    },
    content:
      "Reminder: Pride Month Kickoff Party is THIS WEEKEND! 🎉 Can't wait to see everyone there. It's going to be such a beautiful celebration of our community. Who else is going? Let me know in the comments! #Pride2024 #Community",
    images: ["/placeholder.svg?height=300&width=400&text=Pride+Event+Flyer"],
    event_id: "1",
    likes_count: 89,
    comments_count: 23,
    shares_count: 15,
    tags: ["Pride2024", "Community"],
    is_liked: true,
    is_saved: true,
    visibility: "public",
    created_at: "2024-01-24T18:45:00Z",
    updated_at: "2024-01-24T18:45:00Z",
  },
  {
    id: "3",
    user_id: "user3",
    user: {
      id: "user3",
      email: "sam@example.com",
      name: "Sam Fabulous",
      username: "samfab",
      avatar_url: "/placeholder.svg?height=50&width=50&text=SF",
      bio: "Drag queen 💄 | Performer | Spreading love and glitter ✨",
      pronouns: "she/her",
      location: "San Francisco, CA",
      interests: ["drag", "performance", "makeup", "nightlife"],
      verified: true,
      follower_count: 567,
      following_count: 89,
      post_count: 134,
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    content:
      "Behind the scenes getting ready for tonight's show at The Fabulous Lounge! 💄✨ This look is inspired by the colors of our beautiful Pride flag. Come through and show some love! Doors open at 8pm 🏳️‍🌈 #DragQueen #PrideNight #FabulousLounge",
    images: [
      "/placeholder.svg?height=300&width=400&text=Drag+Makeup+Look",
      "/placeholder.svg?height=300&width=400&text=Pride+Outfit",
    ],
    location: {
      name: "The Fabulous Lounge",
      latitude: 37.7849,
      longitude: -122.4094,
    },
    business_id: "2",
    likes_count: 156,
    comments_count: 34,
    shares_count: 22,
    tags: ["DragQueen", "PrideNight", "FabulousLounge"],
    is_liked: false,
    is_saved: false,
    visibility: "public",
    created_at: "2024-01-23T16:20:00Z",
    updated_at: "2024-01-23T16:20:00Z",
  },
]

const mockComments: Comment[] = [
  {
    id: "1",
    post_id: "1",
    user_id: "user2",
    user: {
      id: "user2",
      email: "jordan@example.com",
      name: "Jordan Pride",
      username: "jordanpride",
      avatar_url: "/placeholder.svg?height=40&width=40&text=JP",
      bio: "Trans rights are human rights 🏳️‍⚧️",
      pronouns: "he/him",
      location: "Oakland, CA",
      interests: ["activism"],
      verified: false,
      follower_count: 189,
      following_count: 203,
      post_count: 67,
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-05T00:00:00Z",
    },
    content: "Yes! This is exactly why I love Rainbow Café. They really get it. 💙",
    likes_count: 8,
    is_liked: false,
    created_at: "2024-01-25T15:10:00Z",
    updated_at: "2024-01-25T15:10:00Z",
  },
  {
    id: "2",
    post_id: "1",
    user_id: "user3",
    user: {
      id: "user3",
      email: "sam@example.com",
      name: "Sam Fabulous",
      username: "samfab",
      avatar_url: "/placeholder.svg?height=40&width=40&text=SF",
      bio: "Drag queen 💄",
      pronouns: "she/her",
      location: "San Francisco, CA",
      interests: ["drag"],
      verified: true,
      follower_count: 567,
      following_count: 89,
      post_count: 134,
      created_at: "2024-01-10T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    content: "Those Pride cookies are to die for! 🍪🏳️‍🌈",
    likes_count: 12,
    is_liked: true,
    created_at: "2024-01-25T15:45:00Z",
    updated_at: "2024-01-25T15:45:00Z",
  },
]

export const socialService = {
  // Posts
  getFeedPosts: async (userId?: string): Promise<Post[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return mockPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockPosts.filter((post) => post.user_id === userId)
  },

  createPost: async (
    postData: Omit<
      Post,
      "id" | "created_at" | "updated_at" | "likes_count" | "comments_count" | "shares_count" | "is_liked" | "is_saved"
    >,
  ): Promise<Post> => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const newPost: Post = {
      ...postData,
      id: Math.random().toString(36).substr(2, 9),
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      is_liked: false,
      is_saved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockPosts.unshift(newPost)
    return newPost
  },

  likePost: async (postId: string, userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const post = mockPosts.find((p) => p.id === postId)
    if (post) {
      post.is_liked = !post.is_liked
      post.likes_count += post.is_liked ? 1 : -1
    }
  },

  savePost: async (postId: string, userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const post = mockPosts.find((p) => p.id === postId)
    if (post) {
      post.is_saved = !post.is_saved
    }
  },

  sharePost: async (postId: string, userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const post = mockPosts.find((p) => p.id === postId)
    if (post) {
      post.shares_count += 1
    }
  },

  // Comments
  getPostComments: async (postId: string): Promise<Comment[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockComments.filter((comment) => comment.post_id === postId)
  },

  addComment: async (
    commentData: Omit<Comment, "id" | "created_at" | "updated_at" | "likes_count" | "is_liked">,
  ): Promise<Comment> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newComment: Comment = {
      ...commentData,
      id: Math.random().toString(36).substr(2, 9),
      likes_count: 0,
      is_liked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockComments.push(newComment)

    // Update post comment count
    const post = mockPosts.find((p) => p.id === commentData.post_id)
    if (post) {
      post.comments_count += 1
    }

    return newComment
  },

  // User profiles
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const post = mockPosts.find((p) => p.user_id === userId)
    return post?.user || null
  },

  updateUserProfile: async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    // In a real app, this would update the user profile
    const mockProfile: UserProfile = {
      id: userId,
      email: "user@example.com",
      name: "Updated User",
      ...updates,
      verified: false,
      follower_count: 0,
      following_count: 0,
      post_count: 0,
      interests: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return mockProfile
  },

  // Follow system
  followUser: async (followerId: string, followingId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    // In a real app, this would create a follow relationship
  },

  unfollowUser: async (followerId: string, followingId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    // In a real app, this would remove the follow relationship
  },

  getFollowers: async (userId: string): Promise<UserProfile[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return [] // Mock empty for now
  },

  getFollowing: async (userId: string): Promise<UserProfile[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return [] // Mock empty for now
  },
}
