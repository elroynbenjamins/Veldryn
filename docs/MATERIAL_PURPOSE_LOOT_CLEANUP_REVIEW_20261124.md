# Material purpose and gold-only loot cleanup — first audit (2026-11-24)

Status: **review only, no live removals authorized by this record**. Do not deploy, modify existing inventories, enable Equipment 2.0 or interpret the absence of a text reference as proof of disuse. User direction: materials must have a genuine gameplay use; truly obsolete drops should become gold rather than inventory clutter. Preserve old inventory IDs and sellability.

## Findings and scope

Screened 75 literal `type:'material'` rows defined directly in `apps/mobile/src/content/items.ts`; 40 occur in the mobile monster catalogue. 56 appeared in the first group of crafting/recipe source files (references, not necessarily consumer evidence); 19 did not. This is not the complete expanded ITEMS catalogue: imported herbs, guild/cross-profession components, raw gems and generated content need enumeration. Neither mobile source rates nor the current main branch prove deployed server behavior.

First group: `content/skills.ts`, `content/equipment-recipes-v33.ts`, `content/alchemy.ts`, `content/gathering-tools.ts`, `content/novice-sets.ts`, `content/cross-profession-components.ts` (all under apps/mobile/src). Follow-up: equipment enhancement, companion config, guild components/construction, quests, backend companion content and guild projects, regional resource mapping, equipment processing/material profiles, selected event and faith files. Read-only production guild project supply catalogue lookup for the unresolved IDs plus Runebound Core returned no rows; this does not rule out other guild sinks.

## The 19 initial flags

| Material ID | Review outcome | Evidence / blocker |
|---|---|---|
| ASTERFALL_MINERAL_ESSENCE | Protect | equipment-enhancement.ts substitutes it in early upgrade requirements |
| TEMPERING_CORE | Protect | equipment-enhancement.ts consumes cores when quote requires them |
| ECHO_TOUCHED_PELT | Protect | guild-components.ts: Guild Seal Wax, Beacon Oil inputs |
| LANTERNSTEEL_SHARD | Protect | combat-companions.ts: Lantern Wisp progression definition |
| BANNER_ASH | Protect | combat-companions.ts: multiple Ashlands companion ascensions |
| REGENT_SIGIL | Protect | combat-companions.ts: UNIT_024 Prestige Mastery cost |
| OATHGLASS_FRAGMENT | Protect | combat-companions.ts: Mastery Chamber and companion costs |
| GLOAM_DUST | Protect | combat-companions.ts: Gloamknife Shade ascension definition |
| RUNEBOUND_CORE | Protect | combat-companions.ts: Runebound Sentry ascension, Expedition Pens upgrades |
| SAFFRON_REED | Hold | equipment-resource-map-v25.ts regional resource binding |
| MIRAGE_BLOOM | Hold | same regional resource map |
| CHARBARK | Hold | same regional resource map |
| ROYAL_CHITIN | Hold | same regional resource map |
| TYRANT_SEAL | Hold | same regional resource map |
| BELLFIN_SCALE | Hold | same regional resource map |
| WYRMSCALE | Hold | same regional resource map |
| FROZEN_HEART | Hold | same regional resource map |
| EVENT_BONDBLOOM | Hold | explicitly companion-related in resource-codex.ts; exact active sink not verified |
| ECHO_BAT_WING | Candidate only | monster drop and item definition; no exact consumer in inspected recipe, upgrade, companion, guild, quest, event or 2.0 manifest files; not cleared for removal |

Totals: 9 protected by specific definitions, 9 held pending further dependency checks, 1 candidate, 0 approved replacements. Protected includes definitions that must be reconciled with server runtime before any UI claim that an activity is currently available.

## Runebound Core — correct the inspector, not the loot

`apps/mobile/src/content/combat-companions.ts` lines 54, 85: Sanctuary Expedition Pens requires 6, 12 and 20 cores at levels 1–3 respectively (38 total), along with gold and essence. Runebound Sentry specifies RUNEBOUND_CORE as ascensionMaterialId. Keep the drops from Runebound Miner and Fallen Sentinel.

`core/resource-codex.ts` already builds companion use labels from definitions (around lines 78–104), but `core/item-inspect.ts` only builds recipe-based `usedIn` navigation, and `components/ItemQuickInspect.tsx` uses that model. Add structured, availability-aware material consumers shared by both screens rather than the Codex's generic fallback or duplicated strings. Display Used for above How to get, with exact quantities and valid destination where implemented. Do not surface unreleased content. If no verified consumer exists, distinguish unresolved from confirmed obsolete. Preserve inventory actions and existing translation conventions.

## Echo Bat Wing candidate

`items.ts` assigns 80 gold vendor value. `monsters.ts` lists Echo Bat with raw 0.28 chance, quantity 1–2. Do NOT use the raw client chance as the live rate; effective runtime rates and bonuses may differ. If and only if confirmed unused, replace the existing authoritative loot roll with 80 gold times its actual rolled quantity, with no separate gold roll, no double grant and no second multiplier. A successful quantity-1 drop would award 80 gold, quantity-2 would award 160 gold. No item is minted for that roll. Preserve historical stacks, item identity and ordinary sell action. If an existing inventory cap or economy rule affects realizable sales, reconcile actual gold faucet impact before approving.

## 2.0 boundary

Inspected PR #1713 branch `review/eq2-authored-boss-threeway-mint-gates-20261124`: the three hidden server manifests (base, armament, expansion), material origins and material source review contained no exact token or spaced name for the eleven remaining/Runebound IDs checked. This is not a full dependency check: mapped IDs, components, latest T5 work, pending T5–T9 recipes and later releases remain unresolved. #1711/#1713 explicitly review-only/non-issuable; do not activate or expose them as current consumers. Protect any confirmed future material until its drop timing is decided.

## Required next pass before any loot change

1. Enumerate the entire resolved active catalogue, not just literal base rows; identify all currently obtainable monster, boss, dungeon, gathering, quest, shop, expedition, event and salvage sources with server release gates.
2. Reverse-index active recipe inputs, enhancement/merging, companions, guild construction/projects/supplies, donations, faith, unlocks, exchanges, quests and event costs. Separate producers, consumers, metadata and tests. Include hidden 2.0 manifests and their material aliases as a separate protected/planned layer. Never equate reward references, localization or artwork with a sink.
3. Inspect authoritative `backend/supabase/functions/gameplay/index.ts` and generated recipe catalogues. Connector returned empty/unsupported content for the large gameplay source and 1.5 MB mobile equipment JSON; production Edge Function retrieval also failed. These are blocking gaps, not evidence of absence.
4. Reconcile server drop chance, quantities, modifiers, caps, online/offline/AFK reward paths and current production balances. Only approve a gold replacement where all consumers and dependencies are excluded and the economy impact is bounded.
5. Use one versioned server-authoritative replacement policy across all grant paths; client source preview/loot history and Codex must match. Preserve current ownership; no auto-sell migration and no account balance changes. Tests: deterministic roll parity, qty ranges, failed roll, gold receipt/idempotency, duplicate retry, online/offline parity, inventory-full behavior, unchanged ordinary loot and historical inventory reads.
6. Review source-backed item-purpose UI separately and gate unreleased entries. Release approval required before any production mutation.

No gameplay source, database, live loot table or player inventory was modified by this review.
