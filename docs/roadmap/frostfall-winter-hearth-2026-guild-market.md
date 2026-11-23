# Frostfall 2026 — Winter Hearth Guild Christmas Market (review-only)

**Status:** owner-approved concept; source design and pure rules only. **Not released, merged, deployed or visually approved.** No change to production flags, existing global festival rewards, Guild Boss, live crafting, UI, season schedule, or existing saves.

## Scope and lifecycle

- Replace Frostfall's proposed shared **Winter Hearth** community progress with one permanent **guild-owned 2026 Christmas Market construction project per guild**, separate from the weekly rotating guild project and the Frostbell Herald seasonal Guild Boss.
- Event ID `EVT_ANNUAL_012_2026`; construction donations only **2026-12-03T00:00:00Z inclusive** through **2026-12-27T00:00:00Z exclusive**. December 27–28 are claim-only: no new donations or combat/skill buff accrual.
- No automatic activation by calendar date. Keep `FROSTFALL_REWARDS_RELEASED=false` and `EVENT_COMMUNITY_ENABLED=false`; new `WINTER_HEARTH_GUILD_RELEASED=false` when runtime is wired.
- Guild creation/join requirement follows current guild rules; allow any current guild member to contribute. Project progress, bank Gold and completed 2026 guild color belong to the guild, not a departing player.
- **Disable Frostfall's original 100,000-point global community track** once this guild replacement is wired and separately approved. Do not change Veilbreak/global events or overwrite historical community rewards.

## Construction tracks (both required)

| Track | Guild goal | Account-wide weekly donation cap | Eligible inputs |
|---|---:|---:|---|
| Timber framework | **25,000 logs** | **2,500** logs | Existing genuine Woodcutting outputs only: `GREENWOOD_LOG`, `IRONWOOD_LOG`, `CROWNWOOD_LOG`, `DUNEWOOD`, `WHITEPINE_LOG`, `CINDERWOOD_LOG`. (Six distinct item IDs across seven+ nodes.) |
| Festive lighting | **2,500 Christmas Lights** | **250** finished lights | New event-only crafted item `FROSTFALL_CHRISTMAS_LIGHTS_2026` |

A donation of any approved log counts 1:1. No type multiplier or tier preference; surplus over target is rejected **without consuming inventory**. Valid item ID is checked against a frozen server-owned allowlist, never user-supplied text. If later region logs are added, explicitly review the allowlist, not a loose string suffix.

Weekly cap resets **Monday at 00:00 UTC**. Counters are **per account, across characters, across all guilds in the same UTC week**; changing guild, relogging, using multiple characters, or splitting into multiple submissions never resets cap. Members must belong to the recipient guild at the time of donation. Guild progress never falls when members leave. Weekly periods are Nov 30–Dec 6 (donations begin Dec 3), Dec 7–13, Dec 14–20, and Dec 21–26, all UTC.

**Feasibility:** Each account can donate at most 10,000 logs and 1,000 lights across four event weeks. **At least three members** contributing in enough distinct weeks are needed to reach 100%, absent a later separately approved catch-up mechanism. Keep exact owner-requested targets and caps; don't silently scale them by guild size.

## Milestones — both tracks must clear each threshold

| Threshold | Logs | Lights | One-time guild treasury Gold | Active guild-wide buffs |
|---|---:|---:|---:|---|
| 25% | 6,250 | 625 | **10,000** | **+4% gathering speed** |
| 50% | 12,500 | 1,250 | **20,000** | +4% gathering speed, **+6% noncombat Skill XP** |
| 75% | 18,750 | 1,875 | **30,000** | Prior bonuses, **+6% Combat XP** |
| 100% | 25,000 | 2,500 | **50,000** | **+10% gathering speed, +10% Skill XP, +10% Combat XP**; permanent 2026 guild color |

- Total potential guild-treasury reward **110,000 Gold**, awarded **exactly once per milestone per guild**, automatically or via authenticated guild-leader claim with idempotent receipts; not duplicated on retries, guild changes or reconnect.
- Full milestone is computed from **minimum** of both track completion fractions. Partial excess of one track never triggers another stage.
- Buff percentages are *stage-effective replacements*, not additions on top of previous stage values (100% is **10/10/10**, not 14/16/16). Gather speed only, not quantity/drop chance; 10% speed means rate ×1.10 (duration ÷1.10), not a 10% time cut.
- Apply to verified normal overworld gathering and noncombat skill XP / normal regional combat XP, not retroactively to settled rewards. Do **not** apply to dungeon, guild-boss, world-boss or PvP rewards until separately balance-approved.
- While eligible and event active, current members receive their guild's live earned bonuses. Buff ends at Dec 27 00:00 UTC, including in offline windows (settlement must split at timestamps). Leaving guild removes buff; joining a qualifying guild does not grant retroactive XP. Honor existing multiplier stacking via explicit canonical aggregation and fractions, avoiding double use of the same bonus.
- Permanent completion reward: guild-owned `name_frostfall_aurora_2026`, displayed as **Frostfall Aurora 2026**. Appearance selection is controlled by existing Guild leader/officer color permission; unlock is irrevocable once awarded and persists after event. New visual/hex theme needs owner review before the actual UI/appearance asset is shipped. Final color must be registered in existing guild cosmetic ownership + event color release checks, not just a client paint ID.

## Event crafting proposal — Christmas Lights ×5

The seasonal Smithing recipe is gated by **Smithing skill level 4**, with no combat-level prerequisite. Recipe `CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026`:
- Inputs per batch: **4 Copper Ore** (`COPPER_ORE`), **2 Greenwood Logs** (`GREENWOOD_LOG`), **1 Wisp Glow** (`FROSTFALL_WISP_GLOW_2026`, new event drop).
- Output: **5 Christmas Lights** (`FROSTFALL_CHRISTMAS_LIGHTS_2026`).
- Proposed base processing: **40 seconds**, **30 Gold**, **35 Smithing XP** per five-light batch (seasonal rate, subject to economy simulation and any global crafting surcharge).
- To craft all **2,500 lights**, requires **500 batches, 2,000 Copper Ore, 1,000 Greenwood Logs, 500 Wisp Glow, 15,000 Gold** in total. This is **in addition to** the guild's 25,000-log donation goal.
- Proposed Wisp Glow acquisition: server-verified, event-window-only drop: **5% per eligible successful Fishing catch** or **2% per eligible Woodcutting cycle**, using canonical server settlement with receipt anti-duplication. These are initial design drop chances to simulate, **not live drop rates**. Give it to the account's normal inventory/bank via audited, capacity-safe grant. No paid/required combat source.
- Only lights, not raw Wisp Glow, count toward the lighting donation goal; lights have no combat stat and no permanent power. After event end, stop new Wisp Glow drops/crafting and permit leftover lights to be sold/salvaged at a conservative, separately reviewed value if desired. They cannot boost another event.
- Never grant forging XP for attempted, cancelled or double-settled crafts. Use existing Smithing recipe provenance and authoritative resource consumption. Cross-account trade, if supported, cannot bypass donor's account weekly cap.

## Authoritative persistence and security (implementation work required)

Use an additive versioned schema, event-keyed guild project rows, account-week per-track counters, itemized immutable donation receipts, milestone receipts and guild cosmetic unlock receipts. Access restricted to the backend service and authenticated current-guild server checks. In a **single transaction** with an advisory lock covering the guild track and an account-week ledger lock:
1. Require active, independently enabled 2026 event and project release flag, current guild membership, integer quantity >0, frozen valid item ID and server-owned account/inventory custody.
2. Compute target remaining and account-week remaining from locked authoritative ledgers; reject overspend/overcap/insufficient inventory without mutation.
3. Debit actual owned item quantity from the correct inventory location, write unique idempotency-key receipt, increment **guild** track and **account** weekly totals atomically.
4. Evaluate newly crossed *joint* thresholds, insert unique `(guild_id,event_id,threshold)` reward receipt, credit Guild Treasury Gold exactly once, record permanent 2026 color exactly once after 100%.
5. Return a read-after-write authoritative snapshot showing both progress bars, donor remaining allowances, current buffs and last reward. Duplicate identical nonce returns original committed result; same nonce with changed payload rejects.

Security tests: membership loss race, guild switch, multi-character bypass, week boundary Monday UTC, event end, log allowlist spoof, negative/float/overflow quantity, full Bank, concurrent donations, 25/50/75/100 joint thresholds, duplicate nonce, guild treasury payout once, color ownership persistence and unauthorized color selection, offline earning cutoff, no community/global reward duplication.

## Review-only visual concept (not implemented)

Guild Hall → Seasonal Projects → **Winter Hearth: Christmas Market**. Two independent bars with current/member weekly allowance; a small market drawing gains stalls at 25%, lanterns at 50%, decorated trees at 75%, and full aurora market at 100%. Tap-to-donate wood type and crafted lights, no unnecessary filters; compact milestone strip, active bonuses, guild treasury gains and permanent color preview. Must receive explicit owner UI/theme approval, localized copy, Android review and full CI before runtime changes.

## Release gates

1. Owner review of market UI/visual themes and new cosmetic palette.
2. Server-owned resource/drop/crafting identities, source receipts, economy simulation and production/staging parity.
3. Transactional Supabase migration + authenticated Edge handler + mobile read-only presentation, all under a default-disabled flag and no live payout.
4. Staging season-week simulation (including small guilds and UTC boundaries), multi-device concurrency, inventory and offline-skill integration tests.
5. Exact-head mobile/online/Edge/native CI, signed internal AAB/device QA; coordinated separate go/no-go and rollback. Frostfall itself remains disabled in production until explicit activation.
