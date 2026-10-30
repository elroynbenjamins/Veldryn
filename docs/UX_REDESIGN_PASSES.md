# UX redesign passes

This sequence preserves game-state, reward, and server-authority behavior. Each pass is independently releasable and needs a narrow phone, large-text, reduced-motion, and touch-flow check before the next one starts.

## Pass 1 — Inventory decisions

- Keep search and storage selection visible.
- Move category, sort, and per-item action amount into one `View & actions` sheet.
- Keep bulk actions opt-in through Select mode; do not alter protection or transaction rules.

## Pass 2 — Start an activity

- Give gathering and combat one unambiguous recommended/selected primary action.
- Add explicit lock affordances for unavailable resources and regions.
- Keep detailed rewards available but secondary to starting play.

## Pass 3 — Dungeon and guild navigation

- Add drill-in affordances and intentional empty states to dungeon preparation.
- Replace clipped Guild section tabs with an accessible compact overflow pattern.

## Pass 4 — Equipment, gems, and icon polish

- Prevent enhancement-cost truncation at narrow widths.
- Lead with compatible recommended gems, then provide grouped/sorted choices.
- Add only missing functional icons: locks, chevrons, party-empty, and horizontal-overflow cues.

## Pass 5 — Background loading

- Render cached/local state before non-critical refreshes.
- Add TTL-based, tab-aware prefetching and keep stale content visible while refreshing.
- Retain blocking confirmation for authoritative reward, inventory, currency, and co-op mutations.

## Pass 6 — Motion and device QA

- Apply one shared short interaction cadence for selection, sheets, and progress changes.
- Respect Reduce Motion everywhere; avoid new decorative loops.
- Profile startup, inventory, combat, and guild flows on a low-end Android device before expanding visual effects.
