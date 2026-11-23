# Veldryn 2.0 — Collapsible skill tools and per-tier reserve

> Staging implementation only (draft PR #1680, based on draft PR #1644).
> Keep the coordinated 2.0 release gate. Do not deploy or merge to the live game before full UX/theme review and CI parity.

## Player interaction

- A gathering skill defaults to **Tool Tiers · Select to Inspect** and T1–T4 icon slots only.
- Selecting a tier expands the **Saved Tools / Bonuses / Recipe** tabbed details; selecting it again collapses them.
- **Show combined bonuses** is an optional disclosure inside the expanded tier.
- Tier button status is the number of saved copies (0/2, 1/2 or 2/2), not the number contributing bonuses.
- The current gathering activity controls remain below the tool section. Responsive touch targets are at least 44 px; theme colors derive from the existing Blackout, Ember and Paper Mint tokens.
- Exactly two character-bound physical copies per gathering tier: one active and one saved reserve. Neither occupies Inventory capacity while stored.
- Only the active copy contributes tier speed/rarity/XP; reserve effects are zero until activated.
- Skill XP rolls affect only the tool's gathering skill and stack across distinct active tiers; retained 2.0 cap is +60%. Effective gathering reduction remains capped at 80%.

## Authoritative storage and commands

- Existing `equippedToolIdsByTier` and `equippedToolInstanceIdsByTier` represent the active tool. Legacy `equippedToolIds` is still a compatibility mirror.
- New optional `savedToolIdsByTier` and `savedToolInstanceIdsByTier` retain the single reserve copy for each tier without a separate inventory stack. Legacy untracked copies remain unrolled.
- `tool_vault_save`: consume an exact selected Inventory copy into an empty reserve slot.
- `tool_vault_activate`: atomically swap active and reserve with no Inventory capacity requirement. Claim/settle active gathering progress before applying the new copy's roll.
- `tool_vault_withdraw`: move a reserve to Inventory with a capacity check. A rejected command must not mutate ownership.
- `equip_tool`: from Inventory, use an empty tier as active; replacement of active prefers moving the previous active to a free reserve slot; if both slots are occupied, returning the previous active to Inventory requires space.
- `unequip_tool`: remove active; if reserve exists, promote it to active and return the old active to Inventory (subject to capacity).
- Crafted receipts remain immutable and character-aware, and the global custody audit checks Inventory, Bank, other characters, active tools and reserve tools for duplicate instance IDs.
- On character deletion, recover all active tiers and saved reserve copies to Bank/Overflow, preserving original instance receipts.
- Legacy saves with one best-tool pointer are implicitly preserved, and adding a new tier seeds the old equipped tier rather than discarding it.

## Guardrails and polish checklist

- [x] Collapsed tier-first screen with independent tabs and combined totals disclosure
- [x] Draft-only command handlers and exact-copy two-slot storage
- [x] Validate saved roll identity, blocked third saves and inventory-full reserve withdrawal
- [x] Preserve old saves and run character-deletion item recovery
- [x] Expand eight-language text keys in the new UI and related item inspection
- [x] Synchronize generated gameplay/co-op Edge bundles on the isolated staging branch
- [ ] CI core regression suite and all release gates green; check draft PR before merging
- [ ] Device-based narrow viewport / large-font screenshots across all three themes
- [ ] Authoritative online integration and market custody verification in coordinated 2.0 release pass

## Non-goals

- No changes to unrelated combat/profession progression requirements or the unreleased T5–T9 tool catalog in this UI pass.
- No release, deployment, migration to production, or merge to `main` without explicit approval.
