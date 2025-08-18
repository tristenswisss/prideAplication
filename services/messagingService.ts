import type { Message, Conversation, UserProfile } from "../types/messaging"
import { supabase } from "../lib/supabase"

// Helper function to remove phone numbers from text
const removePhoneNumbers = (text: string): string => {
  // This regex pattern matches common phone number formats
  // It may need to be adjusted based on specific requirements
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  return text.replace(phoneRegex, "[PHONE NUMBER REDACTED]");
};

export const messagingService = {
  // Conversations
  getConversations: async (userId: string): Promise<Conversation[]> => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`*, participants:users!conversations_participants_fkey(*)`)
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return (data as any) || [];
  },

  // Check whether a user can DM another user:
  // - Not blocked by or blocking the other
  // - Target allows DMs (profiles.allow_direct_messages)
  // - If target doesn't allow DMs, they must be buddies (buddy_matches exists)
  canDirectMessage: async (fromUserId: string, toUserId: string): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      if (fromUserId === toUserId) return { allowed: false, reason: 'cannot_dm_self' }

      // Check mutual blocks
      const [{ data: blocks1 }, { data: blocks2 }] = await Promise.all([
        supabase.from('blocked_users').select('id').match({ user_id: fromUserId, blocked_user_id: toUserId }).limit(1),
        supabase.from('blocked_users').select('id').match({ user_id: toUserId, blocked_user_id: fromUserId }).limit(1),
      ])
      if ((blocks1 && blocks1.length > 0) || (blocks2 && blocks2.length > 0)) {
        return { allowed: false, reason: 'blocked' }
      }

      // Fetch target profile settings
      const { data: target, error: targetError } = await supabase
        .from('users')
        .select('id, profiles(allow_direct_messages)')
        .eq('id', toUserId)
        .single()
      if (targetError || !target) {
        return { allowed: false, reason: 'user_not_found' }
      }

      const allowDMs = (Array.isArray((target as any).profiles) ? (target as any).profiles[0]?.allow_direct_messages : (target as any).profiles?.allow_direct_messages) ?? true

      if (allowDMs) {
        return { allowed: true }
      }

      // If DMs are not allowed, require an existing buddy match
      const { data: match } = await supabase
        .from('buddy_matches')
        .select('id')
        .or(`and(user1_id.eq.${fromUserId},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${fromUserId})`)
        .limit(1)
      if (match && match.length > 0) {
        return { allowed: true }
      }

      return { allowed: false, reason: 'dms_disabled' }
    } catch (err) {
      console.error('Error in canDirectMessage:', err)
      return { allowed: false, reason: 'unknown' }
    }
  },

  // Get or create a 1:1 conversation when allowed
  getOrCreateDirectConversation: async (fromUserId: string, toUserId: string): Promise<Conversation> => {
    const permission = await messagingService.canDirectMessage(fromUserId, toUserId)
    if (!permission.allowed) {
      throw new Error(permission.reason || 'not_allowed')
    }

    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select(`*, participants:users!conversations_participants_fkey(*)`)
      .contains('participants', [fromUserId, toUserId])
      .eq('is_group', false)
      .limit(1)

    if (!findError && existing && existing.length > 0) {
      // Enrich with participant profile for header
      const { data: participantProfiles } = await supabase
        .from('users')
        .select('*')
        .in('id', [toUserId])
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const allParticipants = [user.id, ...participantIds];

    // If 1:1 chat, enforce DM permissions
    if (!isGroup && allParticipants.length === 2) {
      const otherId = allParticipants.find(id => id !== user.id)!
      const permission = await messagingService.canDirectMessage(user.id, otherId)
      if (!permission.allowed) {
        throw new Error(permission.reason || 'not_allowed')
      }
    }

    // Create the conversation in the database
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participants: allParticipants,
        is_group: isGroup,
        group_name: groupName,
      })
      .select(`*, participants:users!conversations_participants_fkey(*)`)
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    // Fetch participant profiles
    const { data: participantProfiles } = await supabase
      .from('users')
      .select('*')
      .in('id', participantIds);

    return {
      ...data,
      participant_profiles: participantProfiles || [],
      unread_count: 0,
      last_message: null,
    };
  },

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  },

  // Helper function to remove phone numbers from text
    removePhoneNumbers: (text: string): string => {
      // This regex pattern matches common phone number formats
      // It may need to be adjusted based on specific requirements
      const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
      return text.replace(phoneRegex, "[PHONE NUMBER REDACTED]");
    },
  
    sendMessage: async (
        conversationId: string,
        senderId: string,
        content: string,
        messageType: Message["message_type"] = "text",
        metadata?: Message["metadata"],
      ): Promise<Message> => {
        // Filter phone numbers from text messages
        let filteredContent = content;
        if (messageType === "text") {
          filteredContent = removePhoneNumbers(content);
        }
    
        // Insert the message into the database
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: filteredContent,
            message_type: messageType,
            metadata,
          })
          .select()
          .single();
    
        if (error) {
          console.error('Error sending message:', error);
          throw error;
        }
    
        // Update conversation updated_at timestamp (this will be handled by the trigger in the database)
        // But we still need to update the last_message field
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
    
        if (updateError) {
          console.error('Error updating conversation:', updateError);
        }
    
        return data;
      },

  markAsRead: async (conversationId: string, messageIds: string[]): Promise<void> => {
    // Update messages as read in the database
    const { error } = await supabase
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .in('id', messageIds);

    if (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // User search for new conversations
  searchUsers: async (query: string, currentUserId: string): Promise<UserProfile[]> => {
    const trimmedQuery = (query || '').trim();

    if (!trimmedQuery) {
      return [];
    }

    // First, get the list of users that the current user has blocked
    const { data: blockedUsersData, error: blockedUsersError } = await supabase
      .from('blocked_users')
      .select('blocked_user_id')
      .eq('user_id', currentUserId);

    if (blockedUsersError) {
      console.error('Error fetching blocked users:', blockedUsersError);
      // Continue with search even if we can't get blocked users
    }

    const blockedUserIds = blockedUsersData
      ? blockedUsersData.map(blocked => blocked.blocked_user_id)
      : [];

    const baseSelect = `
      *,
      profiles (
        username,
        show_profile,
        appear_in_search,
        allow_direct_messages
      )
    `;

    // Query A: by name
    let byName = supabase
      .from('users')
      .select(baseSelect)
      .ilike('name', `%${trimmedQuery}%`)
      .neq('id', currentUserId)
      .eq('profiles.appear_in_search', true)
      .eq('profiles.show_profile', true)
      .eq('profiles.allow_direct_messages', true);

    // Query B: by username in profiles
    let byUsername = supabase
      .from('users')
      .select(baseSelect)
      .neq('id', currentUserId)
      .eq('profiles.appear_in_search', true)
      .eq('profiles.show_profile', true)
      .eq('profiles.allow_direct_messages', true)
      .ilike('profiles.username', `%${trimmedQuery}%`);

    if (blockedUserIds.length > 0) {
      const blockedList = `(${blockedUserIds.join(',')})`;
      byName = byName.not('id', 'in', blockedList);
      byUsername = byUsername.not('id', 'in', blockedList);
    }

    const [nameRes, usernameRes] = await Promise.all([
      byName.limit(20),
      byUsername.limit(20),
    ]);

    const firstError = nameRes.error || usernameRes.error;
    if (firstError) {
      console.error('Error searching users:', firstError);
      return [];
    }

    const combined = [
      ...(nameRes.data || []),
      ...(usernameRes.data || []),
    ];

    const seen = new Set<string>();
    const deduped = combined.filter((u: any) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    return deduped as unknown as UserProfile[];
  },

  // Online status
  updateOnlineStatus: async (userId: string, isOnline: boolean): Promise<void> => {
    // In a real app, you might want to store this in a separate "user_status" table
    // For now, we'll just log the status change
    console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    
    // If you want to store this in the database, you could do something like:
    // const { error } = await supabase
    //   .from('users')
    //   .update({
    //     is_online: isOnline,
    //     last_seen: isOnline ? null : new Date().toISOString()
    //   })
    //   .eq('id', userId);
    
    // if (error) {
    //   console.error('Error updating user status:', error);
    // }
  },

  getUserOnlineStatus: async (userId: string): Promise<{ isOnline: boolean; lastSeen?: string }> => {
    // In a real app, you would fetch this from a separate "user_status" table or similar
    // For now, we'll return a default status
    console.log(`Fetching online status for user ${userId}`);
    
    // If you want to fetch this from the database, you could do something like:
    // const { data, error } = await supabase
    //   .from('users')
    //   .select('is_online, last_seen')
    //   .eq('id', userId)
    //   .single();
    
    // if (error) {
    //   console.error('Error fetching user status:', error);
    //   return { isOnline: false };
    // }
    
    // return {
    //   isOnline: data?.is_online || false,
    //   lastSeen: data?.last_seen,
    // };
    
    // For now, returning a default response
    return { isOnline: false };
  },

  // Block a user
  blockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: userId,
          blocked_user_id: blockedUserId
        });

      if (error) {
        console.error('Error blocking user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  },

  // Unblock a user
  unblockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .match({ user_id: userId, blocked_user_id: blockedUserId });

      if (error) {
        console.error('Error unblocking user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  },

  // Get blocked users
  getBlockedUsers: async (userId: string): Promise<UserProfile[]> => {
    try {
      // First get the IDs of blocked users
      const { data: blockedUserData, error: blockedUserError } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId);

      if (blockedUserError) {
        console.error('Error fetching blocked user IDs:', blockedUserError);
        return [];
      }

      if (!blockedUserData || blockedUserData.length === 0) {
        return [];
      }

      // Extract the blocked user IDs
      const blockedUserIds = blockedUserData.map(item => item.blocked_user_id);

      // Get the user profiles for the blocked users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', blockedUserIds);

      if (usersError) {
        console.error('Error fetching blocked user profiles:', usersError);
        return [];
      }

      return usersData as UserProfile[] || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  },
}
