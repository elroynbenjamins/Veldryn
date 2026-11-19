# World Boss branches — consolidation register (19 November 2026)

**Canonical hidden integration branch:** `feature/party-world-chest-reward-catalog-v1-20261118` ([draft PR #1407](https://github.com/elroynbenjamins/Veldryn/pull/1407)).

**No PR was merged into `main`; no Supabase migrations, production deployment, World Boss feature activation, new public player action or live claims.** All work remains prerelease. The canonical branch has been synchronized with current main; verify again before any eventual rollout.

## Consolidation record

| Workstream | Source | Resolution on canonical hidden branch |
|---|---|---|
| Main synchronization | [#1421](https://github.com/elroynbenjamins/Veldryn/pull/1421) | Merged **main INTO** hidden #1407 branch. No reverse merge. |
| World Boss incident/lease stop and private action | [#1396](https://github.com/elroynbenjamins/Veldryn/pull/1396) → [#1422](https://github.com/elroynbenjamins/Veldryn/pull/1422) | Exact branch integration through #1422. Original #1396 closed, branch kept for history. |
| Gathering equipment sets, V64/V65 exact rolls | [#1402](https://github.com/elroynbenjamins/Veldryn/pull/1402) | Catalog already copied into V58–V67 chest pipeline; original test matrix ported to `backend/src/server/combat/__tests__/world-boss-gathering-regression-v64.ts` and hidden CI. Historical design archived with supersession warning. Original #1402 closed. |
| Private erasure recovery | [#1391](https://github.com/elroynbenjamins/Veldryn/pull/1391) | Conflict with shared World Boss validation workflow; selectively ported V59 lease SQL/smoke/race runner/notes, V36 privacy preflight account-column extension, and merged hidden CI steps. Closed original #1391 and temporary conflict PR #1423. |
| Auth and V57 erasure-fence account-read | [#1387](https://github.com/elroynbenjamins/Veldryn/pull/1387) | Conflict with shared workflow and V51 overview test; selectively ported private V58 reader, SQL smoke, privacy notes and exact missing regression assertions; merged CI without replacing newer V61/V63 protections. Closed original #1387 and temporary conflict PR #1424. |
| V58 replay presentation, tonic combat changes | World Boss/Party gameplay branch → [#1425](https://github.com/elroynbenjamins/Veldryn/pull/1425) / [#1426](https://github.com/elroynbenjamins/Veldryn/pull/1426) | Synced gameplay branch to main and merged its distinct replay/tonic source and tests into hidden #1407, not main. Original source branch retained. |
| Party Events equipment/chests | Existing #1407 | Remains alongside World Boss in hidden release-catalog PR; no Party Event public release or grant route. |
| World Boss/Rankings history | [#1067](https://github.com/elroynbenjamins/Veldryn/pull/1067), [#1219](https://github.com/elroynbenjamins/Veldryn/pull/1219) | **Not** merged by this consolidation. These broader Rankings drafts have independent dependencies, migration and UI approval; do not fold them into the World Boss runtime without separate review. |

**Authoritative rewards design:** at most three **earned** event/account World Boss chests (War Camp, three proven attacks, 70% shared damage plus personal proven attack). Each earned chest has **1% chance** for a rollable 10-slot boss-specific gathering item, not a guaranteed item or a 1% chance to earn a chest. The earlier V64 guaranteed-piece proposal is superseded. The 80-World-Sigil choice quote in V58 is disabled, not an approved purchase. No chest mints World Sigils. Existing V28 World Sigils are separate. The V64 loot catalog remains source of boss equipment piece IDs, quality and gathering-only rolls.

## Post-consolidation safety gates

- **Global hidden activation fence** now checks V58 private reader/tonic/chest catalog, V59 proof, V60 roll, V61 gateway, V62 item issuer, V63 private PG adapter, V64 gathering catalog and V67 tier policy, plus V62–V65 private action modules. The CI workflow watches all relevant paths and requires self-tests.
- **Dedicated chest CI** includes original V64/V65 30-piece/rarity/bonus regression matrix plus V58–V67 chest source, one-time payout and simulated PG rollback tests. 
- **Original hidden World Boss CI** includes V57 write fence, V58 Auth/fence private read, V59 erasure-recovery race proofs and V61/V63 incident/attestation smoke after the original V17/V27/V28 proof suites.
- **All SQL prototypes** stay in `docs/roadmap` or `docs/operations/sql-drafts`, never in executable `backend/supabase/migrations`.
- **No production readiness inferred from a merged development branch.** GitHub Actions latest-head execution, real two-connection PostgreSQL races, SQL privilege reviews, V57/V55/V56 erasure propagation into V61/V67 tables, release-tier/equipment economy correctness, Android 320dp/TalkBack flows, staging data shape/permission parity, error/stop control rollout and end-to-end payouts still require verification.
- All orphaned source branches are retained; **closed PR ≠ branch deletion**. No force-push, no main reset, no client Service Role key or live event activation.

## Next consolidation decision

Once tests actually pass, consider splitting #1407 into **World Boss backend safety/rewards** and **Party Event chest UI/prototypes** for smaller review units; keep the canonical 1% gathering rule and all disabled gates intact. Do not flip release flags just to make tests pass.

## Review split completed — 19 Nov (following consolidated audit)

**Party Event draft:** [#1429](https://github.com/elroynbenjamins/Veldryn/pull/1429) targeting `main`; branch `review/party-event-chests-equipment-v51-v60-20261119`. Extracted Party Event V51 eight sets, three chest types, V59 combat hooks, V60 hidden grant gateway, shared cryptographic V1 entropy and a Party-only static QA treasure preview. Its own `event-chest-catalog-hidden.yml` compiles Party-only `tsconfig.event-chests.json` and runs focused Party checks, never World Boss modules. All public/production gates remain disabled.

**World Boss draft:** [#1407](https://github.com/elroynbenjamins/Veldryn/pull/1407) now targets **the Party Event branch**, not `main`. Its tree remains the same after an ancestry-only two-parent merge: World Boss-specific backend, private erasure/stop protections, item custody/roll policy, SQL drafts, and World Boss QA/CI remain intact. Shared party files are now base-branch dependencies, not independently reviewed in #1407. Reviewing/merging directly to `main` out of order would be inappropriate. **Do not merge #1407 before #1429 is reviewed and its base is safely advanced to `main`.**

**CI correction:** the pre-split #1407 `chest-contracts` job failed TypeScript compilation due CommonJS top-level `await`, fixture assertion narrowing and a redundant gear-hook union comparison. Those errors were corrected on the hidden World Boss branch before the split; the Party branch includes the corrected Party files. This is a *source fix only*: new exact-head CI results must be checked before claiming tests pass. The separate hidden release-boundary job previously completed successfully.

**Outstanding shared dependencies:** the Party V60 and World Boss V61/V63 reward gateways are nonpaying fixtures. They require real owner-authenticated account receipts, the durable Equipment 2.0 item issuer, final account wallet/Inbox, V57 account-erasure gating, regression tests with two independent real PostgreSQL sessions, and Android visual/accessibility QA. No staging or production migration, rollout, or feature flag change was made during this split.
