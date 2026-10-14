# Kooking — Responsive QA Checklist (Phase 5)

Run this checklist every phase. Without browser automation, execute it as: production build → serve → visit each route at each width (devtools device emulation) → static audit for overflow/targets. Record the result in the phase report.

## Mobile (320 / 375 / 390 / 430)

- [ ] No horizontal overflow at 320px (no fixed pixel widths; grids use `minmax(0,1fr)`; long labels truncate)
- [ ] Body copy ≥15px, steps/instructions ≥16px, inputs 16px (no iOS zoom)
- [ ] Touch targets ≥44px (tabs 56px rows, sidebar 48px, stepper/timer/icon buttons 44px)
- [ ] Bottom tabs reachable, labels visible, active state obvious without color alone
- [ ] Header never wraps into two rows; brand + exit fit at 320px
- [ ] Safe-area: tab bar clears home indicator, header clears notch (`env()` rules present)
- [ ] Scroll: content clears fixed chrome (`pb-32` on touch layouts); cook views never trap scroll

## Tablet (768 / 1024 portrait)

- [ ] Width used, not just stretched mobile: two-column cards/inputs where appropriate
- [ ] Content sizing sensible (no giant single column, no postage-stamp cards)
- [ ] Spacing steps up (gutters 24px, section gaps 32px)
- [ ] Bottom tabs still thumb-friendly; nothing overlaps at 768px

## Desktop (1280+)

- [ ] Max content widths hold (1120 main / 720 focused); reading lines stay comfortable
- [ ] Sidebar visible, full labels, active route marked with `aria-current`
- [ ] Spacing balanced (gutters 32px, section rhythm consistent)
- [ ] No excessively wide text blocks (`max-w-prose` on body copy)

## Accessibility (every width)

- [ ] Full keyboard path: skip link → nav → content → actions; visible 3px focus ring
- [ ] Landmarks: `header`/`nav`/`main`; one `h1` per page; `aria-current="page"` on active
- [ ] Icon-only buttons named; status conveyed by icon + text, never color alone
- [ ] Contrast: ink-900 on primary-500/600 (never white), white on ink-900, ink-900/ink-500 on white and surface-100, status-700 on status-100
- [ ] Flat: no shadows, gradients, blur, or bold (700+) weights
- [ ] `prefers-reduced-motion` respected; timers numeric, never animation-dependent
- [ ] Zoom to 200%: no clipped controls, no overlap, no lost functionality

## Performance (every phase)

- [ ] No new runtime dependency without a written justification
- [ ] No data fetching in render loops; derivations memoized or moved to domain functions
- [ ] Images (when they arrive): sized, with placeholders; loading states for every fetch
- [ ] `next build` output reviewed: route sizes stable, no unexpected client bundles
