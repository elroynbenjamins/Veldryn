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
`backend/supabase/migrations/20261113052000_party_event_canonical_sources_v12.sql`
depends on v11 and adds a server-only atomic bridge
`private.record_party_event_canonical_action_v12`. This bridges the
v11 objective receipt ledger to **actual committed gameplay evidence**, not
caller-supplied time, quantity, account, role or performance reports.

- **Stage 2 — Secure Approach:** a successful recognized combat node from
  `public.coop_node_results` with the event's frozen character enrolled,
  real human participant ownership, current co-op access and at least two
  real party humans in the same run. Echo members, unsuccessful or
  noncombat nodes, outsiders and one-player runs cannot create evidence.
  A shared node may credit **one receipt per participating member** but never
  twice per member/source.
- **Stage 2 — Support Expedition** and **Stage 3 — Prepare Finale:**
  a canonical `public.craft_receipts` row for the same frozen member and
  a recipe with positive existing `party_activity_weights_v16` crafting
  weight. Craft receipts cannot impersonate Stage 1 scouting.
- **Stage 1 — Scout Route** remains **unwired** until we have an immutable
  server-verifiable scouting/gathering/exploration record. Do not substitute
  random client action buttons or fabricated evidence.

The v12 migration **revokes the service role's temporary direct INSERT**
on `private.party_event_sources_v11`. It grants the service role only
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
created by this bridge: v11 still enforces `event_points_awarded = 0`.

**Verification:** On the separate Veldryn Staging 20260924 project, we
executed v11 migration + v12 migration + the dedicated v12 SQL regression
in a single transaction followed by `ROLLBACK`. The regression returned
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

## v13 — canonical Stage 1 gathering scout bridge (13 November 2026)

V13 extends the hidden v11/v12 backend with Stage 1 `scout_route`.
Its **private, service-only**
`private.record_party_event_idle_scout_v13` function verifies a row
in `public.idle_claim_receipts` using the immutable claim UUID,
server-owned character, activity ID, elapsed time, output, and settlement
time. It does not accept client-supplied quantities, actors, scores,
timestamps or fabricated source identifiers.

Scouting is valid only for an explicitly allowlisted mining, woodcutting
or fishing node. Initially the list contains the nine existing canonical
gathering node IDs; future node additions need separate canonical game
content verification. A completed claim must contain at least **60 seconds**
of activity, positive resources and nonnegative XP. The **entire claimed
interval** must have started after both the event stage opened and the
character enrolled, so players cannot bank pre-event AFK time and redeem it
as party scouting. The event must still be in Stage 1 for new receipts.

As with v12, v13 adds a unique evidence source and calls the v11 objective
receipt function in **one transaction**. One verified claim can only mint
one receipt, and one account gets one `scout_route` slot per event week.
A previously recorded exact request can replay after closure. The bridge
remains **0 EP and no reward grants**. Client roles cannot execute it;
`service_role` has no direct INSERT grant on source evidence.

**Validation:** V13 migration and its new SQL regressions passed on
the isolated Veldryn staging project in a single transaction followed by
`ROLLBACK`. Negative cases include 30-second attempts, zero output,
alchemy/unsupported activity, outsiders, fabricated UUIDs, pre-enrollment
banked time, duplicate claims and closed-week replays. A **combined test of
all three migration/test pairs, v11+v12+v13**, also passed in a rolled-back
staging transaction. No table or grant was permanently installed in staging
or production.

**Still to integrate before release:** The app/server currently does NOT
invoke the v13 function as part of a live Party Event stage; the new
allowlist must be checked against the active runtime's actual gathering
activity IDs. Finalize frozen-loadout saving, authoritative event week
activation, resource donation sinks, credited EP progression/caps,
Day 8 boss settlement and mobile pixel-art journal screens before any
feature flag, CI promotion or deployment. Keep PR draft.

## v14 — verified recurring Event Points and read-only stage readiness (13 Nov 2026)

This new hidden backend pass adds
`backend/supabase/migrations/20261113080000_party_event_verified_progress_v14.sql`
and `backend/supabase/tests/party_event_verified_progress_v14.sql`,
depending on the private v11–v13 ledgers. They are **committed to the
draft branch only**, with no migration applied to staging or production.

**What v14 credits:** Unique, server-verified gathering idle claims from
the nine audited Stage 1 nodes; actual weighted crafting receipts during
Stage 2 or 3; and successful co-op combat nodes with two or more human
party members during Stage 2. Membership, character, activity and event
times derive from server-committed tables. No client-provided seconds,
units, totals, account, party role or source ID are accepted. This
recurring activity ledger is **separate** from one-time v11 stage
objective receipts, so later valid activity can continue to earn EP
without creating duplicate objective completions.

**Point rules:** One EP per 900 verified seconds (15 minutes), with
integer seconds carried between receipts; a **40-EP verified-activity
cap per member per event week**, serialized by a row lock on the
private event-week record. A completed gathering claim uses actual
settled elapsed seconds (and only if its entire interval occurred
after enrollment/stage opening). Co-op combat grants at most one
15-minute-equivalent EP per successful eligible shared node to each
participating member. Crafting uses server-configured existing Party
activity weights and is conservatively capped to one hour/four EP
per crafting receipt to avoid bulk-prebanking abuse; its precise
time-equivalence remains a gameplay calibration item.

A unique canonical source ID and a unique request ID guarantee
exact-once credit; replay of the same verified credit is stable
even after the event or dungeon closes. Different requests cannot
re-credit it. Each credit records stage, actor, source, verified time,
points and the resulting carry in private append-only receipts.
`service_role` has read-only table grants and EXECUTE access to
`private.credit_party_event_activity_v14` only; player clients have no
direct access. There are **no coin, material, rank or chest grants**.

**Readiness:** `private.party_event_stage_readiness_v14` derives
member-count-adjusted progress targets directly from the v2 rules
(2/3/4 members: 100/135/170 EP). Stage thresholds use cumulative
25% / 75% / 100% targets, with the same half-up rounding as
`weeklyPartyBudget`. It reports verified activity points, the
remaining EP, stage, locked vote and blockers. It **never advances
a stage** and deliberately reports `requiredSuppliesVerified=false`,
`finaleVerified=false` and `stageReadyToAdvance=false`, even
when activity reaches its threshold. This is necessary because
transactional supply donations, special-action EP (existing
`PARTY_EVENT_SPECIAL_ACTION_LIMIT=20` per member) and the Day 8
boss completion proof are not implemented yet. In particular,
a 2-member group can reach at most 80 of its 100 target through
the 40/member verified-activity cap alone; no fabricated
completion or auto-advance is permitted.

**Verified on staging:** v14's SQL suite passed; an additional
**combined v11+v12+v13+v14 migration and regression run passed**
on Veldryn Staging 20260924. Everything was run under one
`BEGIN; ... ROLLBACK;` transaction, so there are no persistent
schema updates, test users, point receipts or grants in staging,
and no production deployment. It verifies 900-second carry,
exact replay, outsider/forged-source denial, pre-enrollment
banked gathering rejection, per-account cap, capped bulk craft,
shared co-op contribution, stage thresholds and no rewards.

**Still blocked:** Before enabling, route actual game activity to
this private RPC from the server (not mobile clients), implement
the separate verified objective/special EP and resource donation
ledgers, freeze supply orders and loadouts, evaluate/advance
stages transactionally only with satisfied proofs, and settle
the Day 8 boss exactly once with independently tested rewards.
Review the latest code/CI and real crafting-time data. Keep
Party Events feature flags OFF and PR #1045 draft.

## v15–v16 — verified special EP and actual supply consumption (13 Nov 2026)

These are **hidden draft-only** migrations and SQL regressions depending on
v11–v14, committed to PR #1045 but **not deployed**:

- `backend/supabase/migrations/20261113100500_party_event_objective_points_v15.sql`
  and matching `backend/supabase/tests/party_event_objective_points_v15.sql`.
- `backend/supabase/migrations/20261113114000_party_event_supply_donations_v16.sql`
  and matching `backend/supabase/tests/party_event_supply_donations_v16.sql`.

**Special objectives (v15):** A successful, immutable v11 receipt for
`scout_route`, `secure_approach`, `support_expedition` or
`prepare_finale` may be credited **exactly once**, granting a fixed
**5 special EP** to the enrolled account. There are exactly four
unique canonical slots per account per week, so the hard special
allowance is **20 EP per player**. No caller can provide a points
amount. Special EP credits are stored separately from the v11
immutable zero-EP objective evidence and the v14 recurring
activity ledger. Exact retries after week closure return the original
credit without granting again; late/new credits are rejected.
The v15 readiness projection combines recurring activity EP and
special EP against 2/3/4-player 100/135/170-point targets, but
cannot advance stages, complete a finale or mint a reward.

**Supply plans and burning (v16):** A private, append-only server-authorized
resource order fixes its item, category, required/optional status,
stage and quantity. The full order schema is private with RLS;
only the internal `freeze_party_event_supply_order_v16` function
accepts **enabled, canonical** item IDs and refuses to rewrite an
order's targets. Each material donation uses the private
`donate_party_event_supply_v16` function and a globally unique
request ID. It locks the event week, supply order and account's
`public.online_game_states` inventory, validates a **frozen
character enrollment**, consumes only unbound/unlocked inventory
stacks, updates the `inventory.stacks` JSON and revision, increments
the supply-order contribution and inserts an immutable donation
receipt in **one SQL transaction**. Any failure rolls back the
material burn, order progress and receipt together. It rejects
overfill, insufficient inventory, stale stages, unauthorized actors,
inconsistent retries, account-locked items and individually locked
or bound stacks. Identical retries remain safe after event closure.
It never awards Event Points for donated items (no double-counting),
currency, equipment or chest grants.

**Category integrity:** The current existing Guild supply catalogue
verifies the canonical **wood** and **ore** items. A canonical
`THORN_SAP` ingredient is present in Alchemy, but no audited
gathering source and live level availability have yet been confirmed.
The new private catalogue keeps that herb **disabled by default**.
Stage readiness requires frozen, fully funded **wood, ore and herb**
*required* categories before reporting
`requiredSuppliesVerified=true`. A missing herb cannot silently be
substituted by fish or ignored; optional preparation orders never
block. The SQL regression temporarily enabled the herb **inside
its rollback-only test transaction** to exercise a complete donation
flow. **This does not enable it in any environment.**
A stage can display `ready_for_manual_advance` when EP, supply
and vote criteria would be met, but
`stageReadyToAdvance` remains `false`: a reliable state-transition
RPC, validated full-week supply plan and boss settlement are not yet
shipped.

**Verification:** The v15 and v16 focused suites each passed on
Veldryn Staging 20260924. A **combined v11–v16 SQL suite** subsequently
passed in a single `BEGIN; ... ROLLBACK;` transaction on that
separate staging instance; it left no schema objects, user fixtures,
donations, inventory changes, objective points or rewards behind.
Regression cases cover objective 5-EP initial credit/zero-EP replay,
four-objective 20-EP cap, immutable v11 source, canonical material
availability, frozen targets, exact donation replay, request mutation,
locked/bound inventory, insufficient materials, overflow rejection,
private access, verified category coverage, threshold-only stage
readiness and closed-week behavior.

**Release blockers:** Match the 3-category resource catalogue to real,
level-appropriate live gathering data and regenerate actual v2
quantities for each family/difficulty/party size; connect gameplay
server activity/objective/supply mutations to these internal functions;
implement server-verified voting and safe stage transitions; finish
Day 8 combat evidence and one-time reward settlement; reconcile
staging/prod version compatibility, run GitHub CI and game balance
simulations, and build/test the mobile interface. Keep release flags
OFF, leave PR #1045 draft and do not run migrations on production.

## v17 — sealed supply plans, verified voting and transactional stages (13 Nov 2026)

The hidden draft-only v17 migration and rollback regression are
`backend/supabase/migrations/20261113131000_party_event_stage_transitions_v17.sql`
and `backend/supabase/tests/party_event_stage_transitions_v17.sql`.
They depend on private v11–v16 receipts and supply orders, and are not
connected to mobile, deployed to staging, or deployed to production.

**Closes the advancement bypass:** v11 initially granted `service_role`
direct UPDATE on the event-week record and stage record. V17 revokes
both direct UPDATE privileges, adds a guard to prohibit initial weeks
starting in Stage 2/3 or already closed, and replaces direct stage
advances with a single private service-only
`private.advance_party_event_stage_v17` transaction. That operation
locks the event week, supports exact replay from immutable transition
receipts, rejects conflicting requests and closed/incorrect stages,
and changes **only Stage 1→2 or Stage 2→3**. It checks the current
sealed plan, fully funded required supply orders, cumulative verified
EP (v14+v15), server-locked ballot where appropriate, and at least
one canonical verified `scout_route` (Stage 1) or both
`secure_approach` and `support_expedition` (Stage 2) receipt.
It updates the week, inserts the next stage opening and stores
the immutable transition proof in **one database transaction**.
Stage 3 is **never marked completed, settled or reward-eligible**.

**Sealed supply plans:** `private.seal_party_event_supplies_v17`
requires that all required **wood, ore and herb** resource categories
are represented by currently enabled canonical item IDs. It records
a stable SHA-256 hash of the stage's frozen order set. Once sealed,
the database blocks insertion of further required **or optional**
orders for that stage, while legitimate donations to existing orders
continue. No quantity can be redefined after sealing. The
`THORN_SAP` herb remains **disabled** by default: full-stage
transitions in SQL tests enable the herb **only in rollback-only test
fixtures**; a normal environment cannot finish a herb-gated stage
until audited live resource content exists. The order quantities
still require an authoritative server-side v2 budget/availability
planner and a full-plan correctness test before release.

**Majority/timeout ballots:** `private.cast_party_event_ballot_v17`
accepts one immutable ballot from a member of the frozen roster for
a valid family-specific Stage 2/3 option. A changed vote is rejected;
an exact retry is safe. `private.resolve_party_event_ballot_v17`
locks the canonical week/stage, counts ballots against that frozen
roster and only locks a choice upon strict majority (>50%) or an
actual six-hour timeout, with the designed family/stage default
choice at timeout. Direct stage-row UPDATE is no longer granted to
`service_role`, preventing the server from accidentally locking
an unsupported result. The service integration must still derive
voter identity from an authenticated game session; this private
function is not a public mobile endpoint.

**Readiness projection:** `private.party_event_stage_readiness_v17`
read-only output now agrees with the checked advance operation:
it includes `stageSupplyPlanSealed`,
`missingRequiredObjectives`, `stageReadyToAdvance` and detailed
blockers. It only reports `ready_to_advance` for Stage 1/2 when
the verified checklist is complete; Stage 3 stays
`awaiting_finale` even if EP and materials are sufficient.
It never grants items, currency, reputation, chests or completion.

**Verification:** The v17 regression passed on separate staging
inside a `BEGIN; ... ROLLBACK;` transaction. It covered unsealed
and incomplete category plans; unauthorized herb; frozen order
mutations; EP, supply and objective blockers; two-person majority;
outsider, invalid and changed ballots; six-hour timeout default;
exact transition retries after closure; Stage 1→2→3 flow; and
never settling Stage 3. All seven v11–v17 regression suites also
passed with **one SAVEPOINT per suite**, using a shared rolled-back
migration schema. The savepoints prevent v16's temporary test-only
herb enablement from leaking into later suite fixtures.

**Still blocked:** Production rollout needs genuinely available,
level-appropriate herb and other resource IDs; authoritative full
quantity freezing from the deterministic v2 planner; game-server
integration of service-only receipts, authenticated vote identity
and EP events; a real Day 8 boss combat proof and one-time reward
payout; app screens; and full CI/build review. Do not merge PR
#1045, enable its feature flag, or apply migrations to production.

## v18 — authoritative loadout freezing and Day 8 reservation (13 Nov 2026)

The draft-only hidden migration
`backend/supabase/migrations/20261113144000_party_event_finale_reservation_v18.sql`
and test
`backend/supabase/tests/party_event_finale_reservation_v18.sql`
extend v11–v17 without exposing a mobile route, granting any rewards,
claiming any victory or applying a migration to production or staging.

**Canonical member loadouts:** `private.save_party_event_boss_loadout_v18`
copies each frozen-roster character's published, active,
legal-equipment `public.coop_saved_loadouts` record. This source
is published by the authoritative gameplay service; normal
`authenticated` players cannot insert or update its underlying
database table. The private RPC accepts only party/week, the
enrolled account, existing loadout ID and expected revision;
it rejects stale/missing revisions, outsiders, unverified or illegal
gear, wrong character or class, mismatched source hashes and
post-close writes. It stores the copied canonical `stat_snapshot`,
`ability_snapshot`, capability tags, metadata, level and published
SHA-256 hash for every participant. Members can reselect a valid
source loadout before finale sealing, with exact-replay stability;
the private sealed copy is never changed by later edits to a
normal loadout. **The published snapshot hash is not yet the
runtime `FrozenPartyBossLoadout.snapshotHash`: the future boss
worker must independently adapt and verify its combat-engine
actor before simulation.**

**Preclose finale seal:** `private.seal_party_event_finale_v18`
can run only in active Stage 3 before the seven-day event closes.
It demands both v17 Stage 1/2 transition receipts, all three sealed
and fully funded required supply plans, the locked Stage 3 vote,
at least one verified `prepare_finale` objective receipt, cumulative
EP at the full party-size budget target, and one legal copied
loadout for every member of the frozen 2–4-person event roster.
It creates one append-only finale seal including party/week,
Stage 3 resource hash, vote, verified EP, roster count and a
stable aggregate of the copied loadout identities and hashes.
A replay returns the existing seal even after close; a later
change of normal game equipment cannot rewrite it. Incomplete
parties and partial-finalist reward policy are **not authorized**.

**Day 8 reservation without rewards:** The separate
`private.reserve_party_event_day_eight_v18` is the only
server-only attempt-reservation function. It requires that
the event has reached Stage 3, an immutable **preclose** finale
seal exists, and the clock is at least
`event_ends_at + 60 minutes`, matching the existing hidden
TypeScript boss engine's minimum settlement grace.
Exactly one attempt reservation per party/event is possible;
the same request can safely replay after closure, and a different
request conflicts. It does **not** accept a dungeon run,
player-victory flag, forged combat metrics, payout parameters
or a user-provided reward tier. There is **no boss win or
settlement RPC in this version**. The returned
`bossResultCommitted=false` and `rewardsGranted=false`
are intentional, not placeholders for granted rewards.

**Read-only Day 8 readiness** reports `preparing`,
`incomplete_at_close`, `waiting_for_day_eight`,
`ready_for_server_reservation` or
`reserved_for_server_boss`, plus the open timestamp and
permanently false reward-claim flags in this draft.
No client permissions are granted on any new private table.

**Verification:** The focused v18 SQL suite passed on Veldryn
staging inside a rolled-back transaction; it covers real staged
source-copy and change protection, illegal gear and outsiders,
per-player freeze, complete Stage 1→2→3 requirements, mandatory
resource burn, 2-person EP threshold, incomplete-roster rejection,
freeze replay, pre-Day-8 rejection, Day 8 one-attempt reservation,
post-close replay, and **no reward** invariants. All **eight**
migrations and isolated regression suites v11–v18 then passed
under one outer `BEGIN;` with a `SAVEPOINT` and rollback
per suite, and a final `ROLLBACK;` for the entire run.
Nothing persisted on staging; production was untouched.

**Next blockers:** Validate actual herb availability and party-specific
deterministic order quantities; connect the native game service to
the private v14–v18 functions with authenticated account identity;
convert canonical published loadouts to the verified combat-engine
snapshot contract; run the real **12-tier Day 8 combat simulation**
server-side and persist an immutable, independently validated
victory/participation proof; implement one-time entitlements and
chest redemption **only after** that proof and economic tests.
Keep Party Events hidden and PR #1045 draft/unmerged.
