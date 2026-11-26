# Online player count split — review only

Production roster v2 definition verified read-only. Candidate count RPC preserves the active-character join, 30-minute last-seen window, 35-minute bucket window, unique account semantics and two-way block exclusion. No client-supplied account or filter. Authenticated execute only, empty search_path, explicit auth.uid() check, no new tables. Old roster remains unchanged.

Before release: generate a migration with the pinned CLI; apply to staging only; compare count to roster count within a single transaction under authenticated test viewers (including blocked relationships, missing characters, multiple presence buckets and empty data); test unauthenticated denial and permissions; run advisors and measure EXPLAIN (ANALYZE, BUFFERS) and payload bytes. Do not deploy draft SQL. The app falls back to roster only on missing-function errors and does not repeatedly probe a missing RPC for the same account. Release DB first, then the app, with old clients unaffected.

## Read-only synthetic and live equivalence evidence

On 2026-11-26, the production read-only comparison across 100 viewers and 4 recent accounts found 0 differences in 400 eligible pairs (no blocked pairs in that live sample). Executed `backend/supabase/tests/online_player_count_equivalence_readonly.sql` as a SELECT-only statement: 6/6 synthetic cases passed (null session, both block directions, unblocked, self), including duplicate presence, boundary times, missing profile/character and wrong owner. No database objects or player records were created. This does not substitute for the installed RPC's role/ACL or measured query performance tests.
