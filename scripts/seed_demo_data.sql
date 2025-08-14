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

-- Demo Businesses across categories
INSERT INTO businesses (id, name, description, category, address, latitude, longitude, phone, website, image_url, rating, review_count, lgbtq_friendly, trans_friendly, wheelchair_accessible, verified, owner_id, price_range)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Rainbow Transit', 'Safe and inclusive rides across the city.', 'transport', '123 Transit Ave', 37.7749, -122.4194, '555-0101', 'https://example.com/transit', NULL, 4.6, 12, true, true, true, true, '11111111-1111-1111-1111-111111111111', '$$'),
  ('e2222222-2222-2222-2222-222222222222', 'Pride Academy', 'Community classes and workshops.', 'education', '456 Learning St', 37.7755, -122.4183, '555-0102', 'https://example.com/academy', NULL, 4.8, 20, true, true, true, false, '11111111-1111-1111-1111-111111111111', '$'),
  ('e3333333-3333-3333-3333-333333333333', 'Unity Eats', 'Delicious inclusive dining.', 'restaurant', '789 Food Blvd', 37.7762, -122.4177, '555-0103', 'https://example.com/eats', NULL, 4.5, 34, true, true, false, true, '22222222-2222-2222-2222-222222222222', '$$'),
  ('e4444444-4444-4444-4444-444444444444', 'Queer Credit Union', 'Financial services for all.', 'finance', '101 Finance Way', 37.777, -122.416, '555-0104', 'https://example.com/finance', NULL, 4.7, 9, true, true, true, true, '22222222-2222-2222-2222-222222222222', '$$'),
  ('e5555555-5555-5555-5555-555555555555', 'Spectrum Health', 'LGBTQ+ friendly clinic.', 'healthcare', '202 Health Rd', 37.778, -122.415, '555-0105', 'https://example.com/health', NULL, 4.9, 52, true, true, true, true, '11111111-1111-1111-1111-111111111111', '$$$'),
  ('e6666666-6666-6666-6666-666666666666', 'Pride Mall', 'Shops supporting the community.', 'shopping', '303 Market St', 37.779, -122.414, '555-0106', 'https://example.com/mall', NULL, 4.3, 18, true, false, true, false, '11111111-1111-1111-1111-111111111111', '$$'),
  ('e7777777-7777-7777-7777-777777777777', 'Ally Services', 'LGBTQ+ owned essential services.', 'service', '404 Service Ln', 37.780, -122.413, '555-0107', 'https://example.com/services', NULL, 4.4, 7, true, true, false, false, '22222222-2222-2222-2222-222222222222', '$$'),
  ('e8888888-8888-8888-8888-888888888888', 'Harbor Hotel', 'Inclusive accommodation for all.', 'hotel', '505 Harbor Dr', 37.781, -122.412, '555-0108', 'https://example.com/hotel', NULL, 4.6, 23, true, true, true, true, '22222222-2222-2222-2222-222222222222', '$$$')
ON CONFLICT (id) DO NOTHING;