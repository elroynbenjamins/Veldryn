# World Boss V29 — proven role Impact audit (hidden)

**Status:** 16 November 2026. **Private review-only, NOT LIVE.** Stacked after V28. This is an *audit and proposed normalization* pass, not a wallet, leaderboard, matchmaking rule, or World Boss activation.

## Preserved decisions

- World Boss cycle: **5 full preparation days**, **48 continuous hours Saturday–Sunday (00:00 Saturday to 00:00 Monday UTC)**, then cooldown until the next 14-day cycle.
- **3 account-wide battle attempts per event**, not 3 per character. The new 1.0.10 character-creation limit is 3 (one Tank, one Damage, one Support), while grandfathered 4–5-character accounts remain intact. Private older World Boss replay contracts therefore still accept 1–5 owned characters in a single attempt; no duplicate per-character rewards.
- Up to **2 account-wide War Camp donations** with committed resource deductions, frozen before Saturday.
- V26 immutable authored 14-round replay, V18 global HP transaction, V27 War Camp receipts, and V28 *private* Sigil accounting remain the only trusted reward facts.
- **World Impact milestones of 5 / 10 / 15 Sigils at 0.8 / 1.8 / 3.0 remain DISABLED.** V28 currently only allows up to 70 event Sigils from verified battle, shared boss HP and supply sources. V29 never writes a wallet or claims a milestone.

## This pass

`backend/online/world-boss-impact-audit-v29.ts` is a pure private analysis module. A *trusted internal worker* must first join the immutable, database-proven V28 replay to current server-owned class identity, verified CP bracket, and server-owned per-character Combat Power. **The literal `verified_v28` field is not proof by itself**; the module cannot authenticate its own inputs and must never be fed client JSON or mounted as a route.

The audit compares **all nine classes** (three Tank, three Damage, three Support) in each of **three authored bosses × five CP brackets** = **135 independent class reference cells**. It requires **20 distinct proven accounts per cell** before generating any account preview. Duplicate account-attempt identities, reused replay digests or requests, wrong class roles, negative/unbounded metrics, unproved replays and forged roster rows fail closed.

Class reference samples use actual boss HP and Guard damage, **effective** heals, **consumed** shields, actual Tank prevention, cleanses and interrupts. These are *provisional*, explicitly unapproved class- and role-specific diagnostic weights. Each character's utility is divided by the square root of its independently verified CP to reduce within-bracket power drift. A median, lower/upper quantiles and survival rate are recorded for every cell. Each account contributes **one median observation per class/boss/bracket cell**, despite repeated attacks or multiple same-class characters: no reference-population inflation by high-volume accounts.

Reference warnings flag absent/underpopulated cells, zero utility, survival below 30%, extreme distribution variance, and over-25-point survival gaps among classes of the same role. **No score preview is produced until these provisional review checks pass.** A class-relative score can then be reviewed for each real attack, capped to 2× its class baseline per character with decreasing secondary-character weights of **1, .12, .07, .05, .04**. This captures useful team play without turning character count into linearly multiplied score. Scores accumulate across at most three account attempts, **but are NEVER reward entitlements**.

`apps/mobile/tests/world-boss-impact-audit-v29.ts` covers 2,700 independent proven attempts, all 135 class cells, strict 20-account minimum, one-account-one-reference-sample fairness, 3-attempt accounting, three-role team diminishing returns, missing cohorts, forged proofs, negative or invalid CP/stats, duplicate characters and zero-damage results. Hidden workflow includes this suite. No production or staging database access occurs.

## Still required before approving any Impact rewards

1. Independently establish the real **nine class IDs and server-owned role mapping**, integrate a secured V28 replay + owner CP join (not the provisional test catalog). Honor the new three-character creation cap and three-role diversity while preserving the permitted legacy 4–5-character accounts in all fairness cohorts.
2. Run representative **real population** balance batches for Hollowroot, Sunscar, Frostmarch in five brackets with sufficient classes and accounts. Audit phase/order, endgame vs beginner cohorts, survival, and class/role asymmetry over all 14 authored rounds.
3. Detect and clamp timing/interrupt exploit loops, class switching, extreme utility outliers, missing/retired classes and repeated contributions across events. Add replay integrity/anti-farming adversarial CI with two independent database workers.
4. Have economy/gameplay approve the final normalization weights and 0.8/1.8/3.0 achievement behavior; only then add a **versioned immutable** SQL migration, real-wallet integration, appropriate release-gated UI, localization and measured rewards backfill.
5. Keep World Boss private until all V22–V29 tests and real migrations pass explicit launch review. **No production changes from this branch.**

**Safety boundary:** `WORLD_BOSS_V29_IMPACT_LIVE=false`, `WORLD_BOSS_V29_IMPACT_PAYOUTS_APPROVED=false`, `payoutsAuthorized=false`, `walletWrites=0`; V28's frozen Impact payout gate remains false.
