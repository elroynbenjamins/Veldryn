# Party Events V59–V60 — two hidden integration passes and UX polish

Date: 2026-11-19. Source PR: #1407. Status: **draft, unmerged, not enabled, no production grants**.

## Pass 1 — Equipment/Combat 2.0 interop (V59)

- All eight authored V51 sets / 20 pieces retained: for each of four events, a universal three-piece signature set (boots, gloves, cape) and a two-piece support set (ring, amulet).
- New V59 compiler reads only a **server-authenticated equipped-instance snapshot** with character ownership and valid slots. It will not treat collected-but-unequipped gear as active.
- Set thresholds apply at 2/3 or 2 only, with tier-separated counts. No T2+T3 mixing and no hidden class-lock.
- Maps stat bonuses into Equipment 2.0 fractional units: haste and crit chance percentage points; relative crit damage, HP, healing and ability damage; advanced penetration percentage points. This module outputs effects for a future combined engine, **not** current CombatStats mutation.
- Four conditional effects have a deterministic server-state projection: Wayfarer's momentum (6 sec, 12 sec internal cooldown); Moonfang elite execute below 30% HP; Runebound low-HP barrier (6 sec, 20 sec internal cooldown); Echoheart 8% server-roll cooldown refund (18 sec internal cooldown). Static catalogue effects are not converted into permanent buffs.
- Hardened unapproved proc metadata, invalid time/range, wrong owner/slot, duplicate slot/instance, disabled Combat 2.0 and tier-mixed tests.
- **Cross-PR blocker:** Combat/Classes 2.0 #1377 currently rejects role-unrestricted set instances and its set compiler accepts only its own tiered set families. It also does not yet consume V59 ability-damage, penetration and proc hooks. Adapt the combined server build validator, authored set policy and actual combat event processing during **joint** 2.0 integration; do not fork or override the live formulas now.

## Pass 2 — Atomic claim boundary and mobile treasure design (V60)

- New V60 private, **unmounted** reward transaction interface, taking verified evidence from the existing server tables INSIDE a locked account/week transaction; no player-submitted points, tiers, RNG, inventory or balances.
- Chest claim uses immutable source `party-event:<week>:<account>:<kind>`, frozen HMAC entropy V1 and V51 missing-piece selection. The item's rarity/quality/affix instance must come from a **future finalized Equipment 2.0 issuer**, not the UI or chest resolver.
- Same transaction must store a unique first-write-wins receipt, existing Party Sigils, gold, gem dust, companion essence, and any exact item instance. Retries replay the existing receipt, including after a secret rotation; they cannot mint or credit twice.
- Targeted exchange requires an earned participation event, verified collection, 60 **existing** Party Sigils and a missing piece; one `...:exchange` receipt per account/week. Same-piece retry returns original receipt; changing target after exchange fails. Party Sigils accumulate across eligible weeks, rather than a new wallet.
- Added an **actual Results-tab UI section** in the developer-only mobile preview: three labeled chests with 12%, 16%, 24% baseline Standard gear chances; two story-specific sets with 3+2 pieces; set threshold guidance; 60-Sigil exchange info. Unknown entitlement/collection/balance is shown as **unverified**, not 0 or already owned. All claim/open/exchange controls are disabled. Existing Day 8 settlement remains separate.
- V60 tests use a transactional fake store proving concurrent replay, full rollback on resource failure, entropy rotation, three reward sources, a single targeted exchange, ownership checking and malformed minted gear rejection.

## Required before this is a real feature

1. Reconcile #1407 with the latest main and the hidden Party Event canonical activity writer #1388; install and verify private source and Day 8 entitlement schema on staging first (not production).
2. Implement a real DB adapter with SERIALIZABLE account-week locking, cross-worker race resistance, immutable source uniqueness, atomic inventory rows/Inbox and existing wallet ledger debits. The V60 interface alone does **not** create SQL tables or guarantee real DB atomicity.
3. Bind the final, versioned Equipment 2.0 item issuer for tier/rarity/quality/affix and exact copy ownership. Resolve the current Equipment 2.0 draft T1–T4/T1–T5 versus event tier T1–T9 compatibility before paying any gear.
4. Integrate event sets into the jointly approved Equipment/Class/Enemies 2.0 authoritative encounter, skill triggers, CP policy and proc replay; avoid current dungeon changes.
5. Extend the private status endpoint with owner-scoped and expiring chest+inventory+wallet reward snapshot, then wire real mobile collected/earned/claimed indicators. Review small Android widths, TalkBack, motion, localization across eight languages, failed claim states and safe replay.
6. Run focused CI **and** full backend/mobile/economy/security gates, staging SQL replay/rollback/concurrency, account erasure review, and developer-approved release go/no-go. Keep all event tabs hidden until those are verified.

No World Boss gathering item templates, 1% chest drop chances, World Sigil earnings or boss equipment rolls were changed in these two passes.
