# Equipment 2.0 V26 — independent self-shield ledger and validation recovery

24 November 2026. Draft only. V14 catalogue/economy, V17/V18 source proposals, C12 and D1–D10 unchanged.

## Verified validation findings
V22 exact head 42e8e6d54266f46192b0a2ac8fd3368cd59e86c8: isolated server core passed; private expanded integration 45394868002, private GameState 45394867004 and release economy 45394866621 failed strict TS7053 because Array.isArray narrowed readonly IDs to any[] before indexing the typed table. Catalogue 45394868072 failed due to non-exported V17 import (already corrected in V24). V26 validates unknown array elements with explicit string/own-property guards and preserves an exact typed readonly copy before table lookup; invalid or duplicate family IDs reject. No loosening of strictness. V22 Edge parity still failed for both stale generated bundles. V23–V25 focused runs still queued at readback; no new measured combat results. V21 historical passing checks remain historical, not evidence for current shared engine. New compile/run outcomes unconfirmed.

## Independent equipment-only self shields
Eight exact records (five shared cooldown families), all duration 6 seconds:
| Definition | Trigger | Shield as % max HP | ICD |
|---|---|---:|---:|
| Citadel T1/T2/T3 4p | >=6% actual direct nontrue HP loss | 3.2/3.6/4 | 24s |
| Glassbound Bulwark 4p | >=6% actual direct nontrue HP loss | 4.5 | 22s |
| Rootbound Heartward 4p | >=6% actual direct nontrue HP loss | 4 | 22s |
| Rare T5 Citadel Tower Guard 4p | >=8% actual direct nontrue HP loss | 6 | 18s |
| Bastionmail Hold the Line 6p | cross from >=35% to <35% HP on eligible direct hit | 5 | 35s |
| Rimewatch Rimeguard 4p | eligible direct nontrue HP loss while pre-hit HP <50% | 4 | 24s |

Readback directly compared eight runtime entries with exact source JSONs; all eight magnitudes, thresholds, durations, cooldowns and units matched. Source check does not demonstrate combat execution. Earlier 20 source definitions plus eight = 28/142 supported by private adapter; 114 remaining. Do not confuse support with validated or released effect count.

One independent equipment-only pool per scoped QA Ironwarden, origin ID/owner/earnedAt/expiresAt/remaining retained. Normal class/gem/reflect shield absorbs first; only residual eligible original nontrue enemy damage may consume equipment pool. No true damage, generated effects, unrecognized phase IDs, same-tick absorption, recursive shield reflection or resource/gem proc; equipment absorption is separately tagged and does not enter legacy shield accounting. Post-hit grant requires completed pre-hit, absorption and post-HP receipt phases; duplicate object receipt rejected. No fatal-hit grant, no refresh while same source active, exact expiry, strongest candidate grant by percentage; stronger remaining pool may replace a smaller one, not count as depletion. Cooldown starts only on actual grant, Citadel tiers share family. Rimeguard uses pre-hit <50%; Hold the Line restricted to eligible original nontrue direct threshold crossing. Independent expiry at simulation tick, zero subtraction from class shield. These conservative rules are QA proposals, not final approved global shield interaction. Named grant/absorb/depleted/replaced/expired logs. Named shield break effect Rimewatch 6p not yet applied. Bellwake shield+charge atomic composite, ally-heal/cleanse shields, full spell/evade provenance remain deferred. No owned hypothetical set copies or mint authority.

## Tests and follow-up
Added source-audit test and private event boundary tests before long matrices, including exact threshold, no post without pre+absorption, one-use receipts, same-tick, partial absorption, true damage, zero residual legacy shield, named depletion, stronger replacement, expiration, threshold crossing and fatal hit. Full shield matched engine experiments not yet added or executed. No claims of successful CI. Next prioritize successful strict compile and boundary suites, then matched timed/shield experiments before further effect families; avoid unbounded accumulation of unverified code. Current mobile Expo, tool economy/blueprint/scroll regressions and stale Edge bundles remain unresolved. No main merge, staging/production DB changes, release flags, item grants, CP approval or deployment.
