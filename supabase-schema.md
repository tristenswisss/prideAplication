# Supabase SQL Schema for Pride App

## Enable necessary extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  pronouns VARCHAR(50),
  location VARCHAR(255),
  interests TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Profiles Table (for additional user profile information)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(50),
  sexual_orientation VARCHAR(50),
  show_profile BOOLEAN DEFAULT TRUE,
  show_activities BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(100),
  group_avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, location, event_share
  metadata JSONB,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster message retrieval
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

## Live Events Table
```sql
CREATE TABLE live_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stream_url TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  max_viewers INTEGER DEFAULT 0,
  chat_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for live events
CREATE INDEX idx_live_events_host ON live_events(host_id);
CREATE INDEX idx_live_events_is_live ON live_events(is_live);
```

## Live Messages Table (for live event chat)
```sql
CREATE TABLE live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_event_id UUID REFERENCES live_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat', -- chat, join, leave, reaction
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for live messages
CREATE INDEX idx_live_messages_event ON live_messages(live_event_id);
CREATE INDEX idx_live_messages_user ON live_messages(user_id);
CREATE INDEX idx_live_messages_sent_at ON live_messages(sent_at);
```

## Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  attendee_count INTEGER DEFAULT 0,
  max_attendees INTEGER,
  category VARCHAR(50),
  tags TEXT[],
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Event Attendees Table
```sql
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'going', -- going, interested, not_going
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Index for event attendees
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);
```

## Businesses Table
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  address VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  website VARCHAR(255),
  image_url TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  lgbtq_friendly BOOLEAN DEFAULT TRUE,
  trans_friendly BOOLEAN DEFAULT TRUE,
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  price_range VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Reviews Table
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
  inclusivity_rating INTEGER CHECK (inclusivity_rating >= 1 AND inclusivity_rating <= 5),
  staff_friendliness INTEGER CHECK (staff_friendliness >= 1 AND staff_friendliness <= 5),
  accessibility_rating INTEGER CHECK (accessibility_rating >= 1 AND accessibility_rating <= 5),
  would_recommend BOOLEAN,
  visit_date DATE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- Index for reviews
CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
```

## Posts Table (for community feed)
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  images TEXT[],
  location JSONB,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  tags TEXT[],
  visibility VARCHAR(20) DEFAULT 'public', -- public, followers, private
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for posts
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

## Comments Table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_liked BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for comments
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
```

## Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50), -- event_reminder, new_event, review_response, friend_request, general
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

## Enable Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

## Create Policies for Row Level Security
```sql
-- Users can view and update their own profiles
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view profiles of other users
CREATE POLICY "Users can view other profiles" ON users
  FOR SELECT USING (TRUE);

-- Users can view and update their own profile details
CREATE POLICY "Users can view their own profile details" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile details" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Users can view conversations they are part of
CREATE POLICY "Users can view conversations they are part of" ON conversations
  FOR SELECT USING (auth.uid() = ANY(participants));

-- Users can view messages in conversations they are part of
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND auth.uid() = ANY(conversations.participants)
  ));

-- Users can insert messages in conversations they are part of
CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND auth.uid() = ANY(conversations.participants)
  ));

-- Users can view live events they have access to
CREATE POLICY "Users can view live events" ON live_events
  FOR SELECT USING (TRUE);

-- Users can view live messages in events they have access to
CREATE POLICY "Users can view live messages in events" ON live_messages
  FOR SELECT USING (TRUE);

-- Users can insert live messages in events they have access to
CREATE POLICY "Users can insert live messages in events" ON live_messages
  FOR INSERT WITH CHECK (TRUE);

-- Users can view events
CREATE POLICY "Users can view events" ON events
  FOR SELECT USING (TRUE);

-- Users can view event attendees
CREATE POLICY "Users can view event attendees" ON event_attendees
  FOR SELECT USING (TRUE);

-- Users can insert their own event attendance
CREATE POLICY "Users can insert their own event attendance" ON event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own event attendance
CREATE POLICY "Users can update their own event attendance" ON event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view businesses
CREATE POLICY "Users can view businesses" ON businesses
  FOR SELECT USING (TRUE);

-- Users can view reviews
CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (TRUE);

-- Users can insert their own reviews
CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view posts
CREATE POLICY "Users can view posts" ON posts
  FOR SELECT USING (TRUE);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view comments
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (TRUE);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

## Create Functions for Real-time Updates
```sql
-- Function to update conversation updated_at when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation updated_at when a new message is sent
CREATE TRIGGER update_conversation_updated_at_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events 
  SET attendee_count = (
    SELECT COUNT(*) 
    FROM event_attendees 
    WHERE event_attendees.event_id = events.id 
    AND event_attendees.status = 'going'
  )
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update event attendee count
CREATE TRIGGER update_event_attendee_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

-- Function to update business review count and rating
CREATE OR REPLACE FUNCTION update_business_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses 
  SET 
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviews.business_id = businesses.id
    ),
    rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM reviews 
      WHERE reviews.business_id = businesses.id
    )
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update business review count and rating
CREATE TRIGGER update_business_review_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_review_stats();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts 
  SET comments_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = posts.id
  )
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post comment count
CREATE TRIGGER update_post_comment_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();
```

## Create Real-time Subscriptions
```sql
-- Enable real-time for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```

## Safe Space Suggestions
```sql
CREATE TABLE safe_space_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  services TEXT[],
  lgbtq_friendly BOOLEAN DEFAULT TRUE,
  trans_friendly BOOLEAN DEFAULT TRUE,
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

This schema provides a comprehensive database structure for the Pride App with support for:
- User profiles and authentication
- Real-time messaging with conversations
- Live events with real-time chat
- Community posts and comments
- Event management and attendance
- Business listings and reviews
- Notifications system

The schema includes proper indexing for performance, Row Level Security policies for data protection, and triggers for automatic updates of related data.