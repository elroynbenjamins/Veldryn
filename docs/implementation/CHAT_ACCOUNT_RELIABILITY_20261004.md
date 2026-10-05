# Chat and guest account reliability — 4 October 2026

## Scope and outcome

This pass addresses missing recent chat messages, a guest account remaining visually unlinked after email verification, and repeated channel initialization when switching conversations. The application changes preserve account identity, confirmed party membership, cached conversation history, and drafts across ordinary channel switches and token renewals.

The production migration `20261004214219_enable_world_chat_realtime.sql` was applied to the active Supabase project `nyjwigipamnvpdvpauuv`. The mobile changes require a new application build. Native email verification and delivery between two real clients remain release checks.

## Confirmed causes

### Recent World messages were excluded from the history query

The previous query used `created_at ASC LIMIT 50`. At diagnosis, production World 1 contained 55 messages: the old page stopped at `2026-10-04 20:33:01 UTC`, while the newest accepted row was dated `2026-10-04 21:31:29.555484 UTC`. The five newest rows could therefore exist on the server without appearing in the client.

Recent sampled logs included successful `send_world_chat` responses and successful history requests. The original UI used polling, so the absence of `chat_messages` from the Realtime publication was an enablement gap for the new subscription path, not the cause of the original oldest-50 query defect.

### External email verification did not refresh the authoritative identity

The account provider restored cached session data and restarted automatic token renewal on foreground return. It did not explicitly fetch the server user after verification in an email app or browser. Supabase can also update `session.user` before the existing JWT's anonymous identity claims are renewed.

The guest form lacked a resumable verification/password step and an explicit verification check. Account linking also depended on an unnecessary second profile write. These client defects are confirmed; aggregate production auth data cannot establish the reporting player's individual account state.

### Channel and auth lifecycles discarded useful state

The overlay conditionally mounted one conversation and keyed World chat by language. Switching channels therefore recreated readers and local UI state. World, Guild, Party, and the collapsed dock also used independent short polling loops. The party provider reset confirmed membership on every auth event and on backgrounding, so token renewal could reset Party Chat.

## Implementation

| Area | Result | Main files |
| --- | --- | --- |
| History transport | Fetch newest 25 by descending timestamp and ID, then display in chronological order. Guild explicitly requests the same 25-message default. Cosmetic identity lookup failures leave authorized messages visible. | `src/online/chat-history.ts`, `src/online/social.ts`, `src/online/party-social.ts` |
| Shared history | Account/channel-scoped memory cache, serial requests, coalesced invalidations, stale-response isolation, and bounded eviction that preserves mounted panels. The dock shares World history. | `src/core/chat-feed-cache.ts`, `src/online/useChatFeed.ts`, `src/components/ChatDock.tsx` |
| Live delivery | World/Party INSERT notifications trigger a history read through existing RLS. Subscription readiness, reconnect, and foreground return catch up missed rows. | `src/online/useChatFeed.ts` |
| Bounded refresh | Connected World/Party use a 60-second watchdog; disconnected feeds use a 15-second fallback. Guild retains its membership-scoped RPC and a 15-second active polling interval. Inactive/background feeds release sockets and timers. | `src/online/useChatFeed.ts`, chat components |
| Retained UI | Previously visited panels remain mounted; only the selected conversation is active. Language switches retain the World component and per-language drafts. Account changes reset private state. | `src/components/ChatOverlay.tsx`, `OnlineWorldChat.tsx`, `GuildChat.tsx`, `OnlinePartyChat.tsx` |
| Compact composer | Input, compact emote trigger, and Send share one row. Both icon actions retain 48-pixel touch targets; the expanded emote tray uses the full width below the row. | `src/components/ChatComposer.tsx`, `ChatEmotePicker.tsx`, World/Guild/Party chat components |
| Read markers | Hidden/background conversations cannot consume their caught-up marker. Reactivation catches up without moving a player who is reading older messages. Pending animation callbacks cannot acknowledge after unmount. | `src/components/ChatLog.tsx` |
| Send result | An acknowledged send is distinct from a subsequent history failure. Existing Guild/Party idempotency keys remain; late acknowledgement cannot erase a different World draft. | World/Guild/Party chat components |
| Social metadata | Same-account token renewal retains party data. Explicit post-mutation refresh queues one serial reread; stale account callbacks/results are ignored. Membership/notification polling is bounded and foreground-aware. | `src/online/PartySocialProvider.tsx`, `useSocialNotificationCounts.ts`, `src/components/SystemNoticeLog.tsx` |
| Account reconciliation | Startup, native callback, foreground return, and Check verification read the authoritative server user and renew stale identity tokens. Auth event callbacks remain synchronous. | `src/online/AuthSessionProvider.tsx`, `account.ts`, `src/core/auth-account-link.ts`, `auth-callback.ts` |
| Account UI | Explicit Guest, Waiting for email verification, Email linked, and Linked account states, with resumable password completion and localized copy. | `src/components/OnlineAccountPanel.tsx`, `src/i18n/account.ts` |

Paths above are relative to `apps/mobile/`.

### Composer and recent history follow-up — 5 October 2026

World, Guild, and persistent Party use the shared `ChatComposer`. Its flexible input has a zero minimum width, while the emote and Send icon actions keep the preferred 48-pixel touch target. The row stays horizontal at narrow phone widths and large text sizes. The emote picker renders the expanded tray below that row, so opening or editing the tray cannot push Send beneath the input. The Settings picker retains its existing expanded editor presentation.

The local World preview uses the same composer and caps its per-channel history at 25. The separate Live co-op panel also places Send beside its input; its existing eight-message display and run-scoped transport are retained.

The shared composer forwards text and emote changes to each channel's existing draft owner. It uses one guarded send handler for the button and keyboard Send action, exposes busy/disabled accessibility states, and keeps online inputs editable while a send is pending. Existing channel code still owns moderation checks, account and membership checks, idempotency, and acknowledgement handling.

The recent-message default is now 25, reduced from the initial reliability fix's 50. `CHAT_RECENT_MESSAGE_LIMIT` is shared by the World and persistent Party history queries and the Guild RPC argument. The World dock reads the same cached history as the expanded World channel. An explicit Guild limit remains supported by the transport API.

For a full history window, this halves the maximum message rows returned and rendered. Request frequency, live subscriptions, cache reuse, moderated sends, and server storage retention keep their existing behavior. The tradeoff is a shorter visible conversation history; the change does not imply a 50% reduction in total database work or billing.

The transport regression uses 55-message fixtures for all three channels. It checks messages 31–55 initially, then 32–56 after a confirmed send, stable timestamp ties, the Guild `p_limit:25` argument, and visible messages when cosmetic lookups fail.

### Guest linking sequence

1. Add the email to the existing anonymous user UUID with the native redirect URL.
2. Verify the email. Returning to the app or selecting **Check verification** reads the current server user.
3. Set the password after verification, then show **Linked account**.

The `user_metadata.veldryn_guest_password_pending` boolean is only a resumable UI hint. It stores no password and grants no permissions. Server user fields determine verification. Already-verified accounts created by older builds remain linked without a forced new password flow.

Authenticated pending-email updates handle guest confirmation resends. Conflicting existing emails preserve the guest identity and show an actionable error. The implementation never creates a second account to complete an existing guest's linking flow.

This sequence follows the [Supabase anonymous sign-in documentation](https://supabase.com/docs/guides/auth/auth-anonymous). The old combined email/password update is not described as universally rejected: current upstream Auth can accept it. Local `supabase/config.toml` now enables manual linking to match documented setup; the hosted auth configuration was neither exposed by the available connector nor changed in this pass. Successful production user updates and verification callbacks were observed, but are not a substitute for a device round trip.

## Original production database verification

Before application, linked migrations and security advisors were inspected and the publication change was exercised in a transaction that was rolled back. After application, the checked-in `backend/supabase/tests/chat_realtime.sql` passed against production.

Verified:

- `public.chat_messages` belongs to `supabase_realtime`.
- The existing `public.coop_run_client_snapshots` publication membership is preserved.
- Chat RLS remains enabled; authenticated reads are granted, unauthenticated reads are denied, and direct client writes remain denied.
- A non-member guest request cannot read private chat rows; writes still use moderated server RPCs.
- The newest-page query returns 50 rows including the observed latest message.
- Security advisor categories/counts did not change after the publication update.

The SQL test uses a temporary request identity in a read-only transaction. It creates no users, auth sessions, or chat messages. Staging remains paused.

## Follow-up: validation recovery

The requested follow-up resolves the existing combat/UI validation failures and the downstream companion-roster expectation. It incorporates main commit `83d1f4eeefb5916beb21b28f8c7e834bb559ef07` (PR #546), including its paid name-style entitlements and confirmed-save behavior.

| Area | Correction |
| --- | --- |
| Combat replay | Restore pause/resume, shared 1x/2x/4x timing, skip, replay, bounded event stepping, pause-on-inspect, contribution totals, and the collapsible completed battle log. Preserve the courtyard artwork, circular portraits, and intentional two-column party formation. |
| Responsive combat cards | Apply the tested card, scene, and portrait dimensions at 320, 360, and 390 pixels. Restored controls wrap on phones and use the shared 44-pixel minimum touch target. Selected speed has a visible checkmark. |
| UI interaction | Keep the current bounded training disclosure in its bottom dock, verify its real XP command callback and accessible toggle, and forward keyboard-open taps in the profile icon filters and gallery. Source contracts now check JSX structure rather than retired tag adjacency or a fixed prop count. |
| Scroll indicators | Supply the missing horizontal-indicator properties on combat and co-op lobby scroll surfaces. The validator passes for all 131 native scroll surfaces. |
| Companion roster | Assert the intended 24 permanent and 9 authored event companions, including the reserved `EVT_UNIT_008` gap. Check exact IDs, uniqueness, and all authored companions' name, role, rarity, and origin against the server definitions. Content and balance remain unchanged. |
| Account localization | Complete four missing guide/reward-track rows in all six languages. |
| Social localization | Validate the existing six-language controlled boss names and separately protect unknown/player-authored labels. The obsolete English-only expectation is corrected without changing the authored names. |
| Profile/chat integration | Load the real name-style helper dependency chain in the chat transport fixture after incorporating PR #546. Its existing chat assertions are retained. |

`tools/validate-dungeon-combat-lifecycle.cjs` adds four actual React suites covering playback timing, inspection and bounded stepping, reduced-motion/cleanup behavior, and rendered responsive card/control properties. The runner uses deterministic timers, native-view mocks, and the real replay helpers; it is part of the regular core manifest. These checks establish component behavior and rendered properties, not native screenshot validation.

## Original reliability validation

The four chat/account runners and the combat lifecycle runner are registered in `tools/mobile-core-tests.json`. React lifecycle tests use the pinned development dependency `react-test-renderer@19.0.0`; their native views and backend services are mocked, and they perform no network requests or runtime installs.

| Command/check | Result |
| --- | --- |
| Mobile `pnpm install --frozen-lockfile --ignore-scripts` | PASS; existing dependency resolutions retained |
| Mobile `pnpm run typecheck` | PASS |
| Mobile `pnpm run typecheck:core` | PASS |
| Mobile `pnpm run test:core` | PASS — all 191 manifest entries, including PR #546's name-style save tests |
| Mobile `pnpm run test:pre-codex` | PASS — offline smoke, equipment, navigation, pre-Codex smoke |
| Mobile `pnpm run test:onboarding-locks` | PASS |
| Compiled `coop-live-recruitment.js` | PASS |
| Mobile `pnpm run test:collectibles` | PASS |
| Mobile `pnpm run test:companions` | PASS — companion integration 277 checks, class skills 86, monster mastery 21 |
| `node apps/mobile/tests/auth-account-link.cjs` | PASS — 22 behavior groups |
| `node tools/validate-chat-lifecycle.cjs` | PASS — 10 React lifecycle suites |
| `node tools/validate-dungeon-combat-lifecycle.cjs` | PASS — 4 React lifecycle suites |
| `node tools/validate-chat-transport.mjs` | PASS — actual transport queries against a 55-row fixture, deterministic tie ordering, acknowledged sends, cosmetic failures, identity lookup economy |
| Compiled `chat-feed-cache.js` | PASS — shared requests, pending invalidations, cache reuse, block race, reconnect and account disposal |
| Chat usability, Guild chat, and collapsed dock/emote contracts | PASS |
| `node tools/validate-recent-migration-versions.mjs` | PASS — 210 migrations |
| `node tools/validate-regional-combat-cadence.mjs` | PASS |
| `node apps/mobile/tests/account-localization.cjs` | PASS — 1,324 keys across 6 languages, 12 guides, 33 records, 20 owned files, 453 display calls |
| `node tools/validate-localization-catalogs.mjs` | PASS — 6,069 catalog rows, nonempty translations and matching placeholders |
| `node apps/mobile/tests/localization-social.mjs` | PASS — 995 keys across 6 languages, authored interpolation, provider, expiry, and 64 owned files |
| Backend `pnpm run typecheck` and `pnpm run build` | PASS |
| Backend `pnpm test:gems`, `pnpm test:coop-rewards`, `pnpm test:coop-live-social`, `pnpm test:coop-composition` | PASS |
| Backend `pnpm test:event-expedition-online` and compiled `online/tests/gameplay.js` | PASS |
| Production `chat_realtime.sql` | PASS |
| `git diff --check` | PASS |

The initial 189-entry run found three baseline failures at `d881f5c7395c561c4a61e6048038c215d9c46f26`; the first was also present in [main CI run 37228569900](https://github.com/elroynbenjamins/Veldryn/actions/runs/37228569900). Those failures were resolved by the follow-up above. The 191-entry manifest for PR #545 passed in a single clean compile-and-run invocation. The original chat-attention polling assertion now validates the foreground-only, 30-second, account-scoped lifecycle, with behavioral coverage of post-read refreshes.

The table records the original local validation and production SQL verification. Hosted validation and merge status are recorded on [PR #545](https://github.com/elroynbenjamins/Veldryn/pull/545) and its [checks](https://github.com/elroynbenjamins/Veldryn/pull/545/checks). That pass did not change the required CI workflow.

## Composer and 25-message follow-up validation

The follow-up incorporates main commit `4d5bb6e7e983ab2d2290cf9fefa5e11bfd2d3e21`, preserving the intervening billing, ownership, and sender profile icon fixes. It changes no backend schema, Supabase configuration, dependencies, or CI workflow.

| Command/check | Result |
| --- | --- |
| Mobile `pnpm run typecheck` | PASS |
| Mobile `pnpm run typecheck:core` | PASS |
| Mobile `pnpm run test:core` | PASS — all 192 manifest entries in one clean compile-and-run invocation |
| Mobile `pnpm run test:pre-codex` | PASS — offline smoke, equipment, navigation, pre-Codex smoke |
| `node tools/validate-chat-lifecycle.cjs` (also in core) | PASS — 11 React suites, including the actual shared composer/picker/input at 320/360/390 widths and 100%/150% font scaling, retained input instances and drafts, emote insertion, keyboard/button guards, and existing channel lifecycles |
| `node tools/validate-chat-transport.mjs` (also in core) | PASS — World/Guild/Party newest-25 requests and ordering, confirmed sends, stable ties, Guild limit override, cosmetic failure visibility, and identity lookup economy |
| Guild Chat and collapsed dock/emote contracts (in core) | PASS — updated obsolete direct-button/stacked-layout expectations to the shared inline composer |
| `node apps/mobile/tests/localization-social.mjs` | PASS — 995 keys across 6 languages and 65 owned files, including the shared composer |
| `git diff --check` | PASS |

The React suites verify real component behavior and rendered properties with mocked native hosts and backend services. They do not establish native pixel layout or a device keyboard round trip. No production data was queried or mutated for this follow-up. Hosted CI and merge evidence are recorded on the follow-up pull request.

## Release verification still required

1. Install a build containing these changes and verify a new guest email using the normal native email/browser flow; confirm the user UUID and characters are retained through password setup.
2. Open an already-verified older guest account and confirm that **Check verification** or foreground return recognizes it.
3. Exchange ordinary player-authored World and Party messages between two signed-in clients; confirm live arrival and reconnect catch-up, including channels with more than 50 messages.
4. On Android, switch World/Guild/Party/System and World languages while reading and composing. Confirm retained drafts/history, readable scroll position, and no repeated party initialization.
5. At small phone widths and 150% system text size, confirm input, emote, and Send remain on one row; opening the tray preserves the draft and keeps Send at the right edge. Confirm World/Guild/Party show the newest 25 messages after the history window fills.

These device checks were not claimed as automated or completed. The backend publication is deployed; native distribution remains a separate release step.
