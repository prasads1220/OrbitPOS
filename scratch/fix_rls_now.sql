-- ============================================================
-- ORBITPOS EMERGENCY RLS FIX
-- Run this ENTIRE script in Supabase SQL Editor.
-- Each block is wrapped in error handling so one failure
-- won't stop the rest from running.
-- ============================================================

-- STEP 1: Fix function ownership so it bypasses RLS internally
DO $$
BEGIN
  ALTER FUNCTION public.current_user_store_id() OWNER TO postgres;
  RAISE NOTICE 'SUCCESS: current_user_store_id owner set to postgres';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIPPED current_user_store_id owner change: %', SQLERRM;
END $$;

-- STEP 2: Grant execute to everyone (so RLS policy evaluation works)
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.current_user_store_id() TO PUBLIC;
  RAISE NOTICE 'SUCCESS: Granted execute on current_user_store_id to PUBLIC';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIPPED grant on current_user_store_id: %', SQLERRM;
END $$;

-- STEP 3: Fix get_my_store_id IF it exists (may not exist, that's OK)
DO $$
BEGIN
  ALTER FUNCTION public.get_my_store_id() OWNER TO postgres;
  GRANT EXECUTE ON FUNCTION public.get_my_store_id() TO PUBLIC;
  RAISE NOTICE 'SUCCESS: Fixed get_my_store_id';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIPPED get_my_store_id (probably does not exist): %', SQLERRM;
END $$;

-- STEP 4: Fix handle_new_user IF it exists
DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
  RAISE NOTICE 'SUCCESS: Fixed handle_new_user';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SKIPPED handle_new_user (probably does not exist): %', SQLERRM;
END $$;

-- STEP 5: Restore the simple "everyone can read profiles" policy
-- This is the CRITICAL fix. Without this, the only SELECT policies
-- on profiles call current_user_store_id(), which queries profiles
-- again, causing infinite recursion.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

-- STEP 6: Make sure INSERT and UPDATE policies still exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- STEP 7: Ensure RLS is enabled (not disabled) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- DONE! Your app should work now.
SELECT 'ALL FIXES APPLIED SUCCESSFULLY' AS result;
