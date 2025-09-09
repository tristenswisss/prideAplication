-- Test script to verify the likes system is working correctly
-- Run this after applying the fix-likes-system.sql script

-- Test 1: Create test users
INSERT INTO public.users (id, email, name, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'user1@test.com', 'Test User 1', NOW()),
('22222222-2222-2222-2222-222222222222', 'user2@test.com', 'Test User 2', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test 2: Create a test post
INSERT INTO public.posts (id, user_id, content, likes_count, visibility, created_at) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Test post for likes system', 0, 'public', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test 3: Verify initial state
SELECT 'Initial state:' as test_name, p.likes_count, COUNT(pl.id) as actual_likes
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
WHERE p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.id, p.likes_count;

-- Test 4: User 2 likes the post (should work)
INSERT INTO public.post_likes (post_id, user_id) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');

-- Test 5: Verify likes count was updated by trigger
SELECT 'After first like:' as test_name, p.likes_count, COUNT(pl.id) as actual_likes
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
WHERE p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.id, p.likes_count;

-- Test 6: Try to like again (should fail with unique constraint)
DO $$
BEGIN
    BEGIN
        INSERT INTO public.post_likes (post_id, user_id) VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
        RAISE NOTICE 'ERROR: Duplicate like was allowed - this should not happen!';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'SUCCESS: Duplicate like was properly prevented by unique constraint';
    END;
END $$;

-- Test 7: Verify count didn't change after failed duplicate
SELECT 'After duplicate attempt:' as test_name, p.likes_count, COUNT(pl.id) as actual_likes
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
WHERE p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.id, p.likes_count;

-- Test 8: Unlike the post
DELETE FROM public.post_likes 
WHERE post_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' 
AND user_id = '22222222-2222-2222-2222-222222222222';

-- Test 9: Verify likes count was decremented by trigger
SELECT 'After unlike:' as test_name, p.likes_count, COUNT(pl.id) as actual_likes
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
WHERE p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.id, p.likes_count;

-- Test 10: Try owner liking their own post (uncomment if using the self-like prevention trigger)
/*
DO $$
BEGIN
    BEGIN
        INSERT INTO public.post_likes (post_id, user_id) VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
        RAISE NOTICE 'ERROR: Self-like was allowed - enable the self-like prevention trigger!';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'SUCCESS: Self-like was properly prevented';
    END;
END $$;
*/

-- Test 11: Test with multiple users liking the same post
INSERT INTO public.users (id, email, name, created_at) VALUES 
('33333333-3333-3333-3333-333333333333', 'user3@test.com', 'Test User 3', NOW()),
('44444444-4444-4444-4444-444444444444', 'user4@test.com', 'Test User 4', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_likes (post_id, user_id) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');

-- Test 12: Final verification
SELECT 'Final state:' as test_name, p.likes_count, COUNT(pl.id) as actual_likes,
       ARRAY_AGG(u.name) as users_who_liked
FROM public.posts p
LEFT JOIN public.post_likes pl ON p.id = pl.post_id
LEFT JOIN public.users u ON pl.user_id = u.id
WHERE p.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY p.id, p.likes_count;

-- Test 13: Verify RLS policies (this should only work if RLS is properly configured)
-- This assumes the current user can see likes but only manage their own
SELECT 'RLS Test - All likes visible:' as test_name, COUNT(*) as total_likes_visible
FROM public.post_likes pl
WHERE pl.post_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Cleanup (uncomment to clean up test data)
/*
DELETE FROM public.post_likes WHERE post_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.posts WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.users WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', 
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);
*/

-- Expected results:
-- 1. Initial state: likes_count = 0, actual_likes = 0
-- 2. After first like: likes_count = 1, actual_likes = 1
-- 3. Duplicate attempt should show success message about prevention
-- 4. After duplicate attempt: likes_count = 1, actual_likes = 1 (unchanged)
-- 5. After unlike: likes_count = 0, actual_likes = 0
-- 6. Final state: likes_count = 3, actual_likes = 3, users_who_liked = {User 2, User 3, User 4}
