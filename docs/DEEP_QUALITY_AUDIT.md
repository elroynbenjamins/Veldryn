# VELDRYN — Deep Application Quality Audit
**Static evidence review:** 2026-10-28 · **Repository:** `elroynbenjamins/Veldryn` · **Base:** `main@eb70bb3321964c824d4e4307c413bb8971745666` (2026-10-27 22:01 UTC)  
**Scope:** React Native / Expo mobile, server-authoritative gameplay, Supabase auth/SQL, co-op/Q-Mode, chat, inventory, timed crafting, guild, build gates. **No source code changed.**

> This is a source-evidence and risk audit, **not** a claim that every screen has been run or that production has been penetration-tested. The connected repository was inspected selectively by file; a complete checkout, Android device, database access, CI job logs and live performance profiles were not available. Scores below indicate an evidence-backed priority **for verification or implementation**, not an established live outage. No automated test was executed in this review.

## Classification
- **P0:** demonstrated critical security/data-loss/release blocker. **None verified.**
- **P1:** significant release, integrity, UX or performance risk worth addressing before broad rollout.
- **P2:** meaningful improvement, or focused regression coverage for a high-value user flow.
- **P3:** cosmetic or local maintainability cleanup.
- **Evidence:** **C** confirmed source fact/behavior; **R** mechanism inferred from code, not reproduced on device; **V** verification gap/QA hypothesis. A file being present is not evidence that a production deployment uses it.
- **Effort / Regression:** S = small, M = moderate, L = large; Low / Medium / High are qualitative.

## Baseline: protections that should be preserved
1. Missing chat module was **fixed on main** by commit `4a4961e`; `apps/mobile/src/components/ChatViewport.tsx` now exists. Do not carry the old missing-import claim forward.
2. `apps/mobile/src/online/useChatFeed.ts` uses account-scoped in-memory caches, foreground-only socket/fallback timers and channel cleanup; `src/core/chat-feed-cache.ts` coalesces in-flight reads and keeps prior messages on network errors. Avoid replacing this with blind per-channel polling.
3. `apps/mobile/src/core/processing.ts` calculates available recipe inputs across **all inventory and bank stacks**, reserves inputs up front, limits by time and materials, and bounds batches. A visible stack of six fish is not necessarily the total fish owned.
4. `apps/mobile/src/core/coop-command-journal.ts`, `src/core/online-game-repository.ts` and `backend/online/gameplay.ts` have pending-command and request-receipt patterns. Preserve idempotency; test exact-once semantics before changing.
5. `apps/mobile/src/screens/InventoryScreen.tsx` uses `FlatList`, explicit submission guards and loading/error feedback. Broad claims that inventory is unvirtualized or has no duplicate-tap protection would be inaccurate.
6. Production `EXPO_PUBLIC_SUPABASE_ANON_KEY` is a **publishable** client key, not by itself a leaked service-role secret. Server authorization and database grants remain the security boundary.
7. The recent Q-Mode documentation explicitly describes NPC fallback, real Echo priority and staged deployment; do not add duplicate NPC systems or assume an Echo is a separate persistent inventory loadout.

## Top 20 improvements, ranked
| Rank | ID | Priority | Evidence | Improvement | Effort | Regression |
|---:|---|:---:|:---:|---|:---:|:---:|
| 1 | Q01 | P1 | C/R | Require generation and validation of co-op Edge Function bundle | S–M | Low |
| 2 | Q02 | P1 | C/V | Establish a green **whole-app** typecheck and trustworthy CI result | M | Low |
| 3 | Q03 | P1 | C | Isolate development/preview writes from production Supabase | M | Medium |
| 4 | Q04 | P1 | C/R | Reconcile guild quest contributions after gameplay commit | M–L | Medium |
| 5 | Q05 | P1 | V | Verify deployed RLS, service-only RPC grants and private run access | M | Low |
| 6 | Q06 | P1 | C/R | Profile 2-second root renders and derived reward/badge work | M | Medium |
| 7 | Q07 | P1 | C | Enforce Android bundle/export and device-smoke release gates | M | Low |
| 8 | Q08 | P1 | C/V | End-to-end guest upgrade, email verification and Google linking | M | Medium |
| 9 | Q09 | P1 | C/V | Fault-injection and exact-once replay tests for critical online actions | M | Low |
| 10 | Q10 | P2 | C | Handle non-JSON/timeout/5xx API responses with actionable errors | S | Low |
| 11 | Q11 | P2 | C/R | Serialize local fallback save writes and guard stale command state | M | Medium |
| 12 | Q12 | P2 | C/R | Add recoverable, integrity-checked local backup generations | M | Medium |
| 13 | Q13 | P2 | C | Show offline/stale status for World regional progress | S–M | Low |
| 14 | Q14 | P2 | C | Make chat ONLINE status reflect connectivity, not mere configuration | S–M | Low |
| 15 | Q15 | P2 | C/V | Test chat switching, hidden reads, reconnection and 25-message limit | M | Low |
| 16 | Q16 | P2 | C/V | Clarify total recipe ingredients and max reservable batches | S | Low |
| 17 | Q17 | P2 | C | Raise tiny label/badge legibility and test font scaling | M | Medium |
| 18 | Q18 | P2 | C/R | Strengthen Q-Mode projection and numeric response validation | S–M | Low |
| 19 | Q19 | P2 | C/V | Confirm reward/event popups never interrupt unrelated actions | M | Low |
| 20 | Q20 | P2 | C/R | Incrementally isolate hot App/render orchestration and large screens | M–L | Medium |

## Finding records (problem, evidence, impact, solution, risk and acceptance)

### Q01 — Co-op deployable bundle is not present in source checkout
**P1 · C/R · Backend / release.** Evidence: `backend/supabase/functions/coop/index.ts` returns **zero bytes** on main; `backend/package.json` has `build:online` and `docs/implementation/qmode-npc-fallback.md` says this command must regenerate the bundle before deployment. Mechanism: deploying the tracked entrypoint *without* generation would not run the service. This **does not prove** the currently deployed Edge Function is empty. **Recommendation:** make generation, nonempty-file check, typecheck, bundle smoke and deploy provenance mandatory in the co-op deploy pipeline. **Effort S–M; regression Low; benefit High (release safety).** **Verify:** clean checkout → `pnpm --dir backend build:online` → assert entrypoint nonempty and starts with expected handler → isolated co-op HTTP smoke → verify deployed artifact SHA and rollback procedure.

### Q02 — Full mobile compilation release status needs a verified green baseline
**P1 · C/V · CI / whole mobile app.** Evidence: `.github/workflows/mobile-core-validation.yml` runs `pnpm typecheck`; latest `docs/implementation/qmode-npc-fallback.md` explicitly notes existing starter-companion type errors on main. The GitHub combined-status query yielded no status entries; no current job logs were obtained. **Impact:** a change can be validated in focused subsystems while release readiness is unknown. **Recommendation:** reproduce exact compiler diagnostics, repair only confirmed errors, retain both core and whole-app checks; publish a single required green build gate. **Effort M; risk Low; benefit High.** **Verify:** clean lockfile install and whole-app `pnpm typecheck`, backend `pnpm typecheck:online`, all required workflow jobs complete successfully at a fixed SHA.

### Q03 — Development and preview endpoints currently share production services
**P1 · C · EAS configuration / data integrity.** Evidence: `apps/mobile/eas.json`: `development`, `preview`, `production` point to the same Supabase project and co-op endpoint; a distinct `staging` profile already exists. **Impact:** test accounts, probes or destructive QA using those profiles can affect production unless carefully segregated. **Recommendation:** make preview use staging by default or explicitly label protected production-preview profiles and disable destructive QA there; document intentional production smoke tests separately. Do **not** rotate the public anon key just because it is in a client config. **Effort M; risk Medium (configuration rollout); benefit High.** **Verify:** build-profile matrix test checks endpoints, install each APK/AAB and inspect service project, validate production clients keep their original endpoint.

### Q04 — Guild quest contribution side effect is outside the gameplay commit
**P1 · C/R · Guild progression / backend transaction.** Evidence: `backend/online/gameplay.ts` commits through `commit_online_game_guild_pve_v1` then invokes `guild_quest_record_contributions_v1` inside a swallowed `catch` (lines ~80–82). **Mechanism:** a transient second-RPC failure can leave committed player progress without a recorded guild quest contribution; actual recovery/deduplication inside SQL has not been inspected. **Recommendation:** verify whether the guild RPC is already replay-safe; if not, add transactionally persisted intent/outbox or idempotent reconciliation keyed to the gameplay request, not blind retries that can double-credit. **Effort M–L; risk Medium; benefit High.** **Verify:** inject an error after first commit and before second RPC; retry/reconnect; assert exactly one gameplay reward and one guild contribution after reconciliation.

### Q05 — Live database trust boundaries require deployment-level proof
**P1 · V · Authorization / RLS.** Evidence: `backend/supabase/migrations/20261104000000_qmode_npc_fallback.sql` defines a `SECURITY DEFINER` Q-Mode start RPC and grants execute to `service_role`; mobile `src/online/coop-qmode-source.ts` reads `coop_run_client_snapshots` through an authenticated Supabase client. These are normal patterns **if** policies/grants are correct. No exploit has been demonstrated. **Recommendation:** inspect live grants, all historical policy migrations, schema/search_path and membership checks; exercise malicious authenticated client calls against another account/run. **Effort M; regression Low for read-only verification; benefit High.** **Verify:** unauthorized reads, mutations, cross-guild access and direct RPC calls are denied; authorized controller/participant access works; no private snapshot is returned to nonmembers.

### Q06 — Frequent root render touches many derived systems
**P1 · C/R · Home / Combat / navigation / battery.** Evidence: `apps/mobile/App.tsx` lines ~380–383 refresh `now` every 2 seconds on Home/Combat during activities; lines ~603–624 calculate activity previews, companion attention, forge status, event claims and navigation notifications in root render. **Impact:** possible avoidable JS work and child rerenders; **no frame time or battery measurements exist here**. **Recommendation:** instrument first, then memoize stable derived selectors or isolate a presentation clock into the consuming components; avoid adding global caches or speculative rewrites. **Effort M; regression Medium; benefit potentially High.** **Verify:** Hermes profile on low-end Android, 10-minute active Home/Combat and idle background; compare JS render durations, dropped frames, memory, CPU, battery proxies and behavior before/after.

### Q07 — Release CI does not demonstrate a full installable Android artifact
**P1 · C · Release operations.** Evidence: `.github/workflows/mobile-core-validation.yml` runs many meaningful unit/backend tests but does not run the existing `apps/mobile/package.json` `test:release-bundle` command or boot an installed AAB/APK. **Impact:** bundle resolution, native config, versionCode/upgradability and Play packaging can fail after logic tests pass. **Recommendation:** add separate release-candidate export/budget verification and install/launch smoke, with Android upgrade path checks; keep costlier EAS builds separate from each PR if appropriate. **Effort M; risk Low; benefit High.** **Verify:** clean release export under the existing size budget, native launch, critical tab navigation, one online request, versionCode monotonicity and in-place upgrade from last production AAB.

### Q08 — Guest-to-linked-account integrity merits an end-to-end gate
**P1 · C/V · Account onboarding / auth.** Evidence: `apps/mobile/src/online/account.ts` serializes auth mutations; `src/core/auth-account-link.ts` tracks verification and pending password; `src/online/AuthSessionProvider.tsx` orders account/session transitions. These are thoughtful safeguards, not proof of an active bug. **Impact if regressed:** users may perceive a verified account as still guest or switch identity and lose apparent continuity. **Recommendation:** test complete auth lifecycle on a real installed build and two devices, including cancelled links, reused magic links and foreground changes; change code only on failing cases. **Effort M; regression Medium if modified; benefit High.** **Verify:** stable user ID and save across guest → verify → password → relaunch → Google link; misleading states impossible; account switch never exposes previous user data.

### Q09 — Critical command transport needs fault-injection evidence
**P1 · C/V · Economy / inventory / co-op.** Evidence: `apps/mobile/src/core/coop-command-journal.ts` persists pending POSTs, `src/online/gameplay.ts` saves pending game commands, and `backend/online/gameplay.ts` checks idempotency receipts/version. **Recommendation:** preserve the existing design, add a cross-feature fault matrix for timeout before/after server commit, 409, 429, 500/503, app kill and account switch; audit guild, shop, bulk bank, reward claims and co-op separately. **Effort M; risk Low for tests; benefit High.** **Verify:** each logical request credits/debits at most once, pending recovery is visible, next command cannot supersede an unresolved one, and a definitive failure is cleared.

### Q10 — Non-JSON responses leak low-level errors to players
**P2 · C · Online gameplay and co-op.** Evidence: `apps/mobile/src/online/gameplay.ts` and `src/online/coop-client.ts` both unconditionally call `response.json()` after fetch; the co-op profile-power endpoint does likewise. **Mechanism:** HTML 502, empty 204/503, proxy error, malformed body throws a JSON parsing error before status-aware feedback. **Recommendation:** parse defensively with content-type/body-size limits, preserve request ID and HTTP status, map timeout/offline/service failure to user-facing retry states; do not log tokens or response bodies. **Effort S; risk Low; benefit Medium–High.** **Verify:** mocked 502 HTML, 503 empty, truncated JSON, timeout, 401 and 409 all produce appropriate errors and retain idempotent pending actions.

### Q11 — Local fallback state writes have ordering exposure
**P2 · C/R · Offline/local-game path.** Evidence: `apps/mobile/App.tsx` local actions sometimes call `void commit(result.state)` and use render-captured `state`; `commit` updates memory before awaiting `repo.save`; `src/storage/async-storage-repository.ts` writes directly via `AsyncStorage.multiSet`. **Mechanism:** rapid local actions and slow storage writes could reorder persisted snapshots. Production server-owned actions follow a different path; **do not imply production economy duplication from this finding**. **Recommendation:** serialize local transactions using latest `stateRef` and revision tokens, and coalesce superseded writes safely. **Effort M; regression Medium; benefit Medium.** **Verify:** delay storage write A, issue B, restart; final persisted state reflects B; no lost resources.

### Q12 — A corrupt local save has no proven secondary generation
**P2 · C/R · Local recovery.** Evidence: `src/storage/async-storage-repository.ts` reads and `JSON.parse`s one `veldryn.local.save.v1` key; `App.tsx` does display a `SaveRecoveryScreen` with retry/start-fresh and supports manual export/import. **Recommendation:** retain the recovery UI and add optional previous-good checkpoint / checksum and explicit restore path for local-only gameplay; validate migrations before replacing good data. **Effort M; regression Medium; benefit Medium.** **Verify:** inject truncated JSON and failed write, restart, restore last valid snapshot without silent reset.

### Q13 — World progress can silently use local fallback after network failure
**P2 · C · World / Frostmarch.** Evidence: `apps/mobile/src/screens/WorldScreen.tsx` fetches server Frostmarch progress/version; its `catch` clears both, and UI falls back to `frostmarchProgressFromState(state)` without a visible stale-source indicator. **Impact:** a user may mistake stale progress for server-confirmed progress. **Recommendation:** show a compact `Offline / last synced` status plus retry only where progress can differ; preserve local fallback to avoid a blank World. **Effort S–M; risk Low; benefit Medium.** **Verify:** disconnect before opening Frostmarch; source status visible and retry restores server state.

### Q14 — Chat ONLINE badge is not a connection-health signal
**P2 · C · Chat overlay.** Evidence: `apps/mobile/src/components/ChatOverlay.tsx` displays `ONLINE` when `onlineConfigured` is true, regardless of current socket status or recent request failures. **Recommendation:** call this `Online chat` (capability) or bind a real connected/reconnecting/offline state from the existing feed; never invent live presence. **Effort S–M; risk Low; benefit Medium.** **Verify:** airplane mode while chat open changes messaging appropriately; channel history remains visible and retry is available.

### Q15 — Chat correctness across channel/account transitions needs device regression proof
**P2 · C/V · World / guild / party / unread.** Evidence: `src/online/useChatFeed.ts` includes 15s fallback/60s watchdog, batching and account cache invalidation; `src/components/ChatOverlay.tsx` preserves visited panels but resets initial visible channel to World on open. **Recommendation:** test rapid channel switching, 25-message history, same-height viewports, blocked players, background/foreground, changing guild membership, and account switching; only optimize after failures/profiling. **Effort M; regression Low for tests; benefit Medium–High.** **Verify:** messages persist correctly, never leak across accounts, unread remains until visible, no duplicate sends, and no unnecessary full-history fetch loop.

### Q16 — Crafting resource totals need clearer UI wording
**P2 · C/V · Cooking / crafting / inventory.** Evidence: `src/core/processing.ts` sums identical item IDs across all inventory **and bank stacks** and exposes `maxBatches`; an individual inventory stack does not describe the total. **Recommendation:** show `available inventory + bank`, the per-batch ingredient cost, and `Max N batches (limited by materials/Gold/time)` on the relevant skill action; do not cap to visible stack size. **Effort S; risk Low; benefit Medium.** **Verify:** fish across 3 partial/full stacks, bank-only fish, one-batch shortage, and AFK cap yield the same UI count and reserved server amount.

### Q17 — Small chat metadata needs a legibility floor
**P2 · C · Chat / accessibility.** Evidence: `src/components/ChatOverlay.tsx` styles `onlineText` at `fontSize:7` and `badgeText` at `9`; active accessibility work elsewhere does not prove all major views meet touch/readability standards. `GameButton.tsx` already refers to shared touch-target minima. **Recommendation:** apply a shared minimum for functional labels, screen-reader labels for unread statuses, and font-scale snapshots at 1.0/1.3/1.5 on 320–360dp screens. **Effort M; risk Medium (layout); benefit Medium.** **Verify:** critical text legible in all 3 themes, no clipped rail/badges, 44–48dp touch targets or intentional equivalent, VoiceOver/TalkBack focus order.

### Q18 — Q-Mode external projection parser is only shallowly checked
**P2 · C/R · Co-op resume / data contracts.** Evidence: `apps/mobile/src/online/coop-qmode-source.ts` validates top-level arrays/objects but casts nested JSON to `CoopQModeServerProjection`; `state_version` and `event_cursor` are converted via `Number` without integer/range checks. Server-generated data is expected to be valid, but malformed responses happen during rollout. **Recommendation:** validate nested discriminants and safe nonnegative counters at transport boundary with narrowly scoped parsing, not a large schema framework. **Effort S–M; risk Low; benefit Medium.** **Verify:** null member, invalid role, `NaN` counter, stale version, partial projection and valid older-version snapshot return controlled recovery/compatibility behavior.

### Q19 — Non-action reward interruptions require explicit regression scenarios
**P2 · C/V · Chat / profile / events / reward UX.** Evidence: `src/core/command-progress-feedback.ts` deliberately limits the collected reward popup to `claim` commands; `App.tsx` separately has event-start, customization/unlock, mastery and preparation notice paths, including event sync on foreground and every 60 seconds. This is **not proof** of unwanted popups now. **Recommendation:** create an interruption matrix for chat switching, profile edits, inventory filters, guild navigation and app resume, checking every popup source. Use inline acknowledgments for background notices where possible; retain meaningful event/claim moments. **Effort M; risk Low for tests; benefit Medium.** **Verify:** non-reward navigation never blocks on reward modal; explicit claims and first eligible event announcement still work exactly once.

### Q20 — Large orchestration modules increase regression surface
**P2 · C/R · Maintainability / render isolation.** Evidence: `apps/mobile/App.tsx` is ~97 KB and `src/core/game.ts` ~111 KB; `src/screens/InventoryScreen.tsx` ~58 KB. File size alone is not a bug. **Recommendation:** extract **only** cohesive hot-path state selectors, effects/command routing and inventory modal logic behind existing interfaces, with characterization tests and no user-visible redesign. Avoid full-stack rewrite, new state manager or broad component atomization. **Effort M–L; risk Medium; benefit Medium.** **Verify:** same command fixtures, snapshots, bundle budget and navigation coverage; diff limited to behavior-neutral modules.

## Security and data integrity: current assessment
- **Supported by code:** server gameplay authenticates bearer tokens, validates commands and input shape, uses version and request receipts; co-op start SQL grants server-only execution. That is a positive baseline, not a production security certification.
- **Still unverified:** all historical RLS policies, direct client table grants, membership-scoped reads, revoked guild membership, session expiration, deployment secrets, actual live migration state, connection pooling/indexes/query plans and response/log redaction.
- **Critical adversarial tests:** modified JWT/expired token; one account requesting another account's run snapshot, guild roster or settings; requestId reuse with different body; simultaneous bank/forge/claim; malformed server replies; partial guild contribution failure. Do not label any of these as confirmed exploitable until reproduced.
- **Do not rotate the publishable key merely for being visible in the Expo client**; instead check secret/service-role handling on the server.

## Performance and operational measurement plan
**No device measurements in this audit.** Record a baseline at the current SHA on one low-end and one typical Android handset: cold/warm startup, Home/Skills/World/Inventory/Character navigation p50/p95, JS dropped frames and render counts, memory peak, network requests by route, list scroll frame rate, 10-minute background/foreground activity and AAB size. Use existing `src/core/network-request-metrics.ts` for aggregate request counts; it does not include websockets, native purchases or non-Supabase traffic. Compare only controlled before/after captures, keep raw tokens and personal data out of logs.

## Reliability verification matrix
| Failure injection | Critical journey | Required invariant |
|---|---|---|
| Slow 3G / 25s timeout / HTML 502 | Gameplay and co-op action | Pending intent retained, clear error, no double reward |
| Kill after server commit before response | Bank transfer, crafting claim, dungeon claim | Replay identical request once |
| Two taps/overlapping routes | Bulk sell/withdraw, queue, ready check | One authoritative mutation |
| Device sleep 24h / DST / UTC reset | AFK, Trials, events, guild weekly | No negative or double time/rewards |
| Auth switch during fetch | Chat/profile/gameplay | No cross-account results or actions |
| App offline 10m → reconnect | World, chat, guild, account | Stale state labeled; retry succeeds |
| Large item/profile history | Inventory/profile | Acceptable p95 scroll/interaction and memory |
| Corrupt JSON / interrupted write | Local-only save | Recover without silent overwrite |
| Empty Echo donor pool | Q-Mode | NPC fallback, no fabricated user records, claim once |
| Wrong guild / revoked membership | Chat, private snapshots, guild quests | RLS denies and client clears stale access |

## Quick wins (low implementation risk; verify before landing)
1. Fail packaging if the generated co-op entrypoint is missing/empty; print the exact artifact path and Git SHA.
2. Add error-response parsing tests for HTML 502 / empty 503 in both online clients.
3. Label chat connectivity honestly when configured but disconnected.
4. Add `inventory + bank / required per cycle / max batches` to processing preview.
5. Add a World `showing local progress` status on version/progress fetch errors.
6. Validate Q-Mode counters are finite safe integers before storing them in state.
7. Add screenshot checks for unread badge/online pill at 1.5x text.
8. Pin the backend and mobile typecheck status visibly for every release candidate.

## Recommendations **not** justified now
- **Do not rewrite** React Native/Expo into another engine, rebuild state management globally, or split every file solely because it is large.
- **Do not replace** 25-message chat with an infinite history, or increase polling frequency: current cache/realtime/fallback safeguards are deliberate.
- **Do not add** Redux/React Query or a global cache without a profiled repeat-fetch problem.
- **Do not add** destructive automatic inventory cleanup or change recipe math to use only the displayed stack.
- **Do not make** Q-Mode NPCs synthetic player/character accounts; the new design explicitly avoids this.
- **Do not** automatically compress/remaster all assets without observing AAB size, image decode cost, pixel-art quality and visual regressions.
- **Do not assume** the August 2026 supplied `veldryn_backend_v2.1` archive describes current live server behavior (it includes obsolete market-era systems).
- **Do not treat** the tracked empty Edge bundle or current compilation note as proof the production deployment is broken; verify build and deployment provenance.

## Readiness gates for implementation
Before implementation: reproduce Q01/Q02 on a clean CI runner and capture Q06 baseline; before migration/RPC changes: run SQL integration tests against isolated staging and snapshot rollout/rollback plans; before merge: focused tests + full mobile/backend typecheck; before production: AAB upgrade/install smoke, auth linking, economy/co-op fault injection, client/server version compatibility, and monitoring. Prefer one bounded change per PR.

## Evidence index (main)
- `apps/mobile/App.tsx` — command rendering, local commits, timers, reward modals, full navigation.
- `apps/mobile/src/online/{useOnlineGame.ts,gameplay.ts,account.ts,AuthSessionProvider.tsx,useChatFeed.ts,coop-client.ts,coop-qmode-source.ts}`.
- `apps/mobile/src/core/{processing.ts,chat-feed-cache.ts,coop-command-journal.ts,command-progress-feedback.ts,game-commands.ts,network-request-metrics.ts,auth-account-link.ts}`.
- `apps/mobile/src/storage/async-storage-repository.ts`; `apps/mobile/src/components/{ChatOverlay.tsx,ChatViewport.tsx,GameButton.tsx}`.
- `apps/mobile/src/screens/{WorldScreen.tsx,InventoryScreen.tsx,SettingsScreen.tsx,ProfileCustomizeScreen.tsx}`.
- `backend/online/{gameplay.ts,qmode-runtime.ts}`; `backend/supabase/migrations/20261104000000_qmode_npc_fallback.sql`; `backend/supabase/functions/coop/index.ts`.
- `apps/mobile/{package.json,app.json,eas.json}`; `backend/package.json`; `.github/workflows/mobile-core-validation.yml`; `docs/implementation/qmode-npc-fallback.md`.

**Companion plans:** [OPTIMIZATION_BACKLOG.md](OPTIMIZATION_BACKLOG.md) and [UX_REFINEMENT_BACKLOG.md](UX_REFINEMENT_BACKLOG.md).