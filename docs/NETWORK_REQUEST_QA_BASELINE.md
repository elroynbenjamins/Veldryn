# VELDRYN network and screen-transition QA baseline

**Purpose:** produce real, repeatable request counts before merging performance PRs #597–#599 and shipping 1.0. Do not replace observed device measurements with estimates.

## Instrumentation

The Admin QA Console has an opt-in **Network requests (session)** capture. It counts actual Supabase HTTP requests intercepted by the shared client, grouped by the screen active when the request begins and by safe endpoint category (e.g. `rpc:guild_identities`). It records count, failures, mean latency and maximum latency in memory only; it never stores full URLs, query parameters, tokens, payloads or player IDs. Captures are resettable and are not persisted.

**Excluded:** Supabase Realtime websocket frames, REST traffic through other clients, native IAP and other non-Supabase HTTP. Counts can include background social/notification polling while the app is foreground. Request counts alone do not prove perceived latency improvements.

## Reproducible run

1. Use an authorized Admin QA account on an Android test device with the same Wi-Fi/data conditions for before-and-after runs. Complete initial login and let initial server data settle.
2. In Admin QA, press **Start capture**, then **Reset counts**. Close QA, run a fixed navigation sequence, and reopen QA to **Update counts**.
3. **Sequence A (navigation):** Home → Character → Skills → World → Inventory → Home → More → Guild → Home; repeat three times at a normal pace.
4. **Sequence B (social):** Open Guild roster and one member profile, close it; open Friends, then a friend profile, close it. Reopen both screens twice. Avoid friend/guild mutations in this baseline.
5. **Sequence C (activity):** Begin a safe gathering activity, inspect queue, background/resume the app, and confirm server-owned progress/rewards. Record request counts after each step. Do **not** simulate real rewards on the client.
6. **Sequence D (co-op/chat):** Open chat, switch channels, return Home. Record websocket behavior separately with network developer tools if needed; HTTP-only counter will not show websocket frames.
7. Run each sequence once on baseline `main`, then on each applicable optimization branch/combined integration build. Reset between sequences. Compare requests per screen, failed requests, total duration, and UX responsiveness.

## Expected invariants (not synthetic measured data)

- Home is the leftmost persistent tab and highlights **Home**. Combat/Co-op highlight World; account detail screens highlight More.
- Screen navigation should not mutate inventory, trigger gameplay reward claims or add queued activities.
- UI-only inventory filter/modal changes must not create backend inventory writes.
- Friends search should not refetch entire friend/request/block lists on every search after PR #599.
- Public profile visibility and guild membership changes always reauthorize; never rely on a cached private profile for access.
- Guild boss attempts/claims, project contributions, and player activity settlement remain server-authoritative.

## Results template

| Build / device | Scenario | Supabase HTTP count | Failures | Most frequent screen/RPC | Mean latency | Notes |
| --- | --- | ---: | ---: | --- | ---: | --- |
| Baseline main | A / B / C / D | Not measured | — | — | — | Record from device |
| After optimization PRs | A / B / C / D | Not measured | — | — | — | Record from device |

## CI checks

- `pnpm --dir apps/mobile install --frozen-lockfile`
- `pnpm --dir apps/mobile exec expo-doctor` (or `npx -y expo-doctor` from mobile directory)
- `pnpm --dir apps/mobile typecheck`
- `pnpm --dir apps/mobile test:core`

Home navigation, request aggregation and public-identity safety have deterministic regression tests. They establish logical behavior but **do not** substitute for physical Android/device traffic measurements.
