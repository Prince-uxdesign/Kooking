# Fork PWA & Offline Resilience Manual Test Plan (Phase 36)

This document outlines the step-by-step verification procedures for Progressive Web App (PWA) installation, caching behaviors, and offline resilience in Fork across desktop and mobile devices.

---

## Target Environments

- **Desktop**: Google Chrome / Chromium (macOS, Windows, Linux)
- **Mobile Android**: Google Chrome on Android (PWA WebAPK installation supported)
- **Mobile iOS**: Safari on iOS 16.4+ (Add to Home Screen / WebKit Service Workers)
- **Local Dev / Staging**: `http://localhost:3000` or HTTPS deployment.

---

## 1. First Visit While Online

1. Open a clean browser window (or incognito/private mode with network throttling set to No throttling).
2. Navigate to `http://localhost:3000/`.
3. Open DevTools -> **Application** -> **Service Workers**.
   - Verify that `/sw.js` registers successfully with scope `/`.
4. Open DevTools -> **Application** -> **Storage** -> **Cache Storage**.
   - Verify that `kooking-shell-kooking-v1` contains `/offline`, `/manifest.webmanifest`, `/icons/icon.svg`, `/icons/icon-192.png`, `/icons/icon-512.png`, and `/favicon.ico`.
5. Open DevTools -> **Application** -> **Manifest**.
   - Verify that the manifest loads from `/manifest.webmanifest`.
   - Verify App Name: `Fork — Cooking Companion`, Short Name: `Fork`.
   - Verify Theme Color: `#FF6A26`, Background Color: `#ffffff`, Display: `standalone`.
   - Verify that all referenced icons load with status 200 without broken image indicators.

---

## 2. Loading a Recipe

1. Navigate to `/recipes`.
2. Select any recipe (e.g. `Classic Nigerian Jollof Rice` or `demo-tomato-rice`).
3. Observe Network tab:
   - Recipe HTML and component chunks load with status 200.
4. Open DevTools -> **Application** -> **Local Storage**.
   - Verify `kooking:cached-recipes:v1` contains a JSON entry for the viewed recipe with full steps, ingredient quantities, sensory cues, and timers.
5. In Cache Storage:
   - Verify `kooking-pages-kooking-v1` has cached the recipe page URL.

---

## 3. Starting a Cooking Session

1. From the recipe detail page, click **Check Ingredients** or **Start Cooking**.
2. Complete Kitchen Check and start Cooking Mode (`/cook/[sessionId]`).
3. Verify that the session is stored in `kooking:sessions:v1` with `status: "cooking"`, `recipeId`, `currentStepIndex: 0`, and timestamped timers.

---

## 4. Disconnecting the Network

1. In Chrome DevTools, open the **Network** tab and change throttling to **Offline** (or disconnect Wi-Fi / enable Airplane mode on a physical phone).
2. Observe UI:
   - A non-intrusive offline status banner appears at the top: _"Offline mode: Active sessions, cached recipes, and shopping lists remain available on this device."_
   - In Cooking Mode, the session status bar confirms: _"You're offline. This session is on your device, so you can keep cooking and your progress keeps saving here."_

---

## 5. Navigating Between Cached Cooking Steps

1. With the network still offline, click **Next Step** / **Previous Step** or press keyboard arrows.
2. Advance through steps 1, 2, and 3.
3. Verify that instructions, sensory cues, equipment details, and voice read-aloud cues display instantly without blank screens or network error modals.
4. Check `kooking:sessions:v1` in `localStorage`:
   - Verify `currentStepIndex` updates and persists on disk after each transition.

---

## 6. Using an Active Timer While Offline

1. On a step with a timer (e.g., step 2), click **Start timer**.
2. Verify the countdown starts running.
3. Pause the timer, resume the timer, and let it count down.
4. Switch tabs or minimize the browser for 30 seconds, then return.
5. Verify that remaining time is derived strictly from wall-clock timestamps (`endsAt - now`) without any interval drift.
6. When the timer hits 0:
   - Audible chime and haptic pulse fire (if sound/vibration permitted).
   - Card reads: _"Time's up. Finished just now. The timer is a guide, not a sign it's ready. Check the pot before moving on."_
   - Verify that the app **never** marks the step finished or infers food is ready automatically.

---

## 7. Refreshing or Reopening the Active Session Offline

1. With network still set to **Offline**, hit `F5` or `Cmd+R` to reload the page at `/cook/[sessionId]`.
2. Verify that the Service Worker serves the cached page shell without a browser "No Internet" dino screen.
3. Verify that the cooking session recovers to the exact step, with elapsed timers calculated accurately from saved timestamps.

---

## 8. Updating a Shopping List Offline

1. While still offline, navigate to `/lists`.
2. Verify that the shopping list loads from local storage (`kooking:lists:v1`).
3. Perform the 4 primary actions:
   - **Add item**: Add `"Scotch bonnet peppers", 6 pieces`. Verify item appears immediately.
   - **Check item**: Tap checkbox on an item. Verify strike-through and tick state persist.
   - **Edit item**: Change quantity or note on an item. Verify change updates instantly.
   - **Remove item**: Delete an item. Verify undo bar appears and item is removed.
4. Check sync badge:
   - If guest: shows _"Saved on this device"_.
   - If authenticated: shows _"Offline · saved on device (Retry)"_.

---

## 9. Reconnecting and Synchronizing Changes

1. Re-enable network in DevTools (set to **No throttling**) or disable Airplane mode.
2. Observe UI:
   - Offline banner changes to green notice: _"Connection restored. Changes are ready to sync."_ and disappears after 4 seconds.
3. In Shopping List:
   - If authenticated, sync triggers automatically on reconnection.
   - The sync badge transitions from _"Syncing..."_ to _"Synced with account"_.
   - Remote items and local items are merged using Last-Write-Wins without duplicates.

---

## 10. Handling Failed Synchronization

1. If the remote sync endpoint returns a 500 error or authentication is invalid/expired:
   - Local shopping list changes remain safe in browser storage (`LocalShopping`).
   - The badge displays _"Offline · saved on device (Retry)"_.
   - Clicking **Retry** re-invokes the sync service port safely without discarding local work.

---

## 11. Installing the PWA (Where Supported)

1. In Chrome on Desktop or Android, browse Fork.
2. Observe the non-intrusive banner: _"Install Fork for Offline Cooking"_.
3. Click **Install App**:
   - The browser native install dialog appears.
   - After confirming, Fork launches in its own standalone window without browser URL bars.
4. Click **Not now**:
   - The banner dismisses and sets a 14-day suppression in `localStorage`.
   - The prompt does not repeatedly interrupt the user during subsequent page navigations.

---

## 12. Updating the Service Worker

1. Edit `public/sw.js` (e.g., increment version to `kooking-v2`).
2. Reload page while active in a tab.
3. Observe:
   - `sw.js` enters waiting state.
   - An update notification appears: _"A new version of Fork is available with improvements."_ with an **Update Now** button.
   - Active cooking sessions are **never** force-reloaded automatically.
   - Clicking **Update Now** triggers `SKIP_WAITING` and activates the new worker cleanly.

---

## 13. Handling Missing Cached Recipes

1. While offline, navigate directly to an unvisited URL (e.g. `/recipes/unvisited-recipe`).
2. Observe:
   - The Service Worker intercepts the navigation failure and renders `/offline`.
   - The offline fallback explains clearly that this page is unavailable without an internet connection.
   - Provides quick action cards to resume any active cooking session or access the local shopping list.

---

## 14. Ensuring Private Data is Not Exposed Through Caching

1. Open DevTools -> **Application** -> **Cache Storage**.
2. Inspect entries in `kooking-pages-kooking-v1`, `kooking-static-kooking-v1`, and `kooking-images-kooking-v1`.
3. Verify:
   - Zero entries containing `supabase.co`.
   - Zero cached entries for `/api/auth` or `/auth/v1` or `/rest/v1`.
   - Zero headers containing JWT tokens or cookies in cached responses.
   - User account data isolation is strictly preserved.
