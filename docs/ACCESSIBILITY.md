# Accessibility

Target: WCAG 2.2 AA where it applies. This is a working standard, not a
certification. Automated checks pass, but automated rules catch only part
of what matters, so the manual checks below are part of the bar.

## How it's checked

**Automated (runs in `npm test`)**

- `shared/testing/axe.ts` runs axe-core (WCAG 2.0/2.1/2.2 A + AA and best
  practice) on components mounted in jsdom. Covered: Cooking Mode in normal,
  paused and error states with every slot filled; timer cards in every state;
  read-aloud, voice and screen-wake controls in every state; Kitchen Check
  rows in every answer state; shopping rows and the add-item form, including
  its error state; Modal and BottomSheet while open; state cards.
- Behaviour tests in the same files cover focus moving into dialogs and back
  out, the Tab trap, Escape, timer focus retention, what gets announced, error
  association and focus on the first invalid field.
- `shared/ui/contrast.test.ts` computes contrast for every text and background
  token pair the app uses, straight from `app/globals.css`.

**Not automatable in jsdom (documented exceptions)**

- `color-contrast`, `target-size` and `region` are disabled in the jsdom axe
  run. jsdom has no layout, and fragments aren't pages. Contrast is covered by
  the token test and by axe in a real browser; 44px targets by class assertions.

**Manual (repeat before a release)**

- Run axe in Chrome on Home, Explore with the filter sheet open, recipe
  detail, Kitchen Check with answers, Shopping List with items and an error,
  Saved, Profile and Cooking Mode. Expect no violations, contrast included.
- Use the real keyboard: Tab order on Kitchen Check and Cooking Mode, a
  visible ring on every stop, opening a sheet with Enter, Tab staying inside,
  Escape closing it, and focus returning to the trigger.
- Check reflow at 320px wide, at normal text and with the root font at
  175–200%. There should be no horizontal page scroll; the Cooking Mode
  controls wrap.

## Patterns to keep

- **Names contain the visible text** (WCAG 2.5.3). Prefer the visible text plus
  `sr-only` context over an `aria-label` that says something different.
- **Announce events, not ticks.** Timer countdowns are `aria-hidden` with a
  static text alternative. One polite region per timer says "started",
  "paused", "resumed", "stopped" or "time's up". Don't wrap a countdown in
  `aria-live`.
- **Don't drop focus.** When a control replaces itself (Start → Pause timer),
  move focus to its replacement. Use `aria-disabled` rather than `disabled`
  on a control that can become unavailable while focused (stepper limits).
- **Dialogs use `useDialogFocus`.** It moves focus in, traps Tab, closes on
  Escape, restores focus and locks scroll. Modal and BottomSheet share it.
- **Font sizes are `rem`.** Users' text-size settings must work. Touch-target
  widths that must hold at 44px use CSS `px`, so large text can't push them
  off a small screen.
- **Status is text plus an icon.** Missing, ready, bought, done, listening and
  screen-on states are never colour alone.
- **On dark surfaces, add `on-dark`** to the wrapper, so the focus ring uses
  primary-400 (11:1) instead of the blue (3:1).
- **Text never goes below `white/50` on the dark surface.** `white/40` fails on
  panels and chips; the contrast test enforces this.
- **Nothing important times out.** Voice feedback stays until the next command
  or until the mic is turned off.

## Known gaps

- No screen-reader run (VoiceOver, TalkBack, NVDA) has been done. Announcements
  were verified by the DOM (roles, live regions, names) only.
- Reduced motion is enforced globally in CSS and checked by a test, but it
  wasn't checked with the OS setting turned on.
- Deleting a shopping item from the edit sheet returns focus to the page,
  not to a neighbouring row.
- At 200% text on a 320px phone, Cooking Mode's fixed controls can take about
  half the screen height. Everything is still reachable, but there's little
  room left for reading.
- The design-system showcase page (`/design-system`) is a developer page and
  wasn't audited.
