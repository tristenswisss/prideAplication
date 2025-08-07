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