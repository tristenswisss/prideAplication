-- Seed demo data for local development
-- Adjust UUIDs as needed; requires enabled extensions uuid-ossp or pgcrypto

-- Users
INSERT INTO users (id, email, name, avatar_url, verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alex@example.com', 'Alex Rainbow', NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name, avatar_url, verified)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'jordan@example.com', 'Jordan Pride', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO profiles (id, username, show_profile, show_activities, appear_in_search, allow_direct_messages)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alex', true, true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, username, show_profile, show_activities, appear_in_search, allow_direct_messages)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'jordan', true, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- Conversation and messages
INSERT INTO conversations (id, participants, is_group, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ARRAY['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']::uuid[], false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, content, message_type)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Hello Jordan!', 'text'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Hi Alex! Ready for Pride?', 'text');

-- Event
INSERT INTO events (id, title, description, date, start_time, end_time, location, organizer_id, category, tags, is_free)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pride Kickoff', 'Join the kickoff!', CURRENT_DATE + INTERVAL '7 day', '18:00', '21:00', 'Main Square', '11111111-1111-1111-1111-111111111111', 'celebration', ARRAY['pride','community'], true)
ON CONFLICT (id) DO NOTHING;

-- Live event
INSERT INTO live_events (id, event_id, title, description, host_id, is_live, viewer_count, chat_enabled)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pride Kickoff Live', 'Live stream of the kickoff', '11111111-1111-1111-1111-111111111111', true, 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO live_messages (live_event_id, user_id, content, message_type)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Welcome everyone!', 'chat'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'So excited! 🏳️‍🌈', 'chat');

-- Post with image and comment
INSERT INTO posts (id, user_id, content, images, tags, visibility)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Happy Pride! #pride', ARRAY[]::text[], ARRAY['pride'], 'public')
ON CONFLICT (id) DO NOTHING;

INSERT INTO comments (post_id, user_id, content)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Love this! 🎉');

INSERT INTO post_likes (post_id, user_id)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;