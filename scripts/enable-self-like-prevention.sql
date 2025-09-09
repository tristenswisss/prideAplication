-- Enable DB-level self-like prevention trigger
-- This prevents users from liking their own posts at the database level

CREATE OR REPLACE FUNCTION prevent_self_like()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is trying to like their own post
    IF EXISTS (
        SELECT 1 FROM public.posts 
        WHERE id = NEW.post_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Users cannot like their own posts';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_self_like_trigger ON public.post_likes;

-- Create the trigger
CREATE TRIGGER prevent_self_like_trigger
    BEFORE INSERT ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_like();

-- Test the trigger (uncomment to test)
/*
-- This should work (assuming users exist)
INSERT INTO public.post_likes (post_id, user_id) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');

-- This should fail with an exception
INSERT INTO public.post_likes (post_id, user_id) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
*/
