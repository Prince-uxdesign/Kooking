import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Supabase client initialization for Kooking (Phase 34).
 *
 * Rules:
 * - Credentials must use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * - Never expose a service_role key to browser code.
 * - If credentials are not configured, functions return null rather than crashing.
 * - The app gracefully operates in guest/local mode when Supabase is unconfigured.
 */

let cachedClient: SupabaseClient | null = null;
let probeRan = false;

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  // Basic sanity check on URL shape
  try {
    new URL(url);
    return { url, anonKey };
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (probeRan) return null;

  const config = getSupabaseConfig();
  if (!config) {
    probeRan = true;
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    logger.error("SupabaseInit", err);
    probeRan = true;
    return null;
  }
}
