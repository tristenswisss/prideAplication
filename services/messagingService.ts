import type { Message, Conversation, UserProfile } from "../types/messaging"
import { supabase } from "../lib/supabase"

// Helper function to remove phone numbers from text
const removePhoneNumbers = (text: string): string => {
  // This regex pattern matches common phone number formats
  // It may need to be adjusted based on specific requirements
 const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  return text.replace(phoneRegex, "[PHONE NUMBER REDACTED]")
}

export const messagingService = {
  // Conversations
  getConversations: async (userId: string): Promise<Conversation[]> => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .contains("participants", [userId])
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      return []
    }

    // Deduplicate by id in case of duplicate rows from sync or view materialization
    const seenIds = new Set<string>()
    const conversations = ((data as any[]) || []).filter((row) => {
      const id = row?.id
      if (!id || seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })
    if (conversations.length === 0) return []

    // Collect all unique participant user IDs across conversations
    const participantIdSet = new Set<string>()
    for (const conv of conversations) {
      const ids: string[] = Array.isArray(conv.participants) ? conv.participants : []
      ids.forEach((id) => participantIdSet.add(id))
    }

    const allParticipantIds = Array.from(participantIdSet)

    // Fetch user profiles for participants
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select(`id, email, name, avatar_url, verified, created_at, updated_at, profiles(username)`) // minimal fields
      .in("id", allParticipantIds)

    if (usersError) {
      console.error("Error fetching conversation participant profiles:", usersError)
      return conversations as any
    }

    const idToUser: Record<string, any> = {}
    for (const u of userRows || []) {
      idToUser[u.id] = u
    }

    // Fetch presence/last seen from user_status if available
    const { data: statusRows } = await supabase
      .from("user_status")
      .select("user_id, is_online, last_seen")
      .in("user_id", allParticipantIds)

    const idToStatus: Record<string, { is_online: boolean; last_seen: string | null }> = {}
    for (const s of statusRows || []) {
      idToStatus[(s as any).user_id] = { is_online: !!(s as any).is_online, last_seen: (s as any).last_seen || null }
    }

    // Build participant_profiles with a simple online heuristic: updated within last 2 minutes
    const now = Date.now()
    const withProfiles = conversations.map((conv) => {
      const ids: string[] = Array.isArray(conv.participants) ? conv.participants : []
      const profiles = ids
        .map((id) => idToUser[id])
        .filter(Boolean)
        .map((u: any) => {
          const status = idToStatus[u.id]
          const isOnline = status ? status.is_online : false
          const lastSeenIso = status?.last_seen || u.updated_at || null
          const updatedAt = lastSeenIso ? new Date(lastSeenIso).toISOString() : new Date().toISOString()
          return {
            id: u.id,
            email: u.email,
            name: u.name,
            username: Array.isArray(u.profiles) ? u.profiles[0]?.username : u.profiles?.username,
            avatar_url: u.avatar_url,
            verified: !!u.verified,
            is_online: isOnline,
            last_seen: lastSeenIso || undefined,
            created_at: u.created_at,
            updated_at: updatedAt,
          } as any
        })

      // Prefer to place the other participant first for 1:1 threads
      const ordered = profiles.sort((a: any) => (a.id === userId ? 1 : -1))
      return { ...(conv as any), participant_profiles: ordered }
    })

    // Sort again by updated_at descending to ensure order after dedupe
    const sorted = withProfiles.sort(
      (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    return sorted as any
  },

  getUnreadCount: async (conversationId: string, userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("read", false)
      .neq("sender_id", userId)
    if (error) {
      console.error("Error counting unread messages:", error)
      return 0
    }
    return count || 0
  },

  getConversationUnreadCounts: async (conversationIds: string[], userId: string): Promise<Record<string, number>> => {
    if (conversationIds.length === 0) return {}

    try {
      // Single batch query instead of individual calls
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .eq("read", false)
        .neq("sender_id", userId)

      if (error) {
        console.error("Error fetching unread counts:", error)
        // Fallback to individual queries if batch fails
        const result: Record<string, number> = {}
        for (const id of conversationIds) {
          result[id] = await messagingService.getUnreadCount(id, userId)
        }
        return result
      }

      // Count messages per conversation
      const counts: Record<string, number> = {}
      conversationIds.forEach((id) => (counts[id] = 0)) // Initialize all to 0

      if (data) {
        data.forEach((msg: any) => {
          counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1
        })
      }

      return counts
    } catch (err) {
      console.error("Error in batch unread count query:", err)
      // Fallback to individual queries
      const result: Record<string, number> = {}
      for (const id of conversationIds) {
        result[id] = await messagingService.getUnreadCount(id, userId)
      }
      return result
    }
  },

  // Check whether a user can DM another user:
  // - Not blocked by or blocking the other
  // - Target allows DMs (profiles.allow_direct_messages)
  // - If target doesn't allow DMs, they must be buddies (buddy_matches exists)
  canDirectMessage: async (fromUserId: string, toUserId: string): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      if (fromUserId === toUserId) return { allowed: false, reason: "cannot_dm_self" }

      // Check mutual blocks
      const [{ data: blocks1 }, { data: blocks2 }] = await Promise.all([
        supabase.from("blocked_users").select("id").match({ user_id: fromUserId, blocked_user_id: toUserId }).limit(1),
        supabase.from("blocked_users").select("id").match({ user_id: toUserId, blocked_user_id: fromUserId }).limit(1),
      ])
      if ((blocks1 && blocks1.length > 0) || (blocks2 && blocks2.length > 0)) {
        return { allowed: false, reason: "blocked" }
      }

      // Fetch target profile settings
      const { data: target, error: targetError } = await supabase
        .from("users")
        .select("id, profiles(allow_direct_messages)")
        .eq("id", toUserId)
        .single()
      if (targetError || !target) {
        return { allowed: false, reason: "user_not_found" }
      }

      const allowDMs =
        (Array.isArray((target as any).profiles)
          ? (target as any).profiles[0]?.allow_direct_messages
          : (target as any).profiles?.allow_direct_messages) ?? true

      if (allowDMs) {
        return { allowed: true }
      }

      // If DMs are not allowed, require an existing buddy match
      const { data: match } = await supabase
        .from("buddy_matches")
        .select("id")
        .or(
          `and(user1_id.eq.${fromUserId},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${fromUserId})`,
        )
        .limit(1)
      if (match && match.length > 0) {
        return { allowed: true }
      }

      return { allowed: false, reason: "dms_disabled" }
    } catch (err) {
      console.error("Error in canDirectMessage:", err)
      return { allowed: false, reason: "unknown" }
    }
  },

  // Get or create a 1:1 conversation when allowed
  getOrCreateDirectConversation: async (fromUserId: string, toUserId: string): Promise<Conversation> => {
    const permission = await messagingService.canDirectMessage(fromUserId, toUserId)
    if (!permission.allowed) {
      throw new Error(permission.reason || "not_allowed")
    }

    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select(`*`)
      .contains("participants", [fromUserId, toUserId])
      .eq("is_group", false)
      .limit(1)

    if (!findError && existing && existing.length > 0) {
      // Enrich with participant profile for header
      const { data: participantProfiles } = await supabase.from("users").select("*").in("id", [toUserId])
      return {
        ...(existing[0] as any),
        participant_profiles: participantProfiles || [],
        unread_count: (existing[0] as any).unread_count ?? 0,
        last_message: (existing[0] as any).last_message ?? null,
      } as Conversation
    }

    // Otherwise, create it
    return await messagingService.createConversation([toUserId], false)
  },

  createConversation: async (participantIds: string[], isGroup = false, groupName?: string): Promise<Conversation> => {
    // Get current user ID from auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    const allParticipants = [user.id, ...participantIds]

    // If 1:1 chat, enforce DM permissions
    if (!isGroup && allParticipants.length === 2) {
      const otherId = allParticipants.find((id) => id !== user.id)!
      const permission = await messagingService.canDirectMessage(user.id, otherId)
      if (!permission.allowed) {
        throw new Error(permission.reason || "not_allowed")
      }
    }

    // Create the conversation in the database
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        participants: allParticipants,
        is_group: isGroup,
        group_name: groupName,
      })
      .select(`*`)
      .single()

    if (error) {
      console.error("Error creating conversation:", error)
      throw error
    }

    // Fetch participant profiles
    const { data: participantProfiles } = await supabase.from("users").select("*").in("id", participantIds)

    return {
      ...data,
      participant_profiles: participantProfiles || [],
      unread_count: 0,
      last_message: null,
    }
  },

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      return []
    }

    return data || []
  },

  // Helper function to remove phone numbers from text
  removePhoneNumbers: (text: string): string => {
    // This regex pattern matches common phone number formats
    // It may need to be adjusted based on specific requirements
   const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    return text.replace(phoneRegex, "[PHONE NUMBER REDACTED]")
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    content: string,
    messageType: Message["message_type"] = "text",
    metadata?: Message["metadata"],
  ): Promise<Message> => {
    // Filter phone numbers from text messages
    let filteredContent = content
    if (messageType === "text") {
      filteredContent = removePhoneNumbers(content)
    }

    // Insert the message into the database
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: filteredContent,
        message_type: messageType,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error("Error sending message:", error)
      throw error
    }

    // Update conversation updated_at timestamp (this will be handled by the trigger in the database)
    // But we still need to update the last_message field
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)

    if (updateError) {
      console.error("Error updating conversation:", updateError)
    }

    return data
  },

  markAsRead: async (conversationId: string, messageIds: string[]): Promise<void> => {
    if (!messageIds || messageIds.length === 0) return

    try {
      const { error } = await supabase
        .from("messages")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .in("id", messageIds)
        .eq("conversation_id", conversationId) // Extra safety check

      if (error) {
        console.error("Error marking messages as read:", error)
        throw error
      }
    } catch (err) {
      console.error("Failed to mark messages as read:", err)
      throw err
    }
  },

  // Delete a set of messages (for everyone)
  deleteMessages: async (conversationId: string, messageIds: string[]): Promise<boolean> => {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return true
      const { error } = await supabase
        .from("messages")
        .delete()
        .in("id", messageIds)
        .eq("conversation_id", conversationId)
      if (error) {
        console.error("Error deleting messages:", error)
        return false
      }
      return true
    } catch (err) {
      console.error("Error deleting messages:", err)
      return false
    }
  },

  // Delete an entire conversation (and its messages)
  deleteConversation: async (conversationId: string): Promise<boolean> => {
    try {
      // Delete messages first to avoid FK issues
      const { error: msgErr } = await supabase.from("messages").delete().eq("conversation_id", conversationId)
      if (msgErr) {
        console.error("Error deleting conversation messages:", msgErr)
        return false
      }

      const { error: convErr } = await supabase.from("conversations").delete().eq("id", conversationId)
      if (convErr) {
        console.error("Error deleting conversation:", convErr)
        return false
      }
      return true
    } catch (err) {
      console.error("Error deleting conversation:", err)
      return false
    }
  },

  // User search for new conversations (always surface buddies even if DMs are off)
  searchUsers: async (query: string, currentUserId: string): Promise<UserProfile[]> => {
    const trimmedQuery = (query || "").trim()

    if (!trimmedQuery) {
      return []
    }

    // First, get the list of users that the current user has blocked
    const { data: blockedUsersData, error: blockedUsersError } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", currentUserId)

    if (blockedUsersError) {
      console.error("Error fetching blocked users:", blockedUsersError)
      // Continue with search even if we can't get blocked users
    }

    const blockedUserIds = blockedUsersData ? blockedUsersData.map((blocked) => blocked.blocked_user_id) : []

    const baseSelect = `
      *,
      profiles (
        username,
        show_profile,
        appear_in_search,
        allow_direct_messages
      )
    `

    // Get current user's buddies
    const { data: buddyRows } = await supabase
      .from("buddy_matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

    const buddyIds = (buddyRows || []).map((r: any) => (r.user1_id === currentUserId ? r.user2_id : r.user1_id))

    // Query A: by name
    let byName = supabase
      .from("users")
      .select(baseSelect)
      .ilike("name", `%${trimmedQuery}%`)
      .neq("id", currentUserId)
      .eq("profiles.appear_in_search", true)
      .eq("profiles.show_profile", true)
      .eq("profiles.allow_direct_messages", true)

    // Query B: by username in profiles
    let byUsername = supabase
      .from("users")
      .select(baseSelect)
      .neq("id", currentUserId)
      .eq("profiles.appear_in_search", true)
      .eq("profiles.show_profile", true)
      .eq("profiles.allow_direct_messages", true)
      .ilike("profiles.username", `%${trimmedQuery}%`)

    // Buddy queries: include buddies regardless of allow_direct_messages or appear_in_search
    const buddiesByName = supabase
      .from("users")
      .select(baseSelect)
      .neq("id", currentUserId)
      .in("id", buddyIds.length > 0 ? buddyIds : ["00000000-0000-0000-0000-000000000000"])
      .ilike("name", `%${trimmedQuery}%`)
      .eq("profiles.show_profile", true)

    const buddiesByUsername = supabase
      .from("users")
      .select(baseSelect)
      .neq("id", currentUserId)
      .in("id", buddyIds.length > 0 ? buddyIds : ["00000000-0000-0000-0000-000000000000"])
      .ilike("profiles.username", `%${trimmedQuery}%`)
      .eq("profiles.show_profile", true)

    if (blockedUserIds.length > 0) {
      const blockedList = `(${blockedUserIds.join(",")})`
      byName = byName.not("id", "in", blockedList)
      byUsername = byUsername.not("id", "in", blockedList)
    }

    const [nameRes, usernameRes, buddiesNameRes, buddiesUsernameRes] = await Promise.all([
      byName.limit(20),
      byUsername.limit(20),
      buddiesByName.limit(20),
      buddiesByUsername.limit(20),
    ])

    const firstError = nameRes.error || usernameRes.error || buddiesNameRes.error || buddiesUsernameRes.error
    if (firstError) {
      console.error("Error searching users:", firstError)
      return []
    }

    const combined = [
      ...(nameRes.data || []),
      ...(usernameRes.data || []),
      ...(buddiesNameRes.data || []),
      ...(buddiesUsernameRes.data || []),
    ]

    const seen = new Set<string>()
    const deduped = combined.filter((u: any) => {
      if (seen.has(u.id)) return false
      seen.add(u.id)
      return true
    })

    return deduped as unknown as UserProfile[]
  },

  // Online status
  updateOnlineStatus: async (userId: string, isOnline: boolean): Promise<void> => {
    try {
      const timestamp = new Date().toISOString()
      if (isOnline) {
        const { error } = await supabase
          .from("user_status")
          .upsert({ user_id: userId, is_online: true, last_seen: null })
        if (error) {
          console.error("Error setting online status:", error)
        }
      } else {
        const { error } = await supabase
          .from("user_status")
          .upsert({ user_id: userId, is_online: false, last_seen: timestamp })
        if (error) {
          console.error("Error setting offline status:", error)
        }
      }
    } catch (e) {
      console.error("Error updating user status:", e)
    }
  },

  getUserOnlineStatus: async (userId: string): Promise<{ isOnline: boolean; lastSeen?: string }> => {
    try {
      const { data, error } = await supabase
        .from("user_status")
        .select("is_online, last_seen")
        .eq("user_id", userId)
        .single()
      if (error) {
        return { isOnline: false }
      }
      return { isOnline: !!(data as any)?.is_online, lastSeen: (data as any)?.last_seen || undefined }
    } catch (e) {
      return { isOnline: false }
    }
  },

  // Block a user
  blockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("blocked_users").insert({
        user_id: userId,
        blocked_user_id: blockedUserId,
      })

      if (error) {
        console.error("Error blocking user:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error blocking user:", error)
      return false
    }
  },

  // Unblock a user
  unblockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .match({ user_id: userId, blocked_user_id: blockedUserId })

      if (error) {
        console.error("Error unblocking user:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error unblocking user:", error)
      return false
    }
  },

  // Get blocked users
  getBlockedUsers: async (userId: string): Promise<UserProfile[]> => {
    try {
      // First get the IDs of blocked users
      const { data: blockedUserData, error: blockedUserError } = await supabase
        .from("blocked_users")
        .select("blocked_user_id")
        .eq("user_id", userId)

      if (blockedUserError) {
        console.error("Error fetching blocked user IDs:", blockedUserError)
        return []
      }

      if (!blockedUserData || blockedUserData.length === 0) {
        return []
      }

      // Extract the blocked user IDs
      const blockedUserIds = blockedUserData.map((item) => item.blocked_user_id)

      // Get the user profiles for the blocked users
      const { data: usersData, error: usersError } = await supabase.from("users").select("*").in("id", blockedUserIds)

      if (usersError) {
        console.error("Error fetching blocked user profiles:", usersError)
        return []
      }

      return (usersData as UserProfile[]) || []
    } catch (error) {
      console.error("Error fetching blocked users:", error)
      return []
    }
  },
}
