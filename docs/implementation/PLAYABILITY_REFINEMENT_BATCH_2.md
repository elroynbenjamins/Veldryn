# Playability refinement batch 2

Ten refinements implemented:

1. Map/list region browser with a horizontally scrollable minimum-width map on narrow screens.
2. Locked-region inspection without enabling locked encounters.
3. Selected region retained when changing app tabs, plus a return-to-active-region shortcut.
4. Next-region unlock guide and levels remaining. Greenfields' displayed range includes its existing level-20 encounter.
5. Encounter name search, available-only filtering and a clear-filter empty state.
6. Clear base-rate XP labels, correct boss level/quest access and defeated-boss button state.
7. Stop/switch automatically settles earned rewards before changing activity. Boss challenges also settle the current activity first.
8. Activity status reflects stopped combat, projected HP, food consumed and recovery guidance; zero-kill stopped combat can still be settled.
9. Gathering/crafting tabs, output previews, inventory-plus-bank material counts, eligibility checks, craftable-only filter and crafting feedback. Eligibility calls the same pure craft operation, including output-capacity checks.
10. Home shortcuts to World, Skills, Inventory and completed quests, with a completed Fallen Knight milestone message.

Supporting safety: failed local saves now show a warning rather than an unhandled promise rejection. Progress remains in memory; subsequent game actions attempt to save again. This is not a durable offline retry queue.

No economy, reward-rate, save-schema or combat-balance changes. Tests cover activity reward settlement, duplicate-claim prevention, invalid transitions, offline cap, bank materials, storage/gold gates, search, region unlock ordering and boss access. TypeScript and existing core regression suites pass. Physical-device layout and interaction QA is still outstanding.
