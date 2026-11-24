# Material purpose and unused loot cleanup — first audit (2026-11-24)

Status: **review only, no live removals authorized by this record**. Do not deploy, modify existing inventories, enable Equipment 2.0 or interpret the absence of a text reference as proof of disuse. User direction: materials must have a genuine gameplay use; truly obsolete drops should be removed outright rather than replaced with separate gold drops; review ordinary base gold separately only if necessary. Preserve old inventory IDs and sellability.

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

Totals: 9 protected by specific definitions, 9 held pending further dependency checks, 1 candidate, 0 approved removals. Protected includes definitions that must be reconciled with server runtime before any UI claim that an activity is currently available.

## Runebound Core — correct the inspector, not the loot

`apps/mobile/src/content/combat-companions.ts` lines 54, 85: Sanctuary Expedition Pens requires 6, 12 and 20 cores at levels 1–3 respectively (38 total), along with gold and essence. Runebound Sentry specifies RUNEBOUND_CORE as ascensionMaterialId. Keep the drops from Runebound Miner and Fallen Sentinel.

`core/resource-codex.ts` already builds companion use labels from definitions (around lines 78–104), but `core/item-inspect.ts` only builds recipe-based `usedIn` navigation, and `components/ItemQuickInspect.tsx` uses that model. Add structured, availability-aware material consumers shared by both screens rather than the Codex's generic fallback or duplicated strings. Display Used for above How to get, with exact quantities and valid destination where implemented. Do not surface unreleased content. If no verified consumer exists, distinguish unresolved from confirmed obsolete. Preserve inventory actions and existing translation conventions.

## Echo Bat Wing candidate — removal only

`items.ts` assigns 80 gold vendor value. `monsters.ts` lists Echo Bat with raw 0.28 chance, quantity 1–2. Do NOT use the raw client chance as the live rate; effective runtime rates and bonuses may differ. If and only if confirmed unused, remove the authoritative loot entry outright and remove it from all corresponding client loot previews and source indexes. Do not add a replacement gold entry, hidden bonus roll, or automatic compensation. Keep the monster's ordinary gold reward unchanged by default; if actual economy impact warrants a base-gold adjustment, review it separately. Preserve historical stacks, item identity and ordinary sell action.

## 2.0 boundary

Inspected PR #1713 branch `review/eq2-authored-boss-threeway-mint-gates-20261124`: the three hidden server manifests (base, armament, expansion), material origins and material source review contained no exact token or spaced name for the eleven remaining/Runebound IDs checked. This is not a full dependency check: mapped IDs, components, latest T5 work, pending T5–T9 recipes and later releases remain unresolved. #1711/#1713 explicitly review-only/non-issuable; do not activate or expose them as current consumers. Protect any confirmed future material until its drop timing is decided.

## Required next pass before any loot change

1. Enumerate the entire resolved active catalogue, not just literal base rows; identify all currently obtainable monster, boss, dungeon, gathering, quest, shop, expedition, event and salvage sources with server release gates.
2. Reverse-index active recipe inputs, enhancement/merging, companions, guild construction/projects/supplies, donations, faith, unlocks, exchanges, quests and event costs. Separate producers, consumers, metadata and tests. Include hidden 2.0 manifests and their material aliases as a separate protected/planned layer. Never equate reward references, localization or artwork with a sink.
3. Inspect authoritative `backend/supabase/functions/gameplay/index.ts` and generated recipe catalogues. Connector returned empty/unsupported content for the large gameplay source and 1.5 MB mobile equipment JSON; production Edge Function retrieval also failed. These are blocking gaps, not evidence of absence.
4. Reconcile server drop chance, quantities, modifiers, caps, online/offline/AFK reward paths and current production balances. Only approve removal where all consumers and dependencies are excluded and the economy impact is understood.
5. Remove approved obsolete entries consistently across server grant paths; client source preview and Codex must match. No separate gold loot entries or hidden compensation rolls. Preserve current ownership; no auto-sell migration and no account balance changes. Tests: absence of removed drops, unchanged remaining item probabilities and quantities, unchanged ordinary gold, duplicate retry, online/offline parity, inventory-full behavior and historical inventory reads.
6. Review source-backed item-purpose UI separately and gate unreleased entries. Release approval required before any production mutation.

No gameplay source, database, live loot table or player inventory was modified by this review.
