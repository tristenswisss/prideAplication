import { supabase } from "../lib/supabase"
import type { Post, Comment } from "../types/social"

export interface CreatePostData {
  user_id: string
  user: any
  content: string
  images?: string[]
  location?: {
    latitude: number
    longitude: number
    name?: string
  }
  business_id?: string
  event_id?: string
  tags: string[]
  visibility: "public" | "followers" | "private"
}

export interface CreateCommentData {
  post_id: string
  user_id: string
  user: any
  content: string
  parent_id?: string
}

class SocialService {
  async getFeedPosts(userId?: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            name,
            avatar_url,
            verified
          )
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching feed posts:", error)
        throw error
      }

      return (data || []).map((post) => ({
        ...post,
        user: post.users,
        is_liked: false, // This would come from a likes table join
        is_saved: false, // This would come from a saved posts table join
      }))
    } catch (error: any) {
      console.error("Error in getFeedPosts:", error)
      throw error
    }
  }

  async createPost(postData: CreatePostData): Promise<Post> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            user_id: postData.user_id,
            content: postData.content,
            images: postData.images || [],
            location: postData.location,
            business_id: postData.business_id,
            event_id: postData.event_id,
            tags: postData.tags,
            visibility: postData.visibility,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating post:", error)
        throw error
      }

      return {
        ...data,
        user: postData.user,
        is_liked: false,
        is_saved: false,
      }
    } catch (error: any) {
      console.error("Error in createPost:", error)
      throw error
    }
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId)

      if (error) {
        console.error("Error deleting post:", error)
        throw error
      }
    } catch (error: any) {
      console.error("Error in deletePost:", error)
      throw error
    }
  }

  async likePost(postId: string, userId: string): Promise<void> {
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
      } else {
        // Like
        await supabase.from("post_likes").insert([{ post_id: postId, user_id: userId }])
      }
    } catch (error: any) {
      console.error("Error in likePost:", error)
      throw error
    }
  }

  async savePost(postId: string, userId: string): Promise<void> {
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
        await supabase.from("saved_posts").insert([{ post_id: postId, user_id: userId }])
      }
    } catch (error: any) {
      console.error("Error in savePost:", error)
      throw error
    }
  }

  async sharePost(postId: string, userId: string): Promise<void> {
    try {
      // Increment share count
      const { error } = await supabase.rpc("increment_post_shares", {
        post_id: postId,
      })

      if (error) {
        console.error("Error sharing post:", error)
        throw error
      }

      // Log the share action
      await supabase.from("post_shares").insert([{ post_id: postId, user_id: userId }])
    } catch (error: any) {
      console.error("Error in sharePost:", error)
      throw error
    }
  }

  async getPostComments(postId: string): Promise<Comment[]> {
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
        throw error
      }

      return (data || []).map((comment) => ({
        ...comment,
        user: comment.users,
        is_liked: false, // This would come from a comment likes table join
      }))
    } catch (error: any) {
      console.error("Error in getPostComments:", error)
      throw error
    }
  }

  async addComment(commentData: CreateCommentData): Promise<Comment> {
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert([
          {
            post_id: commentData.post_id,
            user_id: commentData.user_id,
            content: commentData.content,
            parent_id: commentData.parent_id,
            likes_count: 0,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error adding comment:", error)
        throw error
      }

      return {
        ...data,
        user: commentData.user,
        is_liked: false,
      }
    } catch (error: any) {
      console.error("Error in addComment:", error)
      throw error
    }
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            name,
            avatar_url,
            verified
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching user posts:", error)
        throw error
      }

      return (data || []).map((post) => ({
        ...post,
        user: post.users,
        is_liked: false,
        is_saved: false,
      }))
    } catch (error: any) {
      console.error("Error in getUserPosts:", error)
      throw error
    }
  }
}

export const socialService = new SocialService()
