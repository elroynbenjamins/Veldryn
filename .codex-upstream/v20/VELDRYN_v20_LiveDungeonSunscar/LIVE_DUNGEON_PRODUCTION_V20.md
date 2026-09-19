# VELDRYN v20 — Live Dungeon Production Polish

## Product boundary

Live Dungeons remain the synchronous 4-player mode and require exactly **1 Tank / 2 Damage / 1 Support**. Persistent social Parties from v16 do not inherit this composition rule. Q-Mode remains the asynchronous alternative using saved player loadouts. v20 does **not** auto-fill Live Dungeon parties with Echo profiles; the older Hybrid Queue concept is treated as non-authoritative unless explicitly reintroduced later.

## Queue and matchmaking

- One open Live Dungeon queue ticket per account, not per character. This prevents one account occupying multiple party slots through alternate characters.
- Ticket snapshots: account, character, chosen loadout, role, level, server-computed power index, support score and queue time.
- Strict role composition is validated before a ready check begins.
- Tank and Support builds must pass the existing server-owned role-score contract; the class name alone is insufficient.
- Initial power window is 10%; it expands by 5 percentage points per minute up to 40% to reduce very long waits while still preferring similar builds.
- Level difference is a preference, not a hard blocker once content minimum level is met and sync rules can safely compress overpowered characters.
- Match candidates are reserved atomically in the database before the ready check.

## Ready check

Default: **20 seconds**.

- All four must accept.
- A decline or timeout removes only that player from the match.
- Players who accepted are returned to the front/reasonably high priority of the queue rather than losing their whole wait.
- The selected loadout becomes frozen when ready check begins.
- Server owns expiration and resolution.

## Route voting

Default: **8 seconds**.

- Each live player receives one vote.
- A player may change their vote until the server closes the decision.
- If all four agree, resolve immediately.
- Otherwise most votes wins when the timer expires.
- Ties use a deterministic server tie-break based on `run_id + decision_id`; the leader cannot force the route.
- AFK/default behavior follows the current majority only after the timer; there is no role-weighted vote.
- Q-Mode keeps user-controlled route choice as previously designed; it does not use the live-vote system.

## Disconnect / reconnect

v20 uses a forgiving recovery model rather than immediately destroying a run:

1. **0–30s** — reconnect grace. Character holds safe/simple behavior; no penalty.
2. **30–150s** — temporary server **Safety AI** may execute only a conservative allowlisted subset of the frozen loadout. This is reconnect protection, not an Echo-player replacement. The real player can reclaim control immediately after successful reconnect.
3. **150s+** — member is treated as left for run-state purposes. The remaining party can finish if encounter rules allow it; progression bosses should normally become substantially harder/impossible without the required role rather than silently replacing the member with a full-strength bot.

Disconnect classification is server-side. Network loss must not automatically create a deserter penalty.

## AFK handling

- 60 seconds without meaningful input: warning.
- 120 seconds: severe AFK state.
- Input means valid combat/ability/mechanic/route interaction, not repeated meaningless taps.
- Reward eligibility uses actual participation rather than raw connection duration.
- Persistent abuse can receive a mild queue cooldown.

## Deserter policy

Intentional active-run exits receive escalating queue cooldowns:

- first recent intentional leave: 5 minutes
- second: 10 minutes
- third: 20 minutes
- repeated: 30 minutes

No cooldown for a server-classified unintentional disconnect. This is not meant to punish mobile instability.

## Checkpoint/recovery

A committed checkpoint is written between route nodes and before/after the final boss transition. Checkpoints include:

- sequential number
- current node/index
- route state
- party combat state
- server content/version
- integrity checksum

The database appends checkpoints atomically. If a worker/server dies, v20 reconstructs the run from the latest committed checkpoint rather than rewarding/failing the run from partially applied state.

Combat actions themselves still use the authoritative combat service; the checkpoint is a recovery boundary, not a client save file.

## Reward eligibility

Completion alone is not sufficient. Eligibility includes:

- accepted ready check
- meaningful combat participation
- mechanic participation
- route interaction
- excessive AFK/leave checks

The reference score weights combat 55%, mechanics 35%, route participation 10%, with a 20% minimum. This should be adapted to the current production combat telemetry, not trusted from the mobile client.

Rewards are written through idempotent receipts (`run + account + reward_key`) so retries cannot double-pay.

## Party chat

Live Dungeon run chat stays separate from the persistent social Party channel. It exists only for the current run and its short post-result window.

## Mobile presentation

v20 includes reference components for:

- queue status
- ready check
- run header / party roles
- route voting
- reconnect warning
- final-boss preview

The target feel remains compact, pixel-game-like and mobile-first, rather than a generic web lobby.
