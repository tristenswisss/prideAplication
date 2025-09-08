-- Database Performance Optimization Script
-- Run this script in your Supabase SQL editor to add performance indexes

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_created_at ON event_attendees(created_at);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, read);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- User status indexes
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_is_online ON user_status(is_online);
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen);

-- Blocked users indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- Buddy matches indexes
CREATE INDEX IF NOT EXISTS idx_buddy_matches_user1_id ON buddy_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_buddy_matches_user2_id ON buddy_matches(user2_id);

-- Profiles indexes (if using separate profiles table)
-- CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
-- CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_category_date ON events(category, date);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent ON messages(conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_status ON event_attendees(user_id, status);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read = false;
-- Note: Removed CURRENT_DATE index as it requires IMMUTABLE function
-- Use application-side filtering for upcoming events instead

-- GIN indexes for array operations
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);

-- Comments for documentation
COMMENT ON INDEX idx_events_date IS 'Optimizes event queries by date';
COMMENT ON INDEX idx_messages_conversation_id IS 'Optimizes message loading for conversations';
COMMENT ON INDEX idx_conversations_participants IS 'Optimizes participant-based conversation queries';