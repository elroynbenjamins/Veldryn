# World Boss V58 — replay presentation and party tonic

**Decision: 19 November 2026 (owner). Status: hidden, not released.** Builds on the [V22 account raid](world-boss-weekend-account-raids-v22.md) and [V25 authored encounters](world-boss-authored-account-encounters-v25.md). Where [design v2](world-bosses-design-v2.md) disagrees, this document wins.

## Decisions
- **Party:** one attempt is an account raid with 1–5 of the player's own server-verified characters. 3 attempts per account per event. No borrowed Echoes and no NPC fillers.
- **No Skip, no speed controls.** The replay plays once at its own pace and pauses while the app is backgrounded.
- **No visible length.** No timer, no "round x/14", no progress bar. Results appear only after the finale.
- **One buff tonic per attempt** (Vigor, Ward or Harmony, any tier), shared by the whole party.
- **Grander than Chapter 1.** The fight is a set-piece, not a log viewer.

## Tonic rules (implemented, hidden)
| Step | Where | Rule |
| --- | --- | --- |
| Choose | `WorldBossSelectionV26.tonicItemId` | Optional; only catalog tonic IDs pass validation. |
| Verify ownership | `freezeWorldBossTonicV58` (`backend/online/world-boss-tonic-v58.ts`) | Read from the frozen party's own server saves: first a party character's Inventory (roster order), then the Bank. No owned unit means the reservation fails (`tonic_not_owned`). |
| Freeze and consume | `FrozenAccountPacketV26.tonic` | The packet records the tonic and the exact stack to consume (`characterId`, `inventory`/`bank`, quantity 1, `expectedGameVersion`). The reservation transaction must debit it together with the attempt ordinal. A lost-ACK retry returns the original reservation and cannot swap the tonic. |
| Apply | V25 encounter, round engine `serverTonic` | Multipliers are looked up again from the server table `DUNGEON_ROLE_TONIC_MODIFIERS` at settlement; no multiplier travels in the packet. Outgoing damage, incoming damage, healing and shields are scaled for every party member. |
| Show | replay events | Ward savings are real `mitigate` events (`TONIC_WARD`, `tonic_not_impact`) and do not count as World Impact. |
| Guard | settlement | A tampered or unknown frozen tonic is refused (`corrupt_frozen_tonic`) and the attempt stays reserved. The legacy four-role Echo engine rejects tonics. |

The review-only SQL drafts in `docs/` do not yet read `frozen_packet.tonic.consume`. The staging reservation function must debit that stack in the same transaction before any of this goes live.

## Replay presentation contract (implemented, hidden)
`apps/mobile/src/core/world-boss-replay-presentation.ts` turns the committed V25 event log into ordered beats. `WORLD_BOSS_REPLAY_POLICY` fixes `skippable`, `speedControls`, `showsDuration` and `showsRoundCount` to `false`. The beat model contains no round numbers, timers or totals. Per-beat pacing (`holdMs`) is internal to the player component and must never be summed or displayed.

| Beat | What the screen does |
| --- | --- |
| `entrance` | Region darkens, the boss rises to fill the top half, name and motif banner, shared world HP bar, party portraits. |
| `tonic` | The party's tonic activates with a glow on every character. |
| `telegraph` | Wind-up with the targeted characters marked; multi-target warnings are arena-scale. |
| `boss_attack` | Consecutive multi-target hits of one ability land as one arena-wide impact. A telegraphed special adds screen shake and flash. |
| `party_action` | Strikes, misses, heals, shields, cleanses, interrupts and mitigation. Shared buffs (War Camp, tonic) show no actor name, never a raw protocol ID. |
| `boss_state` | Guard break (arena-scale), guard restored, exposure, statuses. |
| `down` | A character falls. |
| `finale` | The camera pulls back; the world HP bar drops by exactly the server-credited HP. Crossing 70% / 30% and the killing blow are server-wide moments. A post-defeat Residual Echo shows no world damage. |
| `results` | Damage, world HP credit and Impact, only after the finale. |

Acts (`opening`, `onslaught`, `climax`) are derived from position in the fight, so music and visuals can escalate without exposing a round count. Reduced motion keeps every beat and removes only shake and flash.

## Tests
- `apps/mobile/tests/world-boss-replay-presentation.ts`: the policy flags; no round, duration or total fields in the beats; grouped arena specials; shared-buff sources; acts; the 70% threshold, killing blow and Residual Echo; the reduced-motion path; unknown bosses refused.
- `apps/mobile/tests/world-boss-authored-account-encounters-v25.ts`: all 90 real authored encounters present cleanly, with every party strike and miss and every boss hit shown exactly once. The legacy Echo engine rejects tonics.
- `apps/mobile/tests/world-boss-authored-settlement-v26.ts`: only owned tonics are accepted (Inventory first, then Bank); the reservation names the exact stack to consume; a damage tonic raises real boss damage; a Ward tonic produces real mitigation events; a tampered tonic is refused and the attempt stays reserved.

## Still open
- Original pixel art for Hollowroot, Solbrand and Rimewarden (master, three phase overlays, wind-up and impact frames).
- The mobile replay screen component built on these beats, reusing the dungeon combat stage effects.
- Debiting the tonic in the staging reservation SQL.
- Localized beat copy.
- The older shared-world (v19) boss in `backend/src/server/shared-world/` still uses solo attempts with a daily reset. It is a separate prototype and is not this design.
