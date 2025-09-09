-- Enable real-time subscriptions for post_likes table
-- This allows the app to listen for like/unlike events in real-time

-- Add post_likes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- Verify that the table was added to realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('post_likes', 'posts', 'messages', 'live_messages', 'notifications', 'comments');

-- Note: The posts table should already be in realtime for likes_count updates
-- If not, uncomment the following line:
-- ALTER PUBLICATION supabase_realtime ADD TABLE posts;
