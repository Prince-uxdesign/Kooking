"use client";

import React, { useEffect, useState } from "react";
import { Bell, Eye, Minus, Plus, Settings2, Volume2 } from "lucide-react";
import { saveReadAloudPrefs } from "@/features/cooking/read-aloud";
import { setScreenWakePreference } from "@/features/cooking/screen-wake";
import { setSoundPreference } from "@/features/cooking/timer-alerts";
import { LocalPreferences } from "@/shared/data/local";
import { getRemoteSyncService } from "@/shared/data/remote-sync";
import type { UserCookingPreferences } from "@/shared/domain/preferences";
import { DEFAULT_USER_PREFERENCES, updateUserPreferences } from "@/shared/domain/preferences";

interface CookingPreferencesSectionProps {
  userId?: string | null;
  isAuthenticated: boolean;
}

export function CookingPreferencesSection({
  userId,
  isAuthenticated,
}: CookingPreferencesSectionProps) {
  const [prefs, setPrefs] = useState<UserCookingPreferences>(DEFAULT_USER_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const localStore = new LocalPreferences();
      const localPrefs = await localStore.load();

      if (isAuthenticated && userId) {
        const remoteRes = await getRemoteSyncService().fetchUserPreferences(userId);
        if (!mounted) return;
        const resolved = remoteRes.preferences ?? localPrefs;
        setPrefs(resolved);
        // Sync to device helpers
        setScreenWakePreference(resolved.screenWake);
        setSoundPreference(resolved.soundAlerts);
        saveReadAloudPrefs({ auto: resolved.readAloud, voiceURI: null });
      } else {
        if (!mounted) return;
        setPrefs(localPrefs);
      }
      setLoaded(true);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [userId, isAuthenticated]);

  const update = async (changes: Partial<UserCookingPreferences>) => {
    const next = updateUserPreferences(prefs, changes);
    setPrefs(next);

    // Save to local storage
    const localStore = new LocalPreferences();
    await localStore.store(next);

    // Update feature-specific device settings
    if ("screenWake" in changes && changes.screenWake !== undefined) {
      setScreenWakePreference(changes.screenWake);
    }
    if ("soundAlerts" in changes && changes.soundAlerts !== undefined) {
      setSoundPreference(changes.soundAlerts);
    }
    if ("readAloud" in changes && changes.readAloud !== undefined) {
      saveReadAloudPrefs({ auto: changes.readAloud, voiceURI: null });
    }

    // Save to account if authenticated
    if (isAuthenticated && userId) {
      await getRemoteSyncService().saveUserPreferences(userId, next);
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-white card-edge p-6">
        <div className="h-6 w-40 rounded-lg bg-surface-100 animate-pulse" />
        <div className="h-28 rounded-2xl bg-surface-100 animate-pulse mt-2" />
      </div>
    );
  }

  const currentServings = prefs.defaultServings ?? 4;

  const handleServingsDelta = (delta: number) => {
    const next = Math.min(12, Math.max(1, currentServings + delta));
    void update({ defaultServings: next });
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white card-edge p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-primary-600" aria-hidden />
          <h2 className="text-[1rem] font-semibold text-ink-900">Cooking Preferences</h2>
        </div>
        {savedFeedback && (
          <span
            role="status"
            className="text-[0.8125rem] font-medium text-primary-700 animate-fadeIn"
          >
            Saved
          </span>
        )}
      </div>

      <p className="text-[0.875rem] text-ink-600">
        Personalize how Cooking Mode and portions work on your device.
      </p>

      <div className="flex flex-col divide-y divide-line-default pt-1">
        {/* Default Servings */}
        <div className="flex items-center justify-between py-4 first:pt-2">
          <div className="flex flex-col gap-0.5 pr-4">
            <span className="text-[0.9375rem] font-medium text-ink-900">Default portion size</span>
            <span className="text-[0.8125rem] text-ink-500">
              Initial servings for recipes and Kitchen Check
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Decrease default servings"
              onClick={() => handleServingsDelta(-1)}
              disabled={currentServings <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-ink-800 transition-colors hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={16} aria-hidden />
            </button>
            <span className="min-w-8 text-center text-[0.9375rem] font-semibold text-ink-900 tnum">
              {currentServings}
            </span>
            <button
              type="button"
              aria-label="Increase default servings"
              onClick={() => handleServingsDelta(1)}
              disabled={currentServings >= 12}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-ink-800 transition-colors hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} aria-hidden />
            </button>
          </div>
        </div>

        {/* Screen Wake */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-start gap-3 pr-4">
            <Eye size={20} className="mt-0.5 text-ink-500 shrink-0" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="pref-screen-wake"
                className="text-[0.9375rem] font-medium text-ink-900 cursor-pointer"
              >
                Keep screen awake
              </label>
              <span className="text-[0.8125rem] text-ink-500">
                Prevents your display from sleeping during Cooking Mode
              </span>
            </div>
          </div>
          <input
            id="pref-screen-wake"
            type="checkbox"
            checked={prefs.screenWake}
            onChange={(e) => void update({ screenWake: e.target.checked })}
            className="switch"
          />
        </div>

        {/* Timer Chime Alerts */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-start gap-3 pr-4">
            <Bell size={20} className="mt-0.5 text-ink-500 shrink-0" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="pref-sound-alerts"
                className="text-[0.9375rem] font-medium text-ink-900 cursor-pointer"
              >
                Timer audio chime
              </label>
              <span className="text-[0.8125rem] text-ink-500">
                Plays an alert sound when step timers finish
              </span>
            </div>
          </div>
          <input
            id="pref-sound-alerts"
            type="checkbox"
            checked={prefs.soundAlerts}
            onChange={(e) => void update({ soundAlerts: e.target.checked })}
            className="switch"
          />
        </div>

        {/* Step Read Aloud */}
        <div className="flex items-center justify-between py-4 last:pb-1">
          <div className="flex items-start gap-3 pr-4">
            <Volume2 size={20} className="mt-0.5 text-ink-500 shrink-0" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="pref-read-aloud"
                className="text-[0.9375rem] font-medium text-ink-900 cursor-pointer"
              >
                Step read-aloud
              </label>
              <span className="text-[0.8125rem] text-ink-500">
                Automatically reads the new step when advancing
              </span>
            </div>
          </div>
          <input
            id="pref-read-aloud"
            type="checkbox"
            checked={prefs.readAloud}
            onChange={(e) => void update({ readAloud: e.target.checked })}
            className="switch"
          />
        </div>
      </div>
    </div>
  );
}
