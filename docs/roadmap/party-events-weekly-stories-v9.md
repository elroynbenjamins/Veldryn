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

## v10 continuation — locked stage context and idempotent action plan (13 November 2026)

**Still hidden; not live or release-approved.** A new read-only contract in
`backend/src/server/party/weekly-party-stage-ledger-v10.ts` validates a single
server-loaded week, deterministic family/variation, immutable roster identity,
canonical class roles (maximum 1 Tank, 2 Damage, 1 Support), loadout checksums,
ordered Stage 2/3 locked choices, and valid supply snapshots before calling the
existing v9 preview. The Stage 1 preview never sees later ballots.

The v10 objective planner accepts a **server-verified source row**, account,
party, action slot and request ID and produces an INSERT *plan*, not an INSERT:
it rejects wrong-week/stage sources, duplicates across slots, replay by different
request ID, early combat-as-scout evidence and post-close actions. Exact retry
of the same action/request/source returns the existing receipt. **It grants
zero EP and zero rewards.** Four canonical slots are still Scout, Secure
Approach, Support Expedition and Prepare Finale.

**Not yet authoritative:** a SHA-256 checksum protects against accidental
snapshot drift but does not establish server provenance. The integration
must fetch enrollment, loadouts, votes, gameplay evidence, supplies and stored
receipts from locked private tables in one transaction, and enforce unique
`(party_id,event_starts_at,account_id,action_id)`,
`(party_id,event_starts_at,source_event_id)` and request IDs in the database.
The v10 layer is NOT connected to any mobile screen, REST endpoint, Supabase
function, point ledger, inventory sink, reward grant or Day 8 worker.

The new test covers 12 family/stage combinations, locked-ballot isolation,
tampered snapshots, roster/supply validation, source provenance boundary
checks and replay safety; included in the existing hidden Party Events CI.
**Validation must be confirmed by CI before considering this pass complete.**

### Next required work

1. Persist a server-owned enrollment/choice/loadout/action source ledger with
   transaction-safe idempotency constraints and stage locks (before any EP).
2. Wire verified source actions and supply consumption atomically; enforce
   the no-duplicate-source property under concurrent requests.
3. Benchmark actual T1–T4 classes, companions and run-only potions against
   the four stage engines and Day 8 boss tiers.
4. Build the four polished compact pixel-stage screens and genuine art assets.
5. Build and test Day 8 single-claim settlement and staged rollout. Keep all
   release gates OFF until every blocker clears.

## v11 — private atomic objective receipt ledger (13 November 2026)

The hidden implementation now has a **migration staged in git only**:
`backend/supabase/migrations/20261113041500_party_event_receipt_ledger_v11.sql`.
It defines five `private` tables: immutable event week/roster identities,
monotone stage opens and one-time family-appropriate locked votes,
server-authored gameplay evidence sources, and one receipt per account/week/action.
The source ID and client request ID are globally unique; a separate account/week
enrollment uniqueness constraint prevents switching parties to duplicate actions.

`private.record_party_event_action_v11` is **service-role-only** and locks the
week and verified evidence row, then the current stage, before admitting a
receipt. Unique DB constraints enforce one slot, one source and one request
even if two workers race. An identical retry replays the original receipt,
including after event close; a different retry cannot remint it.
Only noncombat evidence may satisfy scouting; Stage 2 and 3 sources must
postdate their own locked votes. Invalid class roles, impossible full-party
composition and out-of-window sources are rejected. All recorded
`event_points_awarded` values are constrained to **0**.

The event week is a durable snapshot and does not disappear if the live Party
disbands. Auth account deletion can still cascade and erase that account's
private rows. SQL grants are restricted to `service_role`, with RLS enabled
and no client grants. The RPC has no mobile/API exposure.

**Validation:** Executed both this migration and
`backend/supabase/tests/party_event_receipt_ledger_v11.sql`
inside **one transaction on Veldryn Staging 20260924**, ending in
`ROLLBACK`. The SQL regression returned **PASS** after testing roles,
unauthorized grants, vote locks, three stages, forged/reused receipts,
exact retries, closing and disband safety. No changes were persisted to
staging; production has not been touched. The migration is **not applied** in
either environment, and normal GitHub Actions cannot execute the SQL suite
without a configured temporary DB. The workflow watches the new files but
does **not** claim database test execution.

**Critical remaining integration:** Nobody yet inserts real source rows from
the canonical gather/craft/combat transaction. Only a server-verified gameplay
or outbox record may populate `party_event_sources_v11`; never trust a
client-supplied source ID, time, count, actor, class or role. Verify source
provenance in the **same transaction** as gameplay settlement, with a
source-to-event origin check. Before live use, lock enrollment/ballots,
supply consumption and final loadouts on authoritative rows, couple v2
progression and event-point ledger to completed receipts exactly once,
and implement Day 8 single-claim settlement.

**No release activation:** All v2–v10 flags remain FALSE; v11 adds no new
public endpoint, EP, inventory grant or live worker. Keep PR #1045 a draft
until CI, transactional gameplay-source integration, actual T1–T4 balance,
independent reward tests, mobile UI and reviewed staged promotion pass.

## v12 — canonical gameplay receipt bridge (13 November 2026)

**Still hidden, branch-only, no migration applied to either environment.**
The companion migration
\`backend/supabase/migrations/20261113052000_party_event_canonical_sources_v12.sql\`
depends on v11 and adds a server-only atomic bridge
\`private.record_party_event_canonical_action_v12\`. This bridges the
v11 objective receipt ledger to **actual committed gameplay evidence**, not
caller-supplied time, quantity, account, role or performance reports.

- **Stage 2 — Secure Approach:** a successful recognized combat node from
  \`public.coop_node_results\` with the event's frozen character enrolled,
  real human participant ownership, current co-op access and at least two
  real party humans in the same run. Echo members, unsuccessful or
  noncombat nodes, outsiders and one-player runs cannot create evidence.
  A shared node may credit **one receipt per participating member** but never
  twice per member/source.
- **Stage 2 — Support Expedition** and **Stage 3 — Prepare Finale:**
  a canonical \`public.craft_receipts\` row for the same frozen member and
  a recipe with positive existing \`party_activity_weights_v16\` crafting
  weight. Craft receipts cannot impersonate Stage 1 scouting.
- **Stage 1 — Scout Route** remains **unwired** until we have an immutable
  server-verifiable scouting/gathering/exploration record. Do not substitute
  random client action buttons or fabricated evidence.

The v12 migration **revokes the service role's temporary direct INSERT**
on \`private.party_event_sources_v11\`. It grants the service role only
EXECUTE on the internal, private bridge; public/anon/authenticated have no
EXECUTE privilege. The bridge first locks the event week, derives canonical
source identity and real account from gameplay tables, verifies frozen
enrollment, inserts the unique source, and calls the existing v11 objective
receipt function within **one atomic SQL transaction**. A rejected call
rolls back the source insert as well.

An **exact retry** uses the already verified private receipt, so retries keep
working after co-op access expires, a run ends, a source is pruned or the event
closes. Changed source/action/request combinations are not accepted.
No event points, progress grants, rewards, inventory or cosmetics can be
created by this bridge: v11 still enforces \`event_points_awarded = 0\`.

**Verification:** On the separate Veldryn Staging 20260924 project, we
executed v11 migration + v12 migration + the dedicated v12 SQL regression
in a single transaction followed by \`ROLLBACK\`. The regression returned
**PASS**. It covers actual crafting and co-op source attribution, a shared
node credited separately to two real party members, wrong-member requests,
unsupported recipes, failed/merchant/solo encounters, unauthorized grants,
duplicate requests and replay after the run and event close. The v11 SQL
regression was also previously independently green in rollback-only staging.
Neither migration was permanently applied to staging or production.

**Remaining release blockers:** The application does **not yet call**
this bridge from any verified Party Event stage service; there are no live
Stage 1 source receipts, no atomic resource donations/EP ledger update,
no Day 8 once-only boss payout, no released pixel-art stage screens, and
no validated real T1–T4 class/companion/potion balance. The GitHub workflow
watches v12 files, but does not itself run a Supabase database suite without
configured database dependencies. Full CI must be checked separately.

**Do not merge, deploy, grant EP or switch release flags** until the
remaining verifiable gameplay and settlement integration is complete.
