import { supabase } from "../lib/supabase"
import type { Post, Comment, UserProfile } from "../types/social"
import { adminService } from "./adminService"

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
  checkPostOwnership: (postId: string, userId: string) => Promise<boolean>
  likePost: (postId: string, userId: string) => Promise<void>
  savePost: (postId: string, userId: string) => Promise<void>
  hidePost: (postId: string, userId: string) => Promise<void>
  deletePost: (postId: string, userId: string) => Promise<void>
  sharePost: (postId: string, userId: string) => Promise<void>
  getComments: (postId: string) => Promise<Comment[]>
  getPostComments: (postId: string) => Promise<Comment[]>
  addComment: (commentData: CreateCommentData) => Promise<Comment>
}

export const socialService: SocialService = {
  // Get posts for feed
  getPosts: async (currentUserId?: string): Promise<Post[]> => {
    try {
      // Fetch blocked users and hidden posts for current user (to filter client-side)
      let blockedUserIds: string[] = []
      let hiddenPostIds: string[] = []
      let likedPostIds: string[] = []
      let savedPostIds: string[] = []

      if (currentUserId) {
        const [
          { data: blockedData, error: blockedError },
          { data: hiddenData, error: hiddenError },
          { data: likedData, error: likedError },
          { data: savedData, error: savedError }
        ] = await Promise.all([
          supabase.from("blocked_users").select("blocked_user_id").eq("user_id", currentUserId),
          supabase.from("hidden_posts").select("post_id").eq("user_id", currentUserId),
          supabase.from("post_likes").select("post_id").eq("user_id", currentUserId),
          supabase.from("saved_posts").select("post_id").eq("user_id", currentUserId),
        ])

        if (!blockedError && Array.isArray(blockedData)) {
          blockedUserIds = blockedData.map((b: any) => b.blocked_user_id)
        }
        if (!hiddenError && Array.isArray(hiddenData)) {
          hiddenPostIds = hiddenData.map((h: any) => h.post_id)
        }
        if (!likedError && Array.isArray(likedData)) {
          likedPostIds = likedData.map((l: any) => l.post_id)
        }
        if (!savedError && Array.isArray(savedData)) {
          savedPostIds = savedData.map((s: any) => s.post_id)
        }
      }

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
            updated_at,
            profiles ( username, allow_direct_messages, show_profile, appear_in_search )
          )
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching posts:", error)
        return []
      }

      const mapped = (data || []).map((post: any) => ({
        ...post,
        user: {
          ...post.users,
          username: post.users?.profiles?.username,
          allow_direct_messages: post.users?.profiles?.allow_direct_messages,
          show_profile: post.users?.profiles?.show_profile,
          appear_in_search: post.users?.profiles?.appear_in_search,
        },
        is_liked: currentUserId ? likedPostIds.includes(post.id) : false,
        is_saved: currentUserId ? savedPostIds.includes(post.id) : false,
      }))

      // Apply client-side filtering for hidden posts and blocked users
      const filtered = mapped.filter((p: Post) => {
        const isHidden = currentUserId ? hiddenPostIds.includes(p.id) : false
        const isByBlockedUser = currentUserId ? blockedUserIds.includes(p.user_id) : false
        return !isHidden && !isByBlockedUser
      })

      return filtered
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
            updated_at,
            profiles ( username, allow_direct_messages, show_profile, appear_in_search )
          )
        `)
        .single()

      if (error) {
        console.error("Error creating post:", error)
        throw error
      }

      return {
        ...data,
        user: {
          ...data.users,
          username: (data as any).users?.profiles?.username,
          allow_direct_messages: (data as any).users?.profiles?.allow_direct_messages,
          show_profile: (data as any).users?.profiles?.show_profile,
          appear_in_search: (data as any).users?.profiles?.appear_in_search,
        },
        is_liked: false,
        is_saved: false,
      }
    } catch (error) {
      console.error("Error in createPost:", error)
      throw error
    }
  },

  // Helper function to check if user owns the post
  checkPostOwnership: async (postId: string, userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single()

      if (error) {
        console.error("Error checking post ownership:", error)
        return false
      }

      return data.user_id === userId
    } catch (error) {
      console.error("Error in checkPostOwnership:", error)
      return false
    }
  },

  // Like a post - simplified version that works with database triggers
  likePost: async (postId: string, userId: string): Promise<void> => {
    try {
      console.log(`likePost called: postId=${postId}, userId=${userId}`)

      // Prevent users from liking their own posts
      const isOwner = await socialService.checkPostOwnership(postId, userId)
      if (isOwner) {
        console.log(`User ${userId} attempted to like their own post ${postId}`)
        throw new Error("You cannot like your own post")
      }

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingLike) {
        console.log(`Unliking post ${postId}`)
        // Unlike - delete the like record (trigger will update count automatically)
        const { error: deleteError } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)

        if (deleteError) {
          console.error(`Error unliking post: ${deleteError.message}`)
          throw deleteError
        }
        console.log(`Successfully unliked post ${postId}`)
      } else {
        console.log(`Liking post ${postId}`)
        // Like - insert new like record (trigger will update count automatically)
        const { error: insertError } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: userId })

        if (insertError) {
          // If it's a unique constraint violation, the user already liked this post
          // This can happen due to race conditions or if the check above missed it
          if (insertError.code === '23505') {
            console.log(`Duplicate like detected - post was already liked, doing nothing`)
            // Post is already liked, so we're done
            return
          } else {
            console.error(`Error liking post: ${insertError.message}`)
            throw insertError
          }
        }
        console.log(`Successfully liked post ${postId}`)
      }
    } catch (error) {
      console.error("Error in likePost:", error)
      throw error
    }
  },

  // Save a post
  savePost: async (postId: string, userId: string): Promise<void> => {
    try {
      // Check if already saved - handle the case where single() might throw
      const { data: existingSave, error: checkError } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors

      // If there's an error other than "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingSave) {
        // Unsave - delete the save record
        const { error: deleteError } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)

        if (deleteError) throw deleteError
      } else {
        // Save - insert new save record (handle potential race condition)
        const { error: insertError } = await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: userId })

        if (insertError) {
          // If it's a duplicate key error, that means it was already saved
          // This can happen due to race conditions
          if (insertError.code === '23505') {
            // Already saved, so unsave instead
            const { error: deleteError } = await supabase
              .from("saved_posts")
              .delete()
              .eq("post_id", postId)
              .eq("user_id", userId)

            if (deleteError) throw deleteError
          } else {
            throw insertError
          }
        }
      }
    } catch (error) {
      console.error("Error saving post:", error)
      throw error
    }
  },

  // Hide a post (remove from user's feed only)
  hidePost: async (postId: string, userId: string): Promise<void> => {
    try {
      await supabase.from("hidden_posts").insert({ post_id: postId, user_id: userId })
    } catch (error) {
      console.error("Error hiding post:", error)
      throw error
    }
  },

  // Delete a post
  deletePost: async (postId: string, userId: string): Promise<void> => {
    try {
      // If current user is admin, allow deleting any post without user_id match
      const isAdmin = await adminService.isCurrentUserAdmin()
      const query = supabase.from("posts").delete().eq("id", postId)
      const { error } = isAdmin ? await query : await query.eq("user_id", userId)

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
      // Check if already shared by this user
      const { data: existingShare, error: checkError } = await supabase
        .from("post_shares")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle()

      // If there's an error other than "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      // Only share if not already shared
      if (!existingShare) {
        const { error: insertError } = await supabase
          .from("post_shares")
          .insert({ post_id: postId, user_id: userId })

        if (insertError) {
          // If it's a duplicate key error, that means it was already shared
          if (insertError.code !== '23505') {
            throw insertError
          }
        }

        // Get current shares count and increment
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .select("shares_count")
          .eq("id", postId)
          .single()

        if (postError) throw postError

        if (postData) {
          const { error: updateError } = await supabase
            .from("posts")
            .update({ shares_count: (postData.shares_count || 0) + 1 })
            .eq("id", postId)

          if (updateError) throw updateError
        }
      }
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
            verified,
            profiles ( username )
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching comments:", error)
        return []
      }

      return (data || []).map((comment: any) => ({
        ...comment,
        user: {
          ...comment.users,
          username: comment.users?.profiles?.username,
        },
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
            verified,
            profiles ( username )
          )
        `)
        .single()

      if (error) {
        console.error("Error adding comment:", error)
        throw error
      }

      // Get current comments count and increment
      const { data: postData } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", commentData.post_id)
        .single()

      if (postData) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({ comments_count: (postData.comments_count || 0) + 1 })
          .eq("id", commentData.post_id)

        if (updateError) throw updateError
      }

      return {
        ...data,
        user: {
          ...(data as any).users,
          username: (data as any).users?.profiles?.username,
        },
        is_liked: false,
      }
    } catch (error) {
      console.error("Error in addComment:", error)
      throw error
    }
  },
}
