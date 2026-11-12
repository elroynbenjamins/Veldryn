# Party Events v9 — unique stories throughout the preparation week

**12 November 2026 — hidden implementation / not live.** Source:
`backend/src/server/party/weekly-party-family-stages-v9.ts`.
The existing v2 event 7 days active + 14 days rest, 3 resource/progress stages, two 6-hour votes and Day 8 boss remain unchanged. This is a deterministic UI/encounter preview, **not** a live stage action emitter, source of EP, reward calculator or online endpoint.

## How each adventure feels different

| Family | Stage 1: scouting, no combat | Stage 2: voted approach + skirmish | Stage 3: voted plan + defense rehearsal | Pixel-art scene and animation brief |
| --- | --- | --- | --- | --- |
| **Broken Caravan** | Survey the crossing, inspect damaged bridge supports and find raider footprints | Defend wagons against the v8 raider charge; **Safe Pass** or **Fast Pass** | Repair axles; **Brace Wagons** or **Disrupt Raiders** before the convoy | Dusty amber crossing, parallax wagon wheels and swaying rope, scouts raising flags, arrows striking wagons, convoy forming a defensive line |
| **Nightfall Hunt** | Read tracks, identify prey and study plants/animal signs | Flush the pack and interrupt howls; **Clear Trail** or **Shadow Trail** | Mix scent decoys; **Hold Ground** or **Hunt the Alpha** | Indigo moonlight, sliding forest silhouettes and illuminated tracks, shaking foliage, alpha revealed through the moonbeams |
| **Broken Wards** | Inspect rune fractures and trace broken magical circuits | Stabilize crackling spires; **Ground Spires** or **Charge Sigils** | Align runestones; **Protect Wards** or **Overload Wards** | Cyan arcane glow, flickering runes, spark showers, chain reactions and the final ward ring connecting |
| **Lost Reliquary** | Translate mirrored glyphs and survey the ancient archive | Cross the mirror hall; **Quiet Passage** or **Deep Passage** | Restore the final seal; **Preserve Seals** or **Break Seals** | Violet reflective vault, drifting glyphs, water shimmer, rotating mirrors and hairline fracture animation |

Three family-specific variation cues are authored for each event. Stage labels, motions, backdrops, foreground tokens, palettes, three timed flavor cues and supply-category mix are supplied to a future compact pixel UI. **Tokens are asset briefs, not claims that corresponding art has been generated or shipped.**

## Four special action slots (same fairness, different story)

The existing *proposed* 5 EP action slots keep their canonical identities:
`scout_route` in Stage 1; `secure_approach` and `support_expedition` in Stage 2; `prepare_finale` in Stage 3. Each family now has bespoke names, motivations and alternative activities with real Veldryn skill labels. **These are descriptions only:** they do not mint EP or bypass server receipt validation. Example alternatives:

- Caravan: map the safe road, construct a barricade, repair an axle, inspect convoy supplies.
- Hunt: study tracks, identify safe escape routes, blend a scent decoy, verify a quiet camp.
- Wards: copy the rune network, reconnect a conduit, ground a sigil, verify the ward circle.
- Reliquary: translate glyphs, align the mirrors, restore a seal, verify the relic map.

Each member can participate without being required to own a specific class or companion. Skill examples must be selectable alternatives, not new equipment/skill prerequisites.

## Real combat and fully donated preparation bonuses

Stage 1 remains explicitly **noncombat**. Stages 2 and 3 use the existing deterministic engine with their own v8-family abilities, periodic effects, boss shields/exposure phases and real combat event logs. Stage 2 uses only its voted tactic; Stage 3 also applies the previous stage's chosen route. Difficulty follows the established **Standard 1.0 / Veteran 1.2 / Heroic 1.4** prototype pressure. Stage previews enforce max 1 Tank / 2 Damage / 1 Support, matching [Party composition PR #1046](https://github.com/elroynbenjamins/Veldryn/pull/1046).

The pre-existing required Stage 1/2/3 supply bonuses and optional Reinforced / Provisions / Specialist buffs still apply *unchanged*. To differentiate stories, **additional very modest, v9-preview-only family multipliers** are layered onto verified actors only after all relevant optional supply orders have been fully donated:

| Family | Reinforced | Provisions | Specialist |
| --- | --- | --- | --- |
| Caravan | Defense ×1.03 | Max HP ×1.03 | Attack ×1.025 |
| Hunt | Defense ×1.025 | Haste ×1.015 | Accuracy ×1.04 |
| Wards | Defense ×1.04 | Healing power ×1.03 | Haste ×1.018 |
| Reliquary | Defense ×1.025 | Healing power ×1.06 | Attack ×1.03 |

These deliberately small proposed values **need balancing against actual gear tiers**. No extra material sink, stock refund, guaranteed rewards, companion favoritism or permanent stat upgrades have been added. Partial or invalid donations never qualify.

## Technical guardrails

- `PARTY_EVENT_STORY_STAGES_V9_RELEASED=false`, and every v2–v8 release gate stays false.
- Stage 1 does not fabricate combat, scouting completion or EP.
- Current stage and both vote IDs are checked; Stage 3 requires both locked routes, while Stage 2 cannot read a future Stage 3 vote. A forged route or unknown variation is rejected.
- Party composition caps, actor identity uniqueness, positive levels, supply quantity limits and canonical campaign metadata are validated. True server-origin verification remains the future service/DB responsibility, **not** a security claim about a direct call to this preview function.
- Recorded combat source events provide objective telemetry and timed warnings. No fabricated victories or write-enabled actions.
- The v9 regression suite covers **252 story/choice/variation/size scenarios**, including **216 real engine fights**, plus **48 Veteran/Heroic scenarios** and **96 additional mixed-level legal-party battles covering all nine classes**; no-supply/partial-supply cases, deterministic replay and invalid ballot/role/receipt rejections.
- A UI art pass, stage-action server receipts, a frozen stage-vote ledger, encounter tier balancing and atomic Day 8 payout integration remain **unimplemented**. Do not connect this prototype to a production claim service without those safeguards.

## Next pass

1. Verify CI and fix any compile/simulation failures in v8/v9.
2. Establish a single server-frozen week, roster, ballots and loadout snapshot for all three stages and finale; stage and optional supply receipts must be idempotent.
3. Calibrate stage encounter timings and boss tier 1–12 against actual T1–T4 combat loadouts, all 9 classes, role-legal 2–4 parties, companion variants and potions.
4. Add lightweight pixel-art assets, distinct stage screens, action buttons with authoritative request IDs, and replay-based cues after the back end is safe.
5. Verify economy sinks and rewards separately, then plan a staged rollout.

**No merge, production deployment or release switch by this document.**
