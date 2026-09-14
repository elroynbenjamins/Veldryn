# VELDRYN v16 implementation report

Implemented on 2026-09-12 in `C:\Users\elroy\OneDrive\Documents\ChatGPT\Veldryn`, using the existing v15 checkout as the source of truth. The supplied ZIP's `START_HERE_CODEX.md` and `PARTIES_CONTRACTS_GUILD_SEEKERS_V1.md` were read before inspecting and editing the repository. The ZIP was extracted separately for comparison; it was not unpacked over the checkout.

The implementation is present in the repository and both v16 migrations have been applied to the already-linked Veldryn Supabase project. The current expanded repository run passes **74/74 checks**. The follow-up online gameplay deployment and verification are documented in [ONLINE_GAMEPLAY_STATUS.md](ONLINE_GAMEPLAY_STATUS.md). The historical progression fixture failure below has been resolved; native and fresh-database validation limits still prevent a complete release sign-off.

## Implemented behavior

- Persistent Parties have 1–4 current members, allow any role mix and Combat/Skilling/Mixed focus, enforce one current Party per account, and support authenticated create/join/leave with replay receipts and concurrent capacity protection. Empty Parties disband; leaving leaders are replaced by a current member.
- Live Dungeon matchmaking remains a separate system using the existing exact **1 Tank / 2 Damage / 1 Support** validators. The legacy generic expedition helper is preserved.
- Weekly Combat, Skilling and Mixed Contracts and a ranked mini-event sample are seeded. Scoring uses expected activity time, setup/preparation effort and difficulty; objective credit is capped. All seeded objective budgets are checked against the TypeScript formula.
- Server-verified gathering, crafting and combat receipts drive contributions. Canonical activity weights cover 445 existing activity/recipe/encounter entries. Shared combat credit is split across participating human accounts within the same persistent Party, excluding Echoes; the two existing combat receipt formats cannot credit one node twice.
- Completion creates reward entitlements only for members meeting the personal contribution minimum: 8% for weekly Contracts, 10% for the ranked sample. Zero/below-threshold contribution is ineligible. Claims credit the existing Gold wallet atomically; launch weekly/sample ranked budgets are 100/50 Gold. Account/definition/season reward receipts prevent repeated payouts through Party hopping. No new Party currency is introduced.
- Ranked events use validated event windows, normalized score and deterministic ordering. Weekly instances use UTC week boundaries. Maintenance assigns new weekly Contracts and expires old instances/adverts.
- One Recruitment board supports individual LFG, Party LFM, Guild seekers and Guild recruiting. Party adverts last one day; Guild adverts default to three days and allow one or three. Server search/filtering applies before pagination, with immediate expiry exclusion, role/focus/tags/activity/language/region/level/open-slot filters, and actual Party capacity projections.
- Publishing and refreshing share a six-hour cooldown; close/repost and concurrent Guild officers cannot bypass it. Superseded adverts cannot be refreshed. Joining a Party/Guild or filling/disbanding a Party closes obsolete adverts. Existing block relationships filter discovery and prevent blocked Party joins.
- Mobile Social integrates Party creation/join/leave, Contract/personal contribution/reward state, Recruitment search/composition/details/refresh/close, Guild seeker browsing, rankings and tutorial copy. Existing Friends and Guild management remain reachable. The five primary tabs are Character / Skills / World / Inventory / Account; Home remains accessible through Account and saved shortcuts.
- The existing chat overlay gains membership-gated Party Chat. Database reads/writes revoke access as soon as membership ends; the client refreshes after local actions, foreground and chat open, and polls membership every 15 seconds while active. Blocks, moderation and existing Live Chat run/epoch authorization are preserved.

## Exact files changed

Paths below are relative to the repository root stated above. No tracked files were deleted.

| Changed file | Purpose |
| --- | --- |
| `apps/mobile/App.tsx` | Mount shared Party state and Social screen; integrate five-tab navigation. |
| `apps/mobile/package.json` | Add full typecheck/v16 test scripts; align four dependencies with Expo 53. |
| `apps/mobile/pnpm-lock.yaml` | Lock the compatible Expo dependency tree. |
| `apps/mobile/src/components/ChatOverlay.tsx` | Reuse existing overlay for gated Party Chat. |
| `apps/mobile/src/components/GameTopBar.tsx` | Social/Party shortcut icons. |
| `apps/mobile/src/components/PrimaryNavigationIcon.tsx` | Skills navigation icon support. |
| `apps/mobile/src/core/quick-navigation.ts` | Add Social/Party destinations without removing saved destinations. |
| `apps/mobile/src/screens/MoreScreen.tsx` | Account label and Social/Home entry points. |
| `apps/mobile/tests/dashboard.ts` | Use current pacing and canonical monster XP. |
| `apps/mobile/tests/playability.ts` | Respect current travel gates and forecast-based settlement. |
| `apps/mobile/tests/progression-balance.ts` | Repair travel/gear/preparation assumptions; retain historical time assertion. |
| `apps/mobile/tests/progression-v6.ts` | Match current Moss Rat encounter duration. |
| `apps/mobile/tests/set-bonuses.ts` | Prepare the current full novice set at its actual level/gold requirements. |
| `backend/package.json` | Add Party v16 and Recruitment test scripts. |
| `backend/src/server/api/contracts.ts` | Append authenticated v16 and trusted-only action contracts; retain legacy names. |
| `backend/src/server/social/party.ts` | Extend existing Party module with persistent Party policy; reuse Live role invariants. |
| `docs/implementation/README.md` | Link current v16 contract and verification report. |

## Exact files added

| Added file | Purpose |
| --- | --- |
| `apps/mobile/src/components/GuildSeekerPanel.tsx` | Guild seeker results and posting entry. |
| `apps/mobile/src/components/OnlinePartyChat.tsx` | Authenticated Party messages and send/retry handling. |
| `apps/mobile/src/components/PartyChatGate.tsx` | Shared current-membership gate. |
| `apps/mobile/src/components/PartyHubPanel.tsx` | Party roster, Contracts, contribution/rewards and discovery. |
| `apps/mobile/src/components/RecruitmentComposer.tsx` | Four advert types and their supported fields. |
| `apps/mobile/src/components/RecruitmentFiltersPanel.tsx` | Server search/filter controls. |
| `apps/mobile/src/components/SocialHubPanel.tsx` | Social subnavigation. |
| `apps/mobile/src/core/party-social.ts` | UI projections, expiry/filter helpers and tutorial text. |
| `apps/mobile/src/online/PartySocialProvider.tsx` | Auth/membership lifecycle, refresh and stale-response protection. |
| `apps/mobile/src/online/party-social.ts` | Concrete Supabase repository and chat/reward/ranking adapters. |
| `apps/mobile/src/screens/SocialScreen.tsx` | Wire Social UI actions to existing authenticated services. |
| `apps/mobile/tests/party-social-v16.ts` | Membership gates, expiry and combined recruitment filters. |
| `backend/src/server/party/__tests__/party-v16.ts` | Persistent/Live boundaries, scoring, anti-leech, replay and ranking tests. |
| `backend/src/server/party/party-contracts.ts` | Expected-effort Contract domain and seeded definitions. |
| `backend/src/server/social/recruitment-ui.ts` | Recruitment presentation helpers. |
| `backend/src/server/social/recruitment.test.ts` | Expiry, filtering and owner/entity cooldown tests. |
| `backend/src/server/social/recruitment.ts` | Shared Recruitment domain rules. |
| `backend/supabase/migrations/20261010000000_parties_contracts_guild_seekers_v1.sql` | Core v16 schema, RLS, RPCs, settlement, content and maintenance. |
| `backend/supabase/migrations/20261010000001_party_social_v15_safety.sql` | Existing blocks/moderation, shared combat credit and cross-format deduplication. |
| `backend/supabase/tests/party_v16.sql` | Rollback-only PostgreSQL integration suite. |
| `backend/supabase/tests/party_v16_safety.sql` | Rollback-only v15 compatibility/authorization suite. |
| `docs/implementation/PARTIES_CONTRACTS_GUILD_SEEKERS_V1.md` | Adapted v16 contract with actual integration status. |
| `docs/implementation/V16_IMPLEMENTATION_REPORT.md` | This report. |
| `docs/implementation/v16-verification/repository-checks.json` | Full output/status for the expanded repository checks, including subsequent online tests. |
| `docs/implementation/v16-verification/concurrency.json` | Actual two-session race results and isolated fixture cleanup. |
| `docs/implementation/v16-verification/final-checks.json` | Final mobile/database/Expo evidence and validation limits. |
| `tools/check-v16.mjs` | Reproducible expanded repository test runner. |
| `tools/test-v16-concurrency.mjs` | Linked-database races using disposable random fixtures. |
| `tools/verify-v16-migration.mjs` | Static migration invariant audit. |

Ignored compilation/export/scratch outputs are not source additions. The unrelated untracked `output/veldryn-pixel-ui-kit-v1/` work that appeared during this task was not edited or included in this implementation.

## Migration chain and safe application

Linked project: `nyjwigipamnvpdvpauuv` (Veldryn).

1. The remote migration history originally ended at `20260923000000`. The existing pending `20260924000000` equipment migration was applied unchanged first.
2. Added and applied `20261010000000_parties_contracts_guild_seekers_v1.sql` after inspecting existing schemas/policies, running a rollback application plus integration tests, and a linked push dry run.
3. Added and applied `20261010000001_party_social_v15_safety.sql` after rollback compatibility tests and a linked dry run. This is an appended follow-up; the already-applied main v16 migration was not rewritten.
4. Re-ran both SQL suites against the final applied schema. Final `supabase db push --linked --dry-run` returns `upToDate: true` and an empty migration list. Final linked schema lint reports no errors.

No older migration was edited, renamed or removed. Existing `parties`, `party_members`, `server_action_receipts`, `chat_messages`, Guild membership, `player_blocks` and `character_wallets` are reused. The main migration aborts if existing membership data would violate its invariants instead of silently deleting or reconciling user data. The existing gathering settlement function is extended only to expose its authoritative character identity to the receipt hook; its reward calculation is preserved.

The enabled `veldryn-party-social-v16` cron job runs every 30 minutes. Browse/RLS expiry checks do not depend on cron running on time. SQL test fixtures roll back; the concurrency runner deletes its own unique accounts/characters/Parties and temporary schema in `finally`.

## Tests and checks actually run

Machine-readable evidence: [repository checks](v16-verification/repository-checks.json), [concurrency](v16-verification/concurrency.json), [final checks](v16-verification/final-checks.json).

| Check / command | Result |
| --- | --- |
| `node tools/check-v16.mjs` | **74/74 PASS**. Enumerates all compiled mobile tests and configured backend suites, now including online authority/retry tests. The initial 70/71 result was superseded after the fixture fix. |
| Backend `tsc --noEmit`, `tsc` | PASS. |
| All existing backend smoke, combat, production, squad and co-op phase 1–13 scripts | PASS, including matchmaking, roles, recovery, chat, rewards and regional balance. |
| New backend `party-v16`, `recruitment-test` | PASS. Includes contribution caps, anti-leech minimums, reward eligibility, replay/idempotency, invalid values, weekly/ranked constraints and filters. |
| Mobile full `tsc --noEmit`, core typecheck and core build | PASS; full typecheck repeated after final UI edits. |
| Mobile configured `npm run test:core`, `npm run test:pre-codex`, `npm run test:v16` | PASS; v16 repeated after final UI edits. |
| Additional compiled mobile tests and chat-pilot core | PASS; the progression-balance simulation was subsequently fixed as detailed below. |
| `node tools/verify-v16-migration.mjs` | PASS, 22 required tokens plus scoring cap/receipt/currency/SQL quote checks; supplementary to actual SQL execution. |
| `supabase db query --linked --file supabase/tests/party_v16.sql` | PASS on final applied schema. Authenticated/anonymous/service boundaries, direct mutation denial, Party size/chat, expiry/search/cooldown, Guild seekers, actual gather/craft receipts, reward wallet replay, Party hopping, event/week validation and all seeded score budgets. |
| `supabase db query --linked --file supabase/tests/party_v16_safety.sql` | PASS on final applied schema. Block visibility/join denial, four-human shared combat, duplicate receipt formats, persistent chat block filtering and unchanged Live epoch access. |
| `node tools/test-v16-concurrency.mjs` | PASS. Concurrent fourth/fifth joins, repeated create, repeated contribution, reward claims and recruitment publication; cleanup included. |
| `supabase db push --linked --dry-run` | PASS, remote chain up to date. |
| `supabase db lint --linked` | PASS, no schema errors. |
| `expo install --check` | PASS, dependencies up to date after SDK 53 compatibility fixes. |
| `expo export --platform android --platform ios --output-dir .expo-export-v16` | PASS, both Hermes bundles and assets generated from final UI. |
| `git diff --check` | PASS. |
| Source lint | NOT CONFIGURED in either package; no existing lint command was skipped. |
| Fresh local Supabase reset / native signed build / device QA | NOT RUN; see limits below. |

### Historical test failure resolved in the online follow-up

The initial repaired travel fixture in `apps/mobile/tests/progression-balance.ts` reported **346.0h**, exceeding the existing upper allowance of 318 hours (288 + 30). This test was outside the configured `test:core`/`test:pre-codex` scripts and was included by the broader runner.

The original HEAD test failed earlier with **Travel to Silverbrook before fighting Silverfin Swarm**. The final fixture respects travel, equips available Bank loot, and evaluates the novice and separately budgeted regional crafted outfits as complete sets. Greedy single-piece swaps had rejected stronger outfits because the first swap removed the novice set bonus. All nine classes now pass at **252–310 combat-only hours**. No XP curve, combat tuning, food, monster, quest, item, progression target or existing tolerance was changed to obtain this result. The skilling material/skill preparation is an explicit fixture assumption, not free materials granted to players.

## Conflicts with v15 and resolutions

| Overlay assumption / conflict | Resolution |
| --- | --- |
| Reduced handoff modules versus the full current app | Appended integration to current files; kept existing screens/services, imports, content and unrelated behavior. |
| Overlay treated the generic Party helper as a Live-only role gate | Preserved the helper's existing solo/generic expedition behavior; v16 tests call actual Live invariants. Persistent policies permit any role mix. |
| Separate Party command receipts | Reused `server_action_receipts`; no parallel command ledger. |
| Existing Party tables without current membership/ownership constraints | Extended them, preflighted old data and added account/parent locks and uniqueness checks. |
| Existing Live Chat identifies channels as run ID plus epoch | Preserved that format and authorization; persistent Party checks avoid unsafe UUID casts. A security-definer membership helper avoids granting clients raw co-op table access. |
| Existing blocks and moderation | Reused `player_blocks` for discovery/chat/join restrictions and retained blocked/review moderation semantics. |
| Different trusted combat receipt formats | Canonicalized node identity, deduplicated both paths and split shared progress among actual humans. |
| Mobile overlay had repository interfaces but no app wiring | Added concrete authenticated Supabase adapters, shared membership state, Social screen/navigation and existing chat overlay integration. |
| Latest five-tab direction differed from v15's Home tab | Used Character/Skills/World/Inventory/Account; retained Home and saved shortcut destinations. |
| Expo 53 had incompatible installed versions | Changed AsyncStorage 2.2.0 to 2.1.2, Linking 57.0.9 to ~7.1.7, SecureStore 57.0.3 to ~14.2.4 and React Native 0.79.5 to 0.79.6; updated the lockfile and verified both exports. |
| Old test fixtures assumed earlier pacing/travel/novice gear | Updated fixtures to current content and whole-outfit preparation; retained the historical assertion and tolerance, which now pass. |

## Intentionally deferred and validation limits

- Gameplay balance values were preserved; the historical progression test now passes after correcting its preparation model.
- A fresh full-chain local Supabase reset was not possible because Docker engine was unavailable. Existing-chain safety was verified with linked history/dry runs, real rollback SQL suites, applied-schema lint and two-session races. The linked database was not reset.
- Signed APK/IPA creation, physical-device/multi-device interaction, screen-reader/large-text/keyboard QA and manual visual QA remain unverified. Passing Expo/Hermes exports does not establish those outcomes.
- Existing production co-op worker/HTTP/Realtime deployment and feature gates remain as documented in `COOP_CURRENT_STATUS.md`. v16 hooks consume trusted existing settlement receipts; offline local gameplay does not submit trusted Contract progress. This task does not turn on undeployed v15 co-op infrastructure or broaden trust to client-supplied results.
- Other-device membership visibility uses polling (up to 15 seconds while active); database Party Chat authorization revokes immediately. No separate Realtime/chat system was introduced.
- The mini-event is launch sample content. Further event schedules and economy tuning are content work, not silently generated perpetual events.

## Preservation confirmation

Unrelated v8–v15 source was preserved. No existing content registry, game settlement algorithm, progression curve, inventory/bank/equipment logic, save schema, co-op matchmaking/service module or feature-flag file was edited. All prior migrations remain unchanged. Existing API action names and generic expedition behavior remain available. UI changes are limited to the specified social/navigation/chat integration; existing Home, Friends, Guild, World/Guild Chat and saved shortcut flows remain reachable.

The configured v15 regression suites pass, including co-op roles/matchmaking/chat/rewards. The progression simulation now also passes. Missing native/local-reset validation still prevents a claim that every possible v8–v15 behavior has been exhaustively validated. This section describes the original v16 merge; subsequent authorized online changes are listed separately in `ONLINE_GAMEPLAY_STATUS.md`.
