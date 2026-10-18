# Guild Token Shop + Guild Construction — Codex integration and merge handoff

Draft GitHub PR: https://github.com/elroynbenjamins/Veldryn/pull/594
Branch: `feature/guild-shop-foundation`; base: `main`.

## What is implemented in the PR branch
- A second, **separate** currency, **Guild Tokens**, distinct from the existing Quartermaster **Guild Marks**. Account-bound wallet, atomic ledger, 250 ordinary Tokens per UTC week. Idempotent verified normal and event claims.
- Daily Guild Muster claims: 10 for actual checked-in attendance, 10 for actual Combat/Skilling. Weekly goals: 50 after four attendance days, 40 after meaningful Guild Project participation, 30 for an earned Guild Boss reward. All read existing authoritative Guild records rather than client claims.
- Finite event-community milestone bonuses (100/150/200/350) from `event_community_claims` rows **already claimed** in VELDRYN. Event rewards bypass only the normal weekly cap; no infinite repeat claims.
- Real permanent reward definitions: two collection pets, three Elite companions (game has no Epic companion rarity), three profile borders, one icon and three five-emote packs using existing pet-emote art. Server-side purchase function v4 deducts tokens and adds account entitlements **in one DB transaction**.
- Compact mobile `Guild > Hall > Shop` interface with account balance, owned/level/cost locks, daily and weekly claims, event bonus claims, pet/companion/profile reward listings, and Guild Construction.
- Guild Construction: three long-term optional material/gold projects, progress and level gates, resource-specific donation amounts/presets, idempotent requests persisted over network timeouts, atomic wallet/inventory deductions, and durable guild unlock records on completion. Construction never gates ordinary Guild XP/leveling.
- Existing server-backed guild membership, guild level and online saved-game state are used; authenticated gameplay Edge routes call the service role only after verifying the bearer token.
- Premium chat emote ownership is checked by a database trigger on existing chat_messages; starter art remains free and the max two emotes/message rule is retained.

## Current feature gates and deliberately unavailable actions
**Do not enable unreleased assets or spend functions just to make a button work.**
- `guild_shop_reward_catalogue.enabled` defaults **false** for all 12 shop SKU rows.
- Purchase function `guild_shop_purchase_server_v4(uuid,text)` remains **not executable by service_role** until a staging smoke and merchandise approval.
- `guild_construction_templates.enabled` defaults **false**, and `guild_construction_donate_server_v2(...)` remains inaccessible to service_role until construction entitlement/art verification.
- The first Guild banner, guild border and hall decoration have completion records in `guild_construction_unlocks`, but their ID-to-GuildCustomization mapping/art and entitlement checks are not implemented yet. Keep construction spending OFF until these are correctly selectable in guild settings.
- Pet art `GUILD_PET_001..002`, companion portrait art `GUILD_UNIT_001..003`, three player-border visuals, and `guild:stormwatch-crest` icon art are not authored/registered yet; profile icon explicitly reports `artworkReady=false`.
- Level-14/15/18/20 rewards are long-term roadmap content; verify compatibility with the actual deployed Guild level cap/progression before enabling them.
- **No live migrations, Edge deployment, release flags or production transactions were applied by this PR work.**

## Test / validation procedures
- GitHub Actions workflow `.github/workflows/guild-shop-validation.yml`: installs backend/mobile cross-package types, runs strict online backend TypeScript, focused Guild Shop auth/policy tests, isolated PGlite full Guild Shop migration chain with wallet, ledger, collectibles, chat, event, purchase and construction invariants; mobile TypeScript.
- Check latest workflow URL and logs on PR before approval. Earlier focused Guild Shop workflows had passed. A passing PGlite fixture does **not** establish live Supabase migration safety by itself.
- Manual staging testing: migrate a *disposable* or dedicated VELDRYN staging database, check role/EXECUTE/RLS privileges; impersonate no other accounts; test UTC weekly reset, guild change/leave, purchase receipts after HTTP timeout, normal/event cap boundary, 2 simultaneous purchase requests, 2 simultaneous construction donations, and server snapshot revision sync after spending.
- Run `backend/supabase/tests/guild_shop_security.sql` in staging/isolated test database. Current feature-enabled grants should be disabled. When permitted release, re-review grants intentionally and update the security expectation.
- Run game content and mobile UI tests, Expo Doctor and Android AAB checks. Existing unrelated Expo SDK 57 patch mismatch and time-sensitive older tests should be independently reconciled with `main`, not hidden by this PR.

## Codex integration/merge checklist
1. Fetch latest `main` and rebase/merge `feature/guild-shop-foundation`, resolve conflicts. Keep legacy Quartermaster/Guild Marks intact.
2. Confirm all 23 Guild Shop migrations **900–922** apply in chronological order on current staging schema, and the new Guild private tables/claims are service-only.
3. Verify real rewards survive game save, reload, account character switch and reconciliation to canonical collections/companions/emotes. Test role restriction for guild combat companions.
4. Add/register missing pet, companion, player profile border/icon and construction artwork; integrate `guild_construction_unlocks` into canonical GuildCustomization entitlements, validating officer permissions when equipping guild cosmetics.
5. Verify guild level progression supports gated later rewards (or keep those locked as future content).
6. After staging validates safe purchase delivery, explicitly grant service_role EXECUTE on **only** `guild_shop_purchase_server_v4`; enable individually approved SKU rows in `guild_shop_reward_catalogue`. Never enable v1/v2/v3 legacy buy.
7. After construction reward application works, explicitly grant `guild_construction_donate_server_v2` to service_role; enable individually approved construction templates. Maintain idempotency and available Gold/material checks.
8. Deploy matching Gameplay Edge build, repeat end-to-end authenticated QA, test bad/suspended/missing guild membership, unavailable purchases and full inventory sync.
9. Require up-to-date PR CI and review before the **Codex-managed** merge to `main`; deploy DB/Edge in a safe migration plan before an AAB that exposes new Shop controls.

## Content mapping
| Shop offer ID | Account reward |
|---|---|
| guild_pet_01 / guild_pet_02 | GUILD_PET_001 / GUILD_PET_002 |
| guild_companion_01 / 02 / 03 | GUILD_UNIT_001 / 002 / 003 |
| border_silver / emerald / royal | guild-border-silver / emerald / royal |
| icon_guild | guild:stormwatch-crest |
| emotes_fellowship | pet_set_a_01 through 05 |
| emotes_adventure | pet_set_a_06 through 10 |
| emotes_legends | pet_set_b_01 through 05 |

The GitHub PR is code-only; no direct live-data writes were authorized or performed.
