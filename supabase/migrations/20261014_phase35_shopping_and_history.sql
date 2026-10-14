-- ====================================================================
-- Kooking: Phase 35 Persistent Shopping, Cooking History & Preferences
-- ====================================================================
--
-- Security Model:
-- 1. All user shopping items, cooking history records, and preferences
--    are strictly isolated per authenticated user via Row Level Security (RLS).
-- 2. `auth.uid() = user_id` is enforced on all operations.
-- 3. Anonymous users operate on local browser storage without contacting these tables.
-- ====================================================================

-- 1. Shopping Items Table
CREATE TABLE IF NOT EXISTS public.shopping_items (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('recipe', 'personal')),
  name TEXT NOT NULL,
  qty NUMERIC,
  unit TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  recipe_id TEXT,
  recipe_slug TEXT,
  recipe_title TEXT,
  line_id TEXT,
  category TEXT,
  notes TEXT,
  servings_context INT,
  needs_clarification BOOLEAN NOT NULL DEFAULT FALSE,
  clarification TEXT,
  user_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON public.shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_updated_at ON public.shopping_items(user_id, updated_at_ms);

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopping items"
  ON public.shopping_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping items"
  ON public.shopping_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping items"
  ON public.shopping_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping items"
  ON public.shopping_items
  FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Cooking History Table
CREATE TABLE IF NOT EXISTS public.cooking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  recipe_slug TEXT NOT NULL,
  content_version INT NOT NULL,
  servings INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'abandoned', 'interrupted')),
  started_at_ms BIGINT NOT NULL,
  completed_at_ms BIGINT,
  duration_minutes INT,
  completed_steps_count INT NOT NULL DEFAULT 0,
  total_steps_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_cooking_history_user_id ON public.cooking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_history_recipe_id ON public.cooking_history(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cooking_history_started ON public.cooking_history(user_id, started_at_ms DESC);

ALTER TABLE public.cooking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cooking history"
  ON public.cooking_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooking history"
  ON public.cooking_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooking history"
  ON public.cooking_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cooking history"
  ON public.cooking_history
  FOR DELETE
  USING (auth.uid() = user_id);


-- 3. User Cooking Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_servings INT CHECK (default_servings >= 1 AND default_servings <= 24),
  screen_wake BOOLEAN NOT NULL DEFAULT TRUE,
  sound_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  read_aloud BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);
