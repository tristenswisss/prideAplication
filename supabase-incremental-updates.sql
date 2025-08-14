-- Create only the new tables that don't already exist

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Index for blocked users
CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user ON blocked_users(blocked_user_id);

-- Ensure profiles table and columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(50) UNIQUE,
      phone VARCHAR(20),
      date_of_birth DATE,
      gender VARCHAR(50),
      sexual_orientation VARCHAR(50),
      show_profile BOOLEAN DEFAULT TRUE,
      show_activities BOOLEAN DEFAULT TRUE,
      appear_in_search BOOLEAN DEFAULT TRUE,
      allow_direct_messages BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;

  -- Ensure username column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username VARCHAR(50) UNIQUE;
  END IF;

  -- Ensure appear_in_search column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'appear_in_search'
  ) THEN
    ALTER TABLE profiles ADD COLUMN appear_in_search BOOLEAN DEFAULT TRUE;
  END IF;

  -- Ensure show_profile column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'show_profile'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_profile BOOLEAN DEFAULT TRUE;
  END IF;

  -- Ensure allow_direct_messages column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'allow_direct_messages'
  ) THEN
    ALTER TABLE profiles ADD COLUMN allow_direct_messages BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Indexes to speed up joins and username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Buddy Requests Table
CREATE TABLE IF NOT EXISTS buddy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Index for buddy requests
CREATE INDEX IF NOT EXISTS idx_buddy_requests_from ON buddy_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_to ON buddy_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_requests_status ON buddy_requests(status);

-- Buddy Matches Table
CREATE TABLE IF NOT EXISTS buddy_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score INTEGER,
  matched_interests TEXT[],
  distance DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Index for buddy matches
CREATE INDEX IF NOT EXISTS idx_buddy_matches_user1 ON buddy_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_buddy_matches_user2 ON buddy_matches(user2_id);

-- Safety Check-ins Table
CREATE TABLE IF NOT EXISTS safety_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location JSONB,
  status VARCHAR(20), -- safe, need_help, emergency
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for safety check-ins
CREATE INDEX IF NOT EXISTS idx_safety_check_ins_user ON safety_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_check_ins_buddy ON safety_check_ins(buddy_id);
CREATE INDEX IF NOT EXISTS idx_safety_check_ins_status ON safety_check_ins(status);

-- Meetups Table
CREATE TABLE IF NOT EXISTS meetups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location JSONB,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'planned', -- planned, confirmed, completed, cancelled
  safety_plan JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for meetups
CREATE INDEX IF NOT EXISTS idx_meetups_organizer ON meetups(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetups_buddy ON meetups(buddy_id);
CREATE INDEX IF NOT EXISTS idx_meetups_status ON meetups(status);

-- Buddy Ratings Table
CREATE TABLE IF NOT EXISTS buddy_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meetup_id UUID REFERENCES meetups(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rater_id, buddy_id, meetup_id)
);

-- Index for buddy ratings
CREATE INDEX IF NOT EXISTS idx_buddy_ratings_rater ON buddy_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_buddy_ratings_buddy ON buddy_ratings(buddy_id);
CREATE INDEX IF NOT EXISTS idx_buddy_ratings_meetup ON buddy_ratings(meetup_id);

-- Add RLS policies for new tables if they don't exist
-- Blocked Users Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own blocked users') THEN
    CREATE POLICY "Users can view their own blocked users" ON blocked_users
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can block other users') THEN
    CREATE POLICY "Users can block other users" ON blocked_users
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can unblock users they''ve blocked') THEN
    CREATE POLICY "Users can unblock users they've blocked" ON blocked_users
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Buddy Requests Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own buddy requests') THEN
    CREATE POLICY "Users can view their own buddy requests" ON buddy_requests
      FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can create buddy requests') THEN
    CREATE POLICY "Users can create buddy requests" ON buddy_requests
      FOR INSERT WITH CHECK (auth.uid() = from_user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own buddy requests') THEN
    CREATE POLICY "Users can update their own buddy requests" ON buddy_requests
      FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  END IF;
END $$;

-- Buddy Matches Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own buddy matches') THEN
    CREATE POLICY "Users can view their own buddy matches" ON buddy_matches
      FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
  END IF;
END $$;

-- Safety Check-ins Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own safety check-ins') THEN
    CREATE POLICY "Users can view their own safety check-ins" ON safety_check_ins
      FOR SELECT USING (auth.uid() = user_id OR auth.uid() = buddy_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can create safety check-ins') THEN
    CREATE POLICY "Users can create safety check-ins" ON safety_check_ins
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Meetups Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own meetups') THEN
    CREATE POLICY "Users can view their own meetups" ON meetups
      FOR SELECT USING (auth.uid() = organizer_id OR auth.uid() = buddy_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can create meetups they organize') THEN
    CREATE POLICY "Users can create meetups they organize" ON meetups
      FOR INSERT WITH CHECK (auth.uid() = organizer_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update meetups they organize') THEN
    CREATE POLICY "Users can update meetups they organize" ON meetups
      FOR UPDATE USING (auth.uid() = organizer_id);
  END IF;
END $$;

-- Buddy Ratings Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own buddy ratings') THEN
    CREATE POLICY "Users can view their own buddy ratings" ON buddy_ratings
      FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = buddy_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can create their own buddy ratings') THEN
    CREATE POLICY "Users can create their own buddy ratings" ON buddy_ratings
      FOR INSERT WITH CHECK (auth.uid() = rater_id);
  END IF;
END $$;

-- Enable RLS on new tables if not already enabled
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_ratings ENABLE ROW LEVEL SECURITY;

-- Create RPC functions for post counters if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_post_likes'
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_likes(post_id uuid)
    RETURNS void AS $$
    BEGIN
      UPDATE posts SET likes_count = COALESCE(likes_count,0) + 1 WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'decrement_post_likes'
  ) THEN
    CREATE OR REPLACE FUNCTION decrement_post_likes(post_id uuid)
    RETURNS void AS $$
    BEGIN
      UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0) WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_post_comments'
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_comments(post_id uuid)
    RETURNS void AS $$
    BEGIN
      UPDATE posts SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_post_shares'
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_shares(post_id uuid)
    RETURNS void AS $$
    BEGIN
      UPDATE posts SET shares_count = COALESCE(shares_count,0) + 1 WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create a helper to insert notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_notification'
  ) THEN
    CREATE OR REPLACE FUNCTION create_notification(
      user_id uuid,
      title text,
      message text,
      type text,
      data jsonb DEFAULT NULL
    ) RETURNS void AS $$
    BEGIN
      INSERT INTO notifications (user_id, title, message, type, data) VALUES (user_id, title, message, type, data);
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Ensure post_likes and post_shares tables exist for social features
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- RLS policies for these tables
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can like posts') THEN
    CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can unlike their likes') THEN
    CREATE POLICY "Users can unlike their likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can share posts') THEN
    CREATE POLICY "Users can share posts" ON post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can save posts') THEN
    CREATE POLICY "Users can save posts" ON saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can unsave their posts') THEN
    CREATE POLICY "Users can unsave their posts" ON saved_posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Storage bucket policies for 'mirae' (if using Supabase storage)
-- These run in the storage schema and require supabase.storage to exist
-- Provided here for reference; apply in Supabase SQL editor if needed
-- Allow authenticated users to upload, public select
-- CREATE POLICY "mirae upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mirae');
-- CREATE POLICY "mirae select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'mirae');
-- CREATE POLICY "mirae update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mirae' AND owner = auth.uid());
-- CREATE POLICY "mirae delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mirae' AND owner = auth.uid());