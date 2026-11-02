> **2026-11-02 LIVE UPDATE — READ FIRST:** This document originally described an unreleased foundation. Production now has **all nine Guild Skills marked released** (9/9), 54 cost rows and the effects projection RPC. Both generated gameplay/co-op Edge Functions were deployed from `main` (gameplay v38, coop v21). The mobile Skills panel and authenticated upgrade routes are **still not wired**, and the effect projection is **not proof that game calculations consume the bonuses**. Claude must implement and verify the real game-wide effects and player UI/transport before treating Guild Skills as complete. Current authoritative deployment details and migration cautions: [Production backend deployment 2026-11-02](implementation/PRODUCTION_BACKEND_DEPLOYMENT_2026_11_02.md). The historical unreleased instructions below are retained as implementation background, not current production state.

# VELDRYN Guild Skill Trees — authoritative Supabase foundation / Claude UI handoff

## Verified state (2026-11-02)

- Guild Hall `Skills` currently renders `GuildSpecializationPaths` with **no live props** in `apps/mobile/src/components/OnlineGuildHallPanel.tsx`. This is a guide, not a functioning upgrade screen.
- The database had an empty `public.guild_skill_allocations` table with no dedicated upgrade RPC or API.
- There are 9 named skill nodes, each with 3 ranks, authored in `apps/mobile/src/content/guild-skill-paths.ts`.
- **The existing Guild Hall facilities upgrade automatically via Projects**. This is separate from the manually allocated Guild Skill Trees and the new material-funded Guild Construction upgrades.
- Guild levels are currently 1–10. The first manual skill point is earned at Guild Level 2. Total available skill points are `max(0, guild.level - 1)` (9 at Level 10). Do not imply that all 27 ranks can be purchased at the current cap.

## New database migration

`backend/supabase/migrations/20261104000025_guild_skill_trees_authoritative_foundation.sql` adds:

- `guild_skill_catalogue_v1` with authoritative skill IDs, names, branch names, per-rank bonuses and **is_released=false**.
- `guild_skill_rank_costs_v1`: canonical 54 material requirements for 9 nodes × 3 ranks, exactly matching `guild-skill-paths.ts`.
- `guild_skill_upgrade_receipts_v1`: account-scoped idempotency keys and immutable receipt/audit records.
- `guild_skill_snapshot_server_v1(p_account_id uuid)`: returns:
  `{guildId,guildLevel,role,canUpgrade,totalSkillPoints,spentSkillPoints,skillPoints,nodes:[{id,name,branch,perTier,maxRank,rank,released,costs:[{rank,resourceId,amount}]}],bank:[{resourceId,amount}]}`.
- `guild_skill_upgrade_server_v1(p_account_id uuid,p_skill_id text,p_request_key text)`: authoritative, row-locked upgrade transaction; leader/officer only; max 3 ranks; skill-point budget; bank balance debits; two material ledger entries where applicable; exactly-once receipt/retry; returns `{alreadyProcessed,skillId,rank,costs}`.
- Existing `guild_skill_allocations` ranks restricted to 0–3, with `service_role` access only.
- New tables have RLS enabled and no direct `anon` or `authenticated` access. Both RPCs are **service_role only**.

### Critical: the skill spending feature remains OFF

Every skill catalogue row has `is_released=false`. The purchase RPC rejects with `guild_skill_not_released` until the actual game-wide bonuses are implemented and the Guild Bank source/limit logic is compatible.

This safeguard is deliberate: the UI must never spend Guild Bank materials for a bonus that has not been applied by the authoritative gameplay/guild systems.

## Claude — required implementation

1. Add a guarded, authenticated `GET /functions/v1/gameplay?view=guild-skills` endpoint calling `guild_skill_snapshot_server_v1` with the **server-verified** Supabase account ID via service-role client.
2. Add a `POST /functions/v1/gameplay?view=guild-skills&action=upgrade` endpoint accepting only `{skillId,requestKey}` from the player; the account ID must come from the verified token, not the request body.
3. Map the snapshot into `GuildSpecializationPaths` and wire `guildLevel,skillPoints,metrics,canUpgrade,onSpend,onViewBank` appropriately. Better: refactor it to consume the new structured snapshot without inventing local bank balances or skill ranks. Keep the existing visual style and add error/loading/receipt recovery.
4. Material funding for skill trees: migration `20261104000026_guild_skill_bank_release_gates.sql` **already extends** the Guild Bank deposit RPC and demand trigger. Deposits of skill-specific materials are permitted only for a **released**, next-rank Guild Skill, while the guild has points remaining. Unreleased skills add zero deposit demand. Construction-only restrictions still apply independently. Update the Bank UI to present the relevant construction/skill upgrade needs, with a remaining-capacity selector; never offer arbitrary inventory materials.
5. Provide a real approved backend effect for **each** released skill (Professions speed/XP; Fellowship member cap, quests, projects; Vanguard Guild Boss damage/defence/support). Test calculations and server authority, and only display benefits that actually work.
6. Verify the independent **Guild Construction benefits** and Guild Skill Tree benefits do not accidentally stack or override each other incorrectly. The existing skill node values are `perTier=2%` except `fellowship_membership` which grants +1 member/rank.
7. After the effects and funding path are verified on staging, ask for this Supabase environment's deployment/activation. The database owner (ChatGPT) will enable `guild_skill_catalogue_v1.is_released` deliberately **after** the compatible backend, UI and production build are available. Claude should not assume it can deploy Supabase.

## Staging verification already performed

A transaction-scoped synthetic guild (rolled back without persistent data) confirmed:
- Read-only nine-node snapshot and Guild Level 5 → four spendable skill points.
- Disabled skills cannot charge or change ranks.
- Temporarily enabling one node inside the test transaction permitted a rank-1 upgrade.
- Two bank material deductions were exact, one upgrade receipt was created, repeating the same request key returned `alreadyProcessed=true`, and the second call did not deduct materials.
- The follow-on Guild Bank guard migration was tested: unreleased skill materials were rejected, released next-rank materials were accepted, and rank-1 materials were rejected again after buying that rank.
- All test writes were **ROLLED BACK**; no QA guild or rewards remain.

## Remaining release dependencies

- Production gameplay Edge Function is still behind the GitHub gameplay bundle; server routes for Guild Bank, Construction and Guild Skill Trees need a verified deployment. Do not deploy raw or empty generated bundles.
- Already installed Android 1.0.3 builds will not acquire new UI. A correctly configured, signed 1.0.4 production AAB is required.
- All 17 approved Guild Construction templates are enabled in both databases. War Room III is Guild Level 15, beyond the existing guild cap 10 and therefore remains progression-locked.
