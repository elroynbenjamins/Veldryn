# Dungeon multiplayer and reward release gate

**Status:** not executed. This document lists mandatory staging verification steps.
Do not infer production readiness merely from backend unit tests.

## Preconditions
- Staging migration state matches PR #669: read-only budget (00011), failure claim/quota (00012), read-only failure allowance (00013).
- Four separate authorized test accounts, with tank / two distinct DPS classes / support.
- One lower-geared and one well-equipped party; a Solo test account; disposable wallet currency for receipts.
- Current supported AAB has the pending-combat protocol and chosen-tier display. Enforce minimum supported version **before** gameplay backend is switched.
- Capture anonymized server request IDs / receipts / run IDs for debugging; never copy account secrets to issue comments.

## Multiplayer acceptance scenarios
| Test | Procedure | Expected |
|---|---|---|
| Fair matching | Level-unlocked but low readiness player uses Quick Match | Server chooses a conservative tier, never exceeds level unlock |
| Explicit tier | User selects Tier II while level-eligible for III | Server preserves II, never silently upgrades |
| Group composition | Queue 1 tank, 2 distinct DPS, 1 support | Only one role-valid 4-human roster enters |
| Ready check | 3/4 ready, fourth disconnects | No partial party runs; clear timeout/recovery |
| Unanimous route vote | Four clients vote before deadline | Single decision, one server-owned node resolution |
| Split votes | Multiple choices and conflicting votes | Server tie-break consistent and identical on all clients |
| Deadline expiry | No final vote for 8 seconds (10 for Live events) | First subsequent participant poll advances exactly once |
| Combat playback | Two devices with different polling delays | No premature victory, rewards, enemy outcome or final state; visual playback is progressive |
| Boss fight | 4-human high-tier run | Boss modifiers apply, damage roles useful, encounter within configured Live time band |
| Hard disconnect | One or more clients lose connection and return | Frozen team restored, AI policy and rewards enforced, no duplicate event |
| Failed run | Lose after early room and near boss | Consolation derived from progress; no enhanced charge spent; zero Fellowship |
| Repeat failures | 13 claims in same UTC week | First 12 capped small payouts; thirteenth zero; charges unchanged |
| Weekly reset | Test across week boundary | Consolation and enhanced budgets reset independently |
| Claim retry | Retry after network timeout; call twice concurrently | One credit ledger entry, one budget decrement at most, same idempotent result |
| Successful run | Tier I and Tier V full clears | Correct tier Marks, enhanced charge spent once, first-three successful Live Fellowship awarded once |
| Exhausted charges | Clear after 12 enhanced weekly claims | 20% tier Marks, no new charge consumed |
| Stale AAB | Old Android client after minimum version cutover | Safe upgrade prompt, cannot submit unsupported run state |

## Metrics for release
- **Sample-size baseline:** at least 1,000 seeded simulations per tier/gear band (`pnpm --dir backend test:dungeon-full-matrix`). CI smoke samples alone are not proof.
- Verify clear-rate targets for balanced parties: Tier I ~90–95%, II ~80–90%, III ~70–85%, IV ~60–75%, V ~55–70%. Treat these as starting targets, not guarantees.
- No double claims, lost run progress or misallocated role slots.
- Measure real Live run times by tier (excluding matchmaking), wait time for matchmaking, and failed-run consolation budget consumption.
- **Only after** passing staging tests, AAB smoke, minimum version enforcement, and migration verification should gameplay backend activate.

## Economy release note
The design workbook provides shop pricing targets, but a complete production Expedition Shop SKU/price/cap grant path is not verified. Do not ship new purchase claims or repricing just because price rows exist in design data.
