# Chat delivery and account recovery — 5 October 2026

## Scope

This pass completes the reliability follow-up to `CHAT_ACCOUNT_RELIABILITY_20261004.md` and incorporates the account-entry changes from PR #548. It preserves the inline input/emote/Send composer, newest-25 history, retained conversation caches and drafts, server-owned identity and moderation, and the profile-icon changes already on main at `12a00f5`.

The mobile changes require a new native build. See `APP_BUILD_IDENTITY.md` for the shared installed-version source and the remaining native release checks.

## Confirmed defects and resulting behavior

### Refresh deadlines

The old watcher scheduled every 15 seconds from startup while the cache measured freshness from the completion of the preceding request. A 100 ms response made the next timer arrive at an age of only 14,900 ms; the cache skipped it, effectively producing reads every 30 seconds. The same boundary affected the connected 60-second watchdog.

`ChatFeedCache.nextRefreshIn()` now bases the next deadline on the latest completed attempt, including failures. The watcher waits for an existing read and schedules again after it settles. Realtime invalidations remain immediate and coalesced; hidden/background channels release timers and sockets. A slow or failed request cannot create parallel reads or a tight retry loop.

### Retry-safe World messages

`send_world_chat_v2(text,text,text,text)` accepts an idempotency key. The client retains one pending message identity per account/channel and normalized body until an acknowledgement arrives. Changed text receives a new identity. A lost response followed by Retry therefore returns the original message UUID.

The server serializes new World sends per account, binds each receipt to a SHA-256 fingerprint of the channel and trimmed body, and checks receipts before calling the existing authoritative sender. Reusing a key for another intent is rejected. Existing moderation, rate limits, sanctions, emote enforcement and sender-name selection still run for new messages. Receipts use the existing server-only ledger and do not contain another plaintext copy of the message. A previously accepted message is not reposted after pruning.

The legacy World RPC remains unchanged for installed clients. The new client intentionally has no fallback to the non-idempotent send.

### Exact, retryable read acknowledgements

Guild and persistent Party send their explicit conversation ID and last displayed message UUID to `mark_social_chat_read_v2(text,text,uuid)`. The server verifies current membership and message visibility, resolves the timestamp itself, and compares `(created_at,id)` so timestamp ties are deterministic. Confirmed cursors advance atomically and never rewind.

Initial attention and old time-only markers are unconfirmed baselines. The first displayed-message acknowledgement can replace that baseline with the actual displayed cursor, preserving an intervening arrival as unread. Subsequent acknowledgements only advance. Empty conversations have no fabricated read time. The old read RPC remains callable and uses a best-effort stored-message snapshot rather than the server clock.

`ChatReadAcknowledgement` records success only after the request resolves, serializes pending cursors, retries failures after 15 seconds or visibility resumption, and pauses when hidden, backgrounded or empty. It does not persist private history. Account/channel owner guards reject stale queued frames. A measured log initializes after a same-height scope switch even if native content size does not fire again.

World, Guild and Party also retain the actual pending-request object while sending. An older result after A → B → A account or membership changes cannot erase newly entered identical text or show an obsolete send error.

### Verification and password recovery

The incorporated account-entry work adds Show/Hide password, remasking on relevant lifecycle changes, and a centered, scrollable verification dialog with the recipient, inbox/spam guidance, verification check, resend feedback and return action. Existing guest linking retains the guest UUID and requires server-confirmed email verification before password completion.

Actual password-recovery intent persists only `{accountId}` under a dedicated local key. Startup waits for the hint and applies it only to the same verified account. New auth events, cancellation and account transitions supersede delayed storage reads; writes are serialized. Successful password updates and Cancel clear the hint. A linked account also has an ordinary Change password editor. No password, email or token is stored in the recovery hint. Device-storage failure does not block authentication; a failed delete can allow the same account's prompt to return after restart until a healthy clear succeeds.

The installed Supabase SDK revealed two additional races in synthetic network tests. A held password-update response could restore account A after a later sign-in to B or sign-out. It could also overwrite a newer refresh token for A. Application auth intents now run in an ordered queue with account checks inside the operation; supported `processLock` coordination also protects SDK-internal refresh writes. Ordinary chat reads are not added to the application queue, and auth event callbacks remain synchronous. A future Supabase v3 upgrade must revisit the SDK lock API, which the current v2 SDK still supports.

## Database validation and rollout

Migration: `backend/supabase/migrations/20261102000001_chat_delivery_read_cursors.sql`.

SHA-256: `4c721a848395ed99a4170f1570380478cd130e72c6a9f69875592501bcb8d64f`.

The pinned CLI generated `20261005063408_chat_delivery_read_cursors.sql`. Its repository version was then placed immediately after the existing forward-dated `20261102000000` migration so fresh-schema dependencies remain ordered. Connected deployment receipts use their actual execution timestamp, following the existing repository convention.

Linked CLI list/dry-run/lint commands reported that no CLI access token was available. Connected migration history, prerequisites and effective grants were inspected instead. The actual migration body was then checked against production in an explicit transaction that deliberately aborted after validation. All four functions passed `plpgsql_check`; new column definitions, fixed search paths, authenticated-only RPC grants and denied direct table writes passed. Readback confirmed that both new functions, both columns, the temporary linter extension and the validation history entry were absent, and the legacy read body was preserved. No fixture rows were written to production.

The rollout must install the versioned RPCs before distributing the new mobile client. Final deployment and hosted CI evidence are recorded with the merged pull request.

## Verification

| Check | Result |
| --- | --- |
| Mobile frozen install | PASS; existing package graph preserved, one SDK-compatible `expo-application` dependency added |
| Full mobile and core TypeScript | PASS |
| `pnpm run test:pre-codex` | PASS — all four smoke checks |
| `node tools/validate-chat-lifecycle.cjs` | PASS — 18 actual React/hook/component suites |
| `node tools/validate-chat-transport.mjs` | PASS — newest-25-of-55 queries, stable ordering, cosmetics, v2 retry identities and scoped cursors |
| Chat attention/usability contracts | PASS |
| Account entry/recovery/SDK and existing guest-link tests | PASS — 19 suites with real-provider IO and installed-SDK synthetic-network coverage, plus 22 guest-link behavior groups |
| `node tools/validate-app-build.mjs` | PASS — five actual-helper/gate and six-language groups |
| Backend TypeScript and build | PASS via installed compiler; pnpm's existing esbuild approval setting prevents its wrapper from completing normally |
| `node tools/test-chat-reliability-db.mjs` | PASS — actual SQL migration and authoritative RPC bodies in disposable PostgreSQL |
| Migration version/dollar-quote validation | PASS — 214 files |
| Production rollback-only schema/lint check | PASS with explicit absence readback |

The full local core run compiled successfully but stopped at an artwork file omitted from the sparse checkout (`card-backgrounds/guild_plaza_square.png`). The complete 195-entry manifest is enforced by hosted CI with the full repository; no assertion was removed or skipped to make the local run pass. The new PostgreSQL runner is also a required step in the existing CI workflow, using pinned PGlite 0.5.8 from backend dependencies.

The SQL harness tests real PostgreSQL behavior and ordered request interleavings. It does not claim simultaneous multi-session lock contention. React tests use synthetic native views; they do not establish pixel layout, device keyboard behavior, real email delivery or communication between physical devices.

## Native release checks

Build the final merged commit and confirm Settings reports the installed version/build. On Android, verify a guest email in the normal browser/email flow, complete password setup, and retain the same account and characters. Open a recovery link, restart before saving, then exercise Save and Cancel. Exchange messages between two clients, reconnect, switch channels while composing and reading older messages, and confirm that Send remains beside the emote trigger at narrow widths and 150% text size.

These native tests and store distribution remain separate release work. This pass does not publish a store version, create live test accounts, send verification emails or perform purchases.

## References

- [Supabase SDK auth coordination and v2/v3 compatibility](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/migrations/lockless-coordination.md)
- [Expo application metadata](https://docs.expo.dev/versions/latest/sdk/application/)
