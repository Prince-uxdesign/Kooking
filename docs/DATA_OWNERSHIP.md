# Kooking Data Ownership and Persistence Architecture

Phase 35 introduces a coherent, explicit persistence and synchronization strategy across all user-facing data types in Kooking: saved recipes, shopping lists, cooking sessions, cooking history, Kitchen Check records, and user cooking preferences.

---

## 1. Core Principles

1. **Anonymous First**: Kooking remains 100% usable without an account. Guests can explore recipes, perform Kitchen Checks, build shopping lists, and follow Cooking Mode with active timers and screen-wake locks.
2. **Account-Backed Portability**: Authenticated accounts exist to provide secure, cross-device synchronization and durable backup.
3. **No Silent Storage Assumptions**: Browser `localStorage` is explicitly treated as ephemeral cache, not a permanent or secure database. It can be cleared by the operating system, the browser, or privacy modes at any time.
4. **Data Isolation & Sign-Out Hygiene**: Signing out clears private account-backed data from the local device cache so that subsequent guest or secondary account sessions do not leak private data.
5. **No Domain Cross-Contamination**: Checking off a shopping item records a purchase on the shopping list; it **never** silently updates Kitchen Check inventory. Ingredient availability must always be confirmed separately by the cook.

---

## 2. Data Ownership Matrix

| Data Type                   | Anonymous / Guest Storage                           | Authenticated Account Storage              | Synchronization Strategy                           | Conflict Resolution                                                                                            |
| :-------------------------- | :-------------------------------------------------- | :----------------------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Recipe Catalog**          | Static code / Cached CDN                            | Public Supabase table (`recipes`)          | Read-only public catalog                           | Server is authoritative.                                                                                       |
| **Saved Recipes**           | Local `localStorage` (`kooking:saved:v1`)           | Account-backed (`public.saved_recipes`)    | Merged on sign-in; synced bidirectionally          | Set union by `recipe_id`. Deduplicated automatically.                                                          |
| **Personal Shopping Lists** | Local `localStorage` (`kooking:lists:v1`)           | Account-backed (`public.shopping_items`)   | Optimistic local updates; background sync          | Item-level Last-Write-Wins using `updatedAt` timestamps. Stable IDs prevent duplicates.                        |
| **Active Cooking Sessions** | Local `localStorage` (`kooking:sessions:v1`)        | Strictly Device-Local                      | Not synced across devices                          | Active timers and step progress remain on the device currently cooking to prevent latency and timer skew.      |
| **Cooking History**         | Local `localStorage` (`kooking:cooking-history:v1`) | Account-backed (`public.cooking_history`)  | Recorded upon completion/ending; synced on sign-in | Immutable log entries identified by `session_id`. Merged by session ID union, newest first.                    |
| **Kitchen Check Records**   | Local `localStorage` (`kooking:kitchen-check:v1`)   | Strictly Device-Local                      | Not synced                                         | Kitchen inventory is tied to physical surroundings and must be confirmed explicitly per session.               |
| **Cooking Preferences**     | Local `localStorage` (`kooking:prefs:v1`)           | Account-backed (`public.user_preferences`) | Synced upon login and preference update            | Latest setting wins. Only functional cooking preferences persisted (servings, screen-wake, sound, read-aloud). |

---

## 3. Data Type Details

### A. Personal Shopping Lists

- **Item Origins**:
  - `recipe`: Shortages generated from Kitchen Check. Uses deterministic ID `shop:${recipeId}:${lineId}`. If a recipe is checked again, existing items are updated rather than duplicated.
  - `personal`: Manually added items. Uses unique ID `item_${uuid}`. Open personal items with matching names and compatible units are merged with additive quantities; incompatible units stay separate.
- **Recipe Links**: Recipe origin items retain `recipeId`, `recipeSlug`, `recipeTitle`, and `servingsContext`.
- **User Edits**: If a cook edits name, quantity, or notes of a recipe item, `userEdited: true` is set so subsequent Kitchen Check generations preserve the cook's custom values.
- **Sync Behavior**:
  - When authenticated, the client compares local and remote item lists using item-level `updatedAt` timestamps.
  - Deletions and checkbox toggles are tracked with timestamps to avoid resurrecting deleted items.
  - Optimistic local-first UI with non-intrusive status badges ("Saved to device" for guest, "Synced with account" for authenticated user).

### B. Cooking History vs. Active Sessions

- **Active Sessions**: Stored in `kooking:sessions:v1` with timers and step snapshots. An active cooking session belongs to the specific device in the kitchen.
- **Session Status**:
  - `active` / `paused`: Resumable on that device.
  - `completed`: Successfully finished via `finishCooking`.
  - `abandoned`: Explicitly ended by the cook before completion.
  - `interrupted`: Session was interrupted (e.g. abandoned when a new session was started, or expired).
- **History Log**:
  - Once a session is finished, an entry is written to `CookingHistory`.
  - Contains: `sessionId`, `recipeId`, `recipeTitle` (snapshot), `recipeSlug`, `contentVersion`, `servings`, `status`, `startedAt`, `completedAt`, `durationMinutes`, and step counts.
  - Does **not** classify interrupted sessions as completed merely because a browser was closed.
  - Does **not** include social feeds or public activity.

### C. Cooking Preferences

Only functional preferences that directly affect the cooking experience and that Kooking can consistently honor are persisted:

1. `defaultServings`: Preferred default portion size for recipes.
2. `screenWake`: Whether Cooking Mode requests screen wake lock (defaults to true).
3. `soundAlerts`: Whether timer alarm plays chime sound (defaults to true).
4. `readAloud`: Whether steps are read aloud when advancing (defaults to false).

**Strict Privacy Constraint**: No health, allergy, dietary, or sensitive personal profiles are collected or stored in this system.

---

## 4. Security & Row Level Security (RLS)

All account-backed tables in Supabase (`public.saved_recipes`, `public.shopping_items`, `public.cooking_history`, `public.user_preferences`) enforce zero-trust Row Level Security:

```sql
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shopping items"
  ON public.shopping_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- `auth.uid()` is verified from the cryptographic JWT signed by Supabase Auth.
- Client-provided user IDs are rejected if they mismatch `auth.uid()`.
- Anonymous guests never communicate directly with private tables.

---

## 5. Account Sign-Out & Isolation

When a user signs out:

1. Active Supabase auth tokens are revoked.
2. Account-backed local memory and cache are flushed (`clearAccountLocalData()`).
3. Local shopping list and history revert to pristine guest storage.
4. Prevents cross-account data leakage on shared tablets or family devices.
