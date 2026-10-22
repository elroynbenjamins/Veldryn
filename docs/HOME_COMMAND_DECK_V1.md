# Home Command Deck & Add-to-Queue sheet (v1.0)

Implemented on the native Home screen using the existing theme tokens, region/character artwork, activity renderer and queue command API.

## Hierarchy
1. Small region and character hero (existing HomeAdventureHeader).
2. Active activity with reward collection (existing ActivityCard).
3. Urgent actionable alert if one exists.
4. ActivityQueuePanel, which now presents Add activity even if empty; existing manage/reorder/remove/clear/start controls stay authoritative.
5. Command Deck: Guild Hall or Find a Guild once unlocked, Activity Queue, unlocked Dungeons and Contracts, and Forge.
6. Compact ready-to-claim summary; remaining progression panels continue under disclosures.

## Home Add-to-Queue sheet
- Opens in GameModalSurface as a bottom sheet, never replaces a live activity just by selecting a target.
- Combat: current-region, unlocked non-boss enemies; goals: 50/100 session defeats, 15/30 minutes, or no auto-stop.
- Gathering: current-region, unlocked gathering/herbalism nodes; goals: 100/250 total in storage, 15/30 minutes, next skill level, or no auto-stop. Default is 30 minutes to avoid unintentionally completing an item-storage target using existing items.
- Crafting: only Alchemy recipes unlocked by skill level. Alchemy queues one reservation and can pause if ingredients/Gold are missing. The independent Cooking and equipment-Forge systems are **not** presented as queue-compatible.
- Queue limit and readiness derive from activityQueueCapacity, normalizeActivityQueue, queuedActivityReadiness and queuedActivityPlanningReadiness.
- For the first new queue entry, preview a potential handoff using enqueueActivity and activityQueueHandoffStatus. The source active activity must have an end trigger (duration/goal/idle rule/finite reservation); it is not automatically stopped by queue creation.
- When the active activity lacks a handoff, users can explicitly set a 30-minute goal via queue_set_goal (only for supported combat/gathering kinds). Do not silently change the current activity.
- Existing server-authoritative command routing is retained for queue_add and queue_set_goal. Do not use client-side optimistic queue confirmations.
- Keep food, injury, inventory overflow and region/unlock blockers visible. 'Ready' is not a guarantee of combat survival or future resource availability.
- When no activity is running, the queue remains pending until the player uses Start next. Do not automatically replace the active session on 'Add'.

## Deliberate limitations / follow-up
- Faith and Exploration remain supported by the engine, but are not yet exposed as separate selectors in the first Home sheet.
- Guild shortcut opens the existing Guild screen rather than duplicating its server-owned project/token state.
- Translate new UI copy through existing localization catalogues before broad international rollout.
- Verify Android small-screen / large-font layouts, screen readers, offline goals, online queue commands and timed handoff behavior on staging.

## Smoke checklist
- Empty/partial/full queue, slots 2 and 3.
- Same-region unlocked enemy; locked/out-of-region exclusion; no boss quick queue.
- Gathering storage baseline, duration goal, and next-level goal.
- Alchemy missing ingredients planning vs runtime readiness.
- Source open-ended activity with and without idle rules; user-confirmed 30-minute goal.
- Existing queue already has entries: new entry is appended, not jumped ahead.
- Offline and online queue add failure leaves sheet visible and does not claim success.
- Guild locked/unlocked; member/nonmember.
- Blackout, Ember, Paper Mint; font scaling and safe-area.
