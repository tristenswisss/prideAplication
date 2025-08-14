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
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
  },

  createConversation: async (participantIds: string[], isGroup = false, groupName?: string): Promise<Conversation> => {
    // Get current user ID from auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const allParticipants = [user.id, ...participantIds];

    // Create the conversation in the database
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participants: allParticipants,
        is_group: isGroup,
        group_name: groupName,
      })
      .select()
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

    // Search for users with privacy settings respected
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        profiles (
          show_profile,
          appear_in_search,
          allow_direct_messages
        )
      `)
      .or(`name.ilike.%${query}%`)
      .neq('id', currentUserId) // Don't include the current user
      .not('id', 'in', `(${blockedUserIds.join(',')})`); // Exclude blocked users

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    // Filter results based on privacy settings
    const filteredUsers = data.filter(user => {
      // Check if user has a profile with privacy settings
      if (user.profiles) {
        // User must have show_profile, appear_in_search, and allow_direct_messages all set to true
        return user.profiles.show_profile &&
               user.profiles.appear_in_search &&
               user.profiles.allow_direct_messages;
      }
      // If no profile data, exclude the user
      return false;
    });

    return filteredUsers || [];
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
