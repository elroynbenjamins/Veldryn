# Frostfall 2026 — Winter Hearth Guild Christmas Market (review-only)

**Status:** implementation in a hidden GitHub draft, backend schema and RPCs installed on **staging only**; independent mobile runtime flag remains disabled. **Not merged, production-deployed, launched or visually approved.** Global Frostfall community participation is intentionally disabled in the draft catalogue, preserving its prior reward definitions; Guild Boss and production are unchanged.

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

Seasonal Christmas Lights can be crafted through **Smithing 4 or Tailoring 4**, without a combat-level prerequisite. Both routes produce the same five lights, with base 40 seconds, 30 Gold and 35 XP in the chosen profession (normal global modifiers apply).
- Smithing: 8 Copper Ore + 4 Dewleaf + 1 existing Wisp Dust.
- Tailoring: 8 Moss Fiber + 4 Dewleaf + 1 existing Wisp Dust.
- Production online inventory snapshot (2026-11-24, inventory stacks only): Copper Ore 30,745; Moss Fiber 28,761; Dewleaf 28,268; Wisp Dust 7,224. All are among the top 20 stockpiles by quantity. No seasonal gathering drop or new Wisp Glow item.
- A full guild goal takes 500 base batches: an even split consumes 2,000 ore, 2,000 fiber, 2,000 Dewleaf and 500 Wisp Dust, in addition to 25,000 donated logs; 15,000 base Gold, 20,000 base seconds. Actual profession modifiers may change cost, time, XP or output.
- Only Christmas Lights count toward the light donation track. Both professions share the same weekly account cap. No crafting starts outside the active seasonal window.

- Never grant forging XP for attempted, cancelled or double-settled crafts. Use existing profession recipe provenance and authoritative resource consumption. Cross-account trade, if supported, cannot bypass donor's account weekly cap.

## Authoritative persistence and security (first staging implementation complete; release QA pending)

Implemented as additive versioned staging tables with event-keyed guild project rows, account-week per-track counters, immutable donation receipts, milestone receipts and guild cosmetic unlock receipts. Direct Data API reads/writes are denied; the signed-in account is resolved with `auth.uid()`. In a **single transaction** protected by account advisory and guild/inventory row locks:
1. Require active, independently enabled 2026 event and project release flag, current guild membership, integer quantity >0, frozen valid item ID and server-owned account/inventory custody.
2. Compute target remaining and account-week remaining from locked authoritative ledgers; reject overspend/overcap/insufficient inventory without mutation.
3. Debit actual owned item quantity from the correct inventory location, write unique idempotency-key receipt, increment **guild** track and **account** weekly totals atomically.
4. Evaluate newly crossed *joint* thresholds, insert unique `(guild_id,event_id,threshold)` reward receipt, credit Guild Treasury Gold exactly once, record permanent 2026 color exactly once after 100%.
5. Return a read-after-write authoritative snapshot showing both progress bars, donor remaining allowances, current buffs and last reward. Duplicate identical nonce returns original committed result; same nonce with changed payload rejects.

Security tests: membership loss race, guild switch, multi-character bypass, week boundary Monday UTC, event end, log allowlist spoof, negative/float/overflow quantity, full Bank, concurrent donations, 25/50/75/100 joint thresholds, duplicate nonce, guild treasury payout once, color ownership persistence and unauthorized color selection, offline earning cutoff, no community/global reward duplication.

## Review-only visual concept (not implemented)

Guild Hall → Seasonal Projects → **Winter Hearth: Christmas Market**. Two independent bars with current/member weekly allowance; a small market drawing gains stalls at 25%, lanterns at 50%, decorated trees at 75%, and full aurora market at 100%. Tap-to-donate wood type and crafted lights, no unnecessary filters; compact milestone strip, active bonuses, guild treasury gains and permanent color preview. Must receive explicit owner UI/theme approval, localized copy, Android review and full CI before runtime changes.

## Staging verification (2026-11-23)

- SQL migrations successfully installed only on staging; event remains disabled and `winterHearthGuildEnabled=false`.
- Rollback-only fixtures verified actual inventory debit, identical receipt replay without second debit/payout, 25% milestone, weekly cap, 100% milestone, exactly 110,000 Guild Bank Gold and permanent color entitlement.
- Security checks verified no direct authenticated or anon table reads and service-only historical bonus projection; all QA rows rolled back, leaving empty project/donation/milestone/weekly tables.
- Independent source/client release flag remains false, temporary bonus windows are server-derived, and historical action timestamps are used for XP/speed math. Final CI is not yet verified.
- Original icon candidate PNGs were generated and delivered separately for review; they are not yet registered in the Android asset map.

## Release gates

1. Owner review of market UI/visual themes and new cosmetic palette.
2. Server-owned resource/drop/crafting identities, source receipts, economy simulation and production/staging parity.
3. Transactional Supabase migration + authenticated Edge handler + mobile read-only presentation, all under a default-disabled flag and no live payout.
4. Staging season-week simulation (including small guilds and UTC boundaries), multi-device concurrency, inventory and offline-skill integration tests.
5. Exact-head mobile/online/Edge/native CI, signed internal AAB/device QA; coordinated separate go/no-go and rollback. Frostfall itself remains disabled in production until explicit activation.


## Approved event cosmetic collection (2026-11-24)
Use permanent, guild-owned achievements for Frostfall and future major guild events, with event/year-specific IDs and no Shop alternative. Both donation tracks must qualify. Award automatically within the committed milestone transaction, never from UI progress or individual claims.
- 50%: Winter's Aurora — `background_frostfall_winter_aurora_2026`
- 75%: Frostfall Standard — `banner_frostfall_standard_2026`
- 100%: Frozen Majesty — `border_frostfall_frozen_majesty_2026` and `name_frostfall_aurora_2026`
- No change to Gold, buffs, donation targets or caps. All cosmetic rights survive the event end, membership changes, or unequipping.
- Existing production schema has guild-scoped unique ownership in guild_cosmetic_unlocks and separate background/banner/profile frame/name color selections. Existing selection validators and CHECK constraints use explicit allowlists; extend these and register actual approved art before enabling. Preserve existing authorization and row locks; only linked guild leaders/officers can equip; reject wrong slot, wrong guild, unowned ID and unreleased asset. Preserve existing construction and Halloween cosmetics. Future collections add event-scoped definitions, not automatic grants for all events.
- Review implementation: tools/guild-event-cosmetic-review.mjs, milestone regression suite, disposable PG17 settlement tests, and tools/winter-hearth-review/v2/event-cosmetic-settlement-candidate.sql. SQL candidate is NOT an applied migration. No production or staging writes; actual equip/UI/asset registry, migration validation and CI remain required.
- Approved visual direction: Build the Market with compact contribution/buffs. Five local scenes selected by the highest joint milestone (0/25/50/75/100); generated artwork accepted by owner. Profile background is separate from the progression artwork. Verify alpha and mobile dimensions for banner/border before integration.

## Donation UI pass — 2026-11-24
The release-gated guild screen now has a material picker (six approved woods or crafted lights), locked-stock exclusion, numeric input, 10/Half/Max shortcuts, confirmation, and account-scoped persistent request recovery. Preview maximum = min(unlocked inventory, remaining weekly cap, remaining guild goal). UI does not mint or debit locally. The server must validate every request. On a receipt, refresh progress and authoritative online inventory before enabling another donation. The v2 RPC SQL candidate in tools/winter-hearth-review/v2/donation-context-v2-candidate.sql binds new requests to original account, guild, character and UTC week; existing committed receipts may replay safely. Candidate is not deployed. Before promotion, verify real server character identity and lock ordering, test context changes, timeouts, replay, auth, refresh races, old RPC compatibility, expiry and Android. All production flags remain disabled; no migration applied in this pass. Five market images and cosmetic equip integration remain separate work.

## Approved artwork and appearance integration — 2026-11-24
Eight approved source images are now bundled under apps/mobile/assets/events/frostfall/winter-hearth. The five market scenes are 959×540, the background is 959×540, banner 427×640 and frame 720×540 (alpha preserved). Combined 1,477,472 bytes. Git blob SHAs verified against locally optimized files. The screen uses joint thresholds 0/25/50/75/100 and warms only the next local asset after the current view, with no startup preload or network fetch. Refresh retains the prior scene until an authoritative snapshot arrives. Guild Appearance registers the four seasonal IDs and real art through its existing shared profile components, with release plus ownership checks. Local QA must not grant seasonal art. The dedicated seasonal RPC and receipt-trigger catalogue SQL are in event-cosmetic-settlement-candidate.sql, not deployed. All catalogue releases are default-off and independent of seasonal expiry; existing owned rewards persist. No staging or production writes. Before launch: promote and test the SQL with both existing construction/Halloween and seasonal selections, role/member races, unreleased and wrong-slot rejection, and old-client compatibility; ensure the existing donation context v2 candidate is also promoted. CI/Android visual review still required.

## Staging integration pass — 2026-11-24
Applied only to verified Veldryn Staging iqfmmpvwanvvmxcftfxw: migrations 20261124081801_winter_hearth_2026_donation_context_v2 and 20261124081820_winter_hearth_2026_cosmetic_milestone_catalog_v1. Both are committed. Donation v2 locks inventory, guild, then rechecks membership, rejects mismatched account/character/guild/week, allows original committed receipt replay, and disables direct authenticated v1 calls. Read-back confirmed v2 callable by authenticated only, v1 no longer directly callable by authenticated. Rollback-only staging tests rejected missing auth, wrong account, stale week; synthetic guild milestone test confirmed 0/1/2/4 earned cosmetics at 25/50/75/100 and no duplicate reward on replay. Event remains disabled, no released seasonal catalog rows, no persistent fixture ownership or donation rows. Full donation settlement with real inventory, Android QA, and concurrency still pending. Fixed observed TS2551 absoluteFillObject and PG17 CASE test syntax. CI also reported shared gameplay and co-op generated Edge bundle mismatch and unrelated UI contract failures; do not merge until reconciled. Appearance equip candidate not applied: staging missing background columns and production appearance v3/v4 validators and event name color guard. Candidate now explicitly preflights those dependencies and extends name-color ownership guard without removing existing Hall restrictions. Do not replay older appearance migrations blindly: they can overwrite construction allowlists and reset color selections. Align staging baseline narrowly and test the new equip RPC against production-compatible schema first. No production writes or activation.
