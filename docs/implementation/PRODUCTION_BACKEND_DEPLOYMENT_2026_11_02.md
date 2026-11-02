# VELDRYN production backend deployment — 2026-11-02

**For Claude and release engineering.** This document records actual Supabase production actions performed directly from ChatGPT after merging [PR #728](https://github.com/elroynbenjamins/Veldryn/pull/728). Read this before preparing Android 1.0.4 or changing Guild Skills.

## Confirmed production deployment
- GitHub source commit: `788e6ba011ffdc79d2f6b92a915bcd7ead992d25` on `main` (PR #728 included).
- Production Supabase project: `nyjwigipamnvpdvpauuv` (Veldryn). **Do not mistake staging** `iqfmmpvwanvvmxcftfxw` for production.
- Generated `backend/supabase/functions/gameplay/index.ts` (Git blob `8efd2731019836e4d7968bd102e4eaa2e70c9eae`) **deployed** as `gameplay` v38, ACTIVE.
- Generated `backend/supabase/functions/coop/index.ts` (Git blob `8a38cd0a6e8b2846a6a1cfe74f748a8c018a37e6`) **deployed** as `coop` v21, ACTIVE.
- Both functions retained their existing `verify_jwt=false` setting because the existing handlers do their own application-level authentication; **do not interpret this as permission to bypass authenticated account checks**.
- `play-billing` v8 and `play-billing-rtdn` v10 were left unchanged: live entrypoint code matched `main` exactly.
- Checked Supabase function inventory after deployment: all four functions ACTIVE. No authenticated end-to-end player/dungeon smoke run or synthetic production writes were performed, so real-client release verification remains required.

## Guild Skills — critically important handoff
- Production database currently has **9/9** `guild_skill_catalogue_v1` nodes with `is_released=true`, **54** material cost entries, the `guild_skill_effects_server_v1(uuid)` read model and the Bank/upgrade RPC infrastructure. At inspection time `guild_skill_allocations` had **zero** purchased upgrades.
- This is the user's deliberate database release decision. **DO NOT mark the UI/effects as completed.** In `apps/mobile/src/components/OnlineGuildHallPanel.tsx`, `<GuildSpecializationPaths/>` is rendered without live state/actions. The deployed source currently does not expose the authenticated `guild-skills` gameplay route.
- Claude must implement and verify authenticated snapshot + idempotent upgrade routes using the server-verified account; wire snapshot, point/material limits, loading/errors, and Guild Bank demand into the Guild Skills screen; implement **all nine effects** in their proper server-authoritative gameplay/guild calculations (speed, XP, membership, quests/projects and Boss attack/defence/support). Handle construction bonus stacking, exactly-once receipts and cross-account isolation. Never trust a caller-provided account ID or locally guessed costs.
- The SQL effects RPC is a projection of purchased ranks, **not proof** that combat/progression systems consume those values. An enabled node must not become a pay-for-nothing upgrade. Validate this before advertising the feature.
- Earlier background handoff: [guild-skills-supabase-handoff-1-0-4.md](../guild-skills-supabase-handoff-1-0-4.md) contains foundational details; its original `is_released=false` snapshot is historical and is superseded by these live production observations.

## Migration reconciliation — do not replay blindly
- The `main` migration tree has **six** migration versions not present in the production migration history: `20261104000014`, `20261104000019`, `20261104000020`, `20261104000021`, `20261104000027`, `20261104000028`.
- `00014` extends Echo sharing to seven days; the production journal already has a dedicated `20261030213402_echo_sharing_seven_days` migration. Verify its current function definitions before contemplating replay.
- `00019` and `00020` concern Android 1.0.3 release notes; production already has a published 1.0.3 note. Re-running `00020` moves the note's `published_at` forward by 24 hours and should **not** be done.
- `00021` sets Android minimum/latest to 1.0.3. Production is **already** latest=minimum=1.0.3, maintenance=false; **do not switch the minimum to 1.0.4 until the signed production AAB is approved/available**.
- `00027` defines the Guild Skills effects read model and `00028` releases nine trees. Both functional effects are **already present in production**, but their migration versions are not in its migration journal. Do not blindly reapply or manually fabricate migration ledger history. Reconcile history safely only when an explicitly verified strategy exists.
- Production `1.0.4` release note exists but is **not published**; do not publish ahead of the Google Play rollout.
- Staging migration journal is far behind production (226 vs 296 at inspection) and uses historical/version aliases. **Do not promote production source to staging or try to auto-apply 70 migrations without a separate schema audit.**

## Security / operational follow-up
- Existing advisors report broad security and performance lint warnings (e.g. executable SECURITY DEFINER functions, RLS initplan, missing FK indexes). These were **not newly added** as part of this deployment; do not mass-rewrite privileges without verifying each RPC's callers and account authorization.
- Triage from the Supabase dashboard: [security-definer warnings](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [RLS initplan warnings](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).
- Run authenticated production read and controlled non-destructive gameplay/co-op smoke checks, including client version gating, guild bank demand read, and error logs. Do not use a live player account as an automated test actor.
- Keep Android release metadata and the server bundle synchronized with any further changes. Latest live production deploy is **not equivalent to publishing Android 1.0.4**.

## Verified balancing change
- King's Road, Sunscar, Frostmarch and Ashlands standard hunt enemies: +20% HP/ATK/DEF and longer kill cycle; earlier regions untouched.
- Early Smithing/Tailoring recipe XP increased; mixed loadout readiness now considers whole equipment rather than one high-tier item.
- PR #728 CI passed the mobile core, mobile UX, Guild Shop and equipment-integrity workflows before merge.
