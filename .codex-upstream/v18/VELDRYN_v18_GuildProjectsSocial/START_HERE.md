# VELDRYN v18 — Start Here

This pack implements **Guild Projects + deeper Guild social systems** as the next additive pass after the v16/v17 social foundation and v17.3 Full Control Center.

## Dependency / merge rule

- Your **current local VELDRYN repository is authoritative**. Do not replace newer local work with the reference files in this pack.
- `dependencies/VELDRYN_v17_3_FullControlCenter_CloudflareFree.zip` is included so Codex has the complete prior dependency chain in one handoff.
- The v17.3 dependency itself contains v17, which contains v16.1. You do **not** need to upload each ZIP to GitHub one by one.
- Apply only missing migrations in forward order. Never rewrite already-applied migration history.

## Product correction carried into v18

**There is no player Market in VELDRYN.**

v18 does not create or depend on a Market. Older design/reference data may contain `Guild Procurement`, `Procurement Network`, Market rankings, or Market wording. Do not restore those systems. See `GUILD_MARKET_REMOVAL_COMPATIBILITY.md`.

## v18 scope

- Persistent asynchronous Guild Projects.
- Project slots aligned to existing Guild levels: Lv5=1, Lv10=2, Lv25=3.
- Permanent Development Projects (Gold/material communal construction).
- Repeatable Weekly Campaign Projects (Combat / Skilling / Mixed standardized effort).
- Weekly Project Board with 3 broad candidates and member recommendations/votes.
- Authorized role start + inactive-leadership auto-start safeguard.
- Dynamic difficulty based on recently active guild members.
- Daily contribution caps, meaningful-contributor requirement, single-account carry cap.
- Weekly guild-binding protection against Guild hopping.
- Late-join reward eligibility rules.
- Personal and Guild milestones.
- Guild Project completion reward hooks + fixed Guild XP rewards.
- Optional 125% stretch milestone for prestige/season score, not mandatory completion.
- Development donation idempotency, atomic resource debit requirement, meaningful-donor safeguard.
- Weekly Guild Decree choice after project completion.
- Existing guild bonus hard caps preserved.
- Guild roles/permissions aligned to the design database, with Market/Procurement permissions removed.
- Guild Bulletin.
- Bounded Guild Activity Feed.
- Member contribution roster.
- Guild Project Architects seasonal leaderboard hook with repeat-template diminishing value.
- Notifications/deep links.
- v17 contribution outbox integration so delayed workers cannot misattribute Guild contribution after a Guild switch.
- v17.3 Control Center command registration and remote-config/reset hooks.
- Mobile-first Guild Hub / Projects / Project Detail / Members / Activity / Decrees components.

## Read next

1. `GUILD_PROJECTS_SOCIAL_V18.md`
2. `SETTLEMENT_WIRING_V18.md`
3. `GUILD_MARKET_REMOVAL_COMPATIBILITY.md`
4. `CODEX_INSTRUCTIONS.txt`
5. `files/backend/supabase/migrations/20260914_030_guild_projects_social_v18.sql`

## Validation status

Reference TypeScript/domain tests are included and verified locally. Codex must still run the real current repository build/test suite, Supabase migration/RLS tests, transactional donation tests, and end-to-end mobile integration after merge.
