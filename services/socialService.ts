import { supabase } from "../lib/supabase"
import type { Post, Comment, UserProfile } from "../types/social"

export interface CreatePostData {
  user_id: string
  user: UserProfile
  content: string
  images: string[]
  tags: string[]
  visibility: "public" | "followers" | "private"
  location?: {
    latitude: number
    longitude: number
    name?: string
  }
}

export interface CreateCommentData {
  post_id: string
  user_id: string
  user: UserProfile
  content: string
}

export interface SocialService {
  getPosts: (userId?: string) => Promise<Post[]>
  getFeedPosts: (userId?: string) => Promise<Post[]>
  createPost: (postData: CreatePostData) => Promise<Post>
  likePost: (postId: string, userId: string) => Promise<void>
  savePost: (postId: string, userId: string) => Promise<void>
  deletePost: (postId: string, userId: string) => Promise<void>
  sharePost: (postId: string, userId: string) => Promise<void>
  getComments: (postId: string) => Promise<Comment[]>
  getPostComments: (postId: string) => Promise<Comment[]>
  addComment: (commentData: CreateCommentData) => Promise<Comment>
}

export const socialService: SocialService = {
  // Get posts for feed
  getPosts: async (userId?: string): Promise<Post[]> => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            name,
            avatar_url,
            verified,
            email,
            follower_count,
            following_count,
            post_count,
            interests,
            created_at,
            updated_at
          )
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching posts:", error)
        return []
      }

      return (data || []).map((post) => ({
        ...post,
        user: post.users,
        is_liked: false, // Would be determined by checking likes table
        is_saved: false, // Would be determined by checking saved posts table
      }))
    } catch (error) {
      console.error("Error in getPosts:", error)
      return []
    }
  },

  // Get feed posts (alias for getPosts)
  getFeedPosts: async (userId?: string): Promise<Post[]> => {
    return socialService.getPosts(userId)
  },

  // Create a new post
  createPost: async (postData: CreatePostData): Promise<Post> => {
    try {
      // First ensure the user exists
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", postData.user_id)
        .single()

      if (userError || !existingUser) {
        // Create user if doesn't exist
        const { error: createUserError } = await supabase.from("users").insert({
          id: postData.user_id,
          email: postData.user.email,
          name: postData.user.name,
          avatar_url: postData.user.avatar_url,
          verified: postData.user.verified || false,
          follower_count: postData.user.follower_count || 0,
          following_count: postData.user.following_count || 0,
          post_count: postData.user.post_count || 0,
          interests: postData.user.interests || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (createUserError) {
          console.error("Error creating user:", createUserError)
          throw createUserError
        }
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: postData.user_id,
          content: postData.content,
          images: postData.images,
          tags: postData.tags,
          visibility: postData.visibility,
          location: postData.location,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
        })
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            name,
            avatar_url,
            verified,
            email,
            follower_count,
            following_count,
            post_count,
            interests,
            created_at,
            updated_at
          )
        `)
        .single()

      if (error) {
        console.error("Error creating post:", error)
        throw error
      }

      return {
        ...data,
        user: data.users,
        is_liked: false,
        is_saved: false,
      }
    } catch (error) {
      console.error("Error in createPost:", error)
      throw error
    }
  },

  // Like a post
  likePost: async (postId: string, userId: string): Promise<void> => {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single()

      if (existingLike) {
        // Unlike
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId)

        // Decrement likes count
        await supabase.rpc("decrement_post_likes", { post_id: postId })
      } else {
        // Like
        await supabase.from("post_likes").insert({ post_id: postId, user_id: userId })

        // Increment likes count
        await supabase.rpc("increment_post_likes", { post_id: postId })
      }
    } catch (error) {
      console.error("Error liking post:", error)
      throw error
    }
  },

  // Save a post
  savePost: async (postId: string, userId: string): Promise<void> => {
    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single()

      if (existingSave) {
        // Unsave
        await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId)
      } else {
        // Save
        await supabase.from("saved_posts").insert({ post_id: postId, user_id: userId })
      }
    } catch (error) {
      console.error("Error saving post:", error)
      throw error
    }
  },

  // Delete a post
  deletePost: async (postId: string, userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId)

      if (error) {
        console.error("Error deleting post:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in deletePost:", error)
      throw error
    }
  },

  // Share a post
  sharePost: async (postId: string, userId: string): Promise<void> => {
    try {
      await supabase.from("post_shares").insert({ post_id: postId, user_id: userId })

      // Increment shares count
      await supabase.rpc("increment_post_shares", { post_id: postId })
    } catch (error) {
      console.error("Error sharing post:", error)
      throw error
    }
  },

  // Get comments for a post
  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            name,
            avatar_url,
            verified
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching comments:", error)
        return []
      }

      return (data || []).map((comment) => ({
        ...comment,
        user: comment.users,
        is_liked: false, // Would be determined by checking comment likes table
      }))
    } catch (error) {
      console.error("Error in getComments:", error)
      return []
    }
  },

  // Get post comments (alias for getComments)
  getPostComments: async (postId: string): Promise<Comment[]> => {
    return socialService.getComments(postId)
  },

  // Add a comment
  addComment: async (commentData: CreateCommentData): Promise<Comment> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: commentData.post_id,
          user_id: commentData.user_id,
          content: commentData.content,
          likes_count: 0,
        })
        .select(`
          *,
          users!comments_user_id_fkey (
            id,
            name,
            avatar_url,
            verified
          )
        `)
        .single()

      if (error) {
        console.error("Error adding comment:", error)
        throw error
      }

      // Increment comments count on post
      await supabase.rpc("increment_post_comments", { post_id: commentData.post_id })

      return {
        ...data,
        user: data.users,
        is_liked: false,
      }
    } catch (error) {
      console.error("Error in addComment:", error)
      throw error
    }
  },
}
