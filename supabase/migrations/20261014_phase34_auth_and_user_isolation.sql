-- ====================================================================
-- Kooking: Phase 34 Optional Authentication & Row Level Security (RLS)
-- ====================================================================
--
-- Security Model:
-- 1. Recipe catalog content is PUBLICLY readable by all users (anonymous and authenticated).
-- 2. User profiles and private saved recipes are strictly protected by Row Level Security (RLS).
-- 3. Database policies enforce that users can ONLY select, insert, update, or delete
--    rows where user_id matches auth.uid().
-- 4. Never trust client-supplied user IDs; auth.uid() is derived from the validated JWT token.
-- 5. No service-role key is ever bundled into client/browser bundles.
-- ====================================================================

-- 1. User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and manage only their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- 2. Saved Recipes Table (Cross-device sync for authenticated accounts)
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON public.saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON public.saved_recipes(recipe_id);

-- Enable RLS on saved_recipes
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- Saved Recipes RLS Policies: strict isolation per auth.uid()
CREATE POLICY "Users can view own saved recipes"
  ON public.saved_recipes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved recipes"
  ON public.saved_recipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved recipes"
  ON public.saved_recipes
  FOR DELETE
  USING (auth.uid() = user_id);


-- 3. Public Recipe Catalog Table (When remote publishing is used)
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Public can read all published recipes
CREATE POLICY "Public can read published recipes"
  ON public.recipes
  FOR SELECT
  USING (status = 'published');

-- Only admins / service role can modify catalog recipes
CREATE POLICY "Service role can manage recipes"
  ON public.recipes
  FOR ALL
  USING (auth.role() = 'service_role');


-- 4. Automatic profile creation on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
