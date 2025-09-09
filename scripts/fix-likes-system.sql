-- Fix for Post Likes System
-- This script addresses the following issues:
-- 1. Users can like the same post multiple times
-- 2. Users can like their own posts (optional prevention)
-- 3. likes_count is not automatically maintained
-- 4. Missing RLS policies for post_likes

-- Step 1: Add unique constraint to prevent duplicate likes
-- First, remove any existing duplicate likes
DELETE FROM public.post_likes 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM public.post_likes 
    GROUP BY post_id, user_id
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.post_likes 
ADD CONSTRAINT unique_user_post_like UNIQUE (post_id, user_id);

-- Step 2: Create function to update likes count automatically
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes count when a like is added
        UPDATE public.posts 
        SET likes_count = COALESCE(likes_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes count when a like is removed
        UPDATE public.posts 
        SET likes_count = GREATEST(COALESCE(likes_count, 1) - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create triggers for automatic likes count management
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER post_likes_count_trigger
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

-- Step 4: Fix existing likes counts (recalculate from actual likes)
UPDATE public.posts 
SET likes_count = (
    SELECT COUNT(*) 
    FROM public.post_likes 
    WHERE post_likes.post_id = posts.id
);

-- Step 5: Enable Row Level Security on post_likes table
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for post_likes
-- Users can view all post likes (for counting and checking if they liked)
CREATE POLICY "Users can view post likes" ON public.post_likes
    FOR SELECT USING (TRUE);

-- Users can only insert their own likes
CREATE POLICY "Users can insert their own likes" ON public.post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete their own likes" ON public.post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Optional - Prevent users from liking their own posts
-- Uncomment the following if you want to prevent self-likes:
/*
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

CREATE TRIGGER prevent_self_like_trigger
    BEFORE INSERT ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_like();
*/

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON public.post_likes(created_at);
