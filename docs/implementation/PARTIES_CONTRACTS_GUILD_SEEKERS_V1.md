# VELDRYN v16 — Parties, Contracts & Recruitment

## Product boundary

This v16 pass adds a persistent social Party layer without changing the existing synchronous Live Dungeon rules.

- Persistent Party: 1–4 current members, any role mix, Combat / Skilling / Mixed focus.
- Live Dungeon queue: still exactly 4 players with 1 Tank / 2 Damage / 1 Support.
- Party discovery never requires the same active quest or Contract.
- Current Party Contract/objective is optional recruitment context only.
- Party Chat is visible/readable only while the account is a current Party member.
- No Party currency is added.

## Party Contracts

Party Contracts are asynchronous cooperative goals. Initial content includes weekly Combat, Skilling and Mixed Contracts plus a Mixed ranked mini-event sample.

Raw actions do not share a universal point value. Each objective stores:

- target units;
- expected seconds per unit;
- optional setup time;
- optional preparation time per unit;
- difficulty;
- a canonical point budget derived from expected effort.

The TypeScript domain uses `BASE_POINTS_PER_EXPECTED_MINUTE = 10` and difficulty multipliers. The SQL content seed stores the resulting point budgets. Contribution is capped at objective target, so repeating a fast activity after its objective is full produces no extra score.

Shared objective progress can be completed by the Party collectively. Reward eligibility is separate: launch weekly Contracts default to a minimum personal contribution of 8% of total target points; the ranked sample uses 10%. A zero-contribution member can therefore help the Party remain together but cannot collect a completion entitlement.

Trusted settlement paths must call `record_party_contract_contribution_v16` only after server-verifying the underlying combat/skilling/crafting event. The mobile client must never report authoritative kills, gathers, crafts, points or reward amounts.

## Idempotency / authority

Party creation, joining and leaving use command receipts keyed by account + action + idempotency key. Contract contributions use a unique `(instance_id, idempotency_key)` receipt. Reward entitlements use `(instance_id, account_id, reward_key)` uniqueness.

Contract assignment, contribution and reward-generation SQL functions are service-role only. Clients receive readable projections through RLS but cannot directly mutate Contract score tables.

## Recruitment lifecycle

One shared recruitment board supports:

- `looking_for_party` — individual LFG;
- `party_recruiting` — existing Party LFM;
- `looking_for_guild` — guildless player advertises themselves;
- `guild_recruiting` — recruiting Guild advertises openings.

Freshness rules:

- LFG / LFM: exactly 1 day.
- Guild seeker / Guild recruiting: default 3 days; 1 or 3 days allowed.
- Active browse always applies `status='active' AND expires_at>now()`; visibility never depends on the cleanup job.
- Cleanup can mark elapsed rows `expired` later.
- Refresh/repost cooldown: 6 hours per owner + post type.
- One active post per account + post type.
- Closing and instantly reposting does not bypass the cooldown.

Search/filter data includes post type, Combat/Skilling/Mixed focus, Tank/Damage/Support roles where relevant, activity tags, playstyle, availability, guild interests, activity level, optional language/region, optional minimum Combat/Total levels and free text. Party recruiting supports open-spots filtering.

## Mobile UI

The supplied v16 mobile layer is intentionally compatible with the latest navigation direction: **Character / Skills / World / Inventory / Account**. Do not add a sixth bottom tab.

Recommended placement:

- Account > Social > Party: `PartyHubPanel`.
- Account > Social > Guild: existing Guild UI plus `GuildSeekerPanel` as a “Players seeking Guild” subview.
- Account > Social > Chat: existing Chat UI. Wrap Party-chat affordances with `PartyChatGate`.
- Configurable shortcut menu may point directly to Party, Guild or Dungeon.

`PartyHubPanel` uses dark pixel-game panels, gold framing, cyan selection/progress accents, 44–48px touch targets, recruitment search, focus chips, time-left labels, Party member list and Contract contribution state.

### Tutorial copy

Use `PARTY_SOCIAL_TUTORIAL_STEPS` from `apps/mobile/src/core/party-social.ts`. It explicitly teaches:

- Parties persist while members do different activities;
- normalized Contract effort;
- minimum personal contribution;
- 1-day Party ads / 3-day Guild ads;
- search and filters;
- Party Chat membership gating;
- separate Live Dungeon 1T/2D/1S requirement.

## Implemented integration

The current v15 repository is the implementation authority. `SocialScreen` is mounted through the existing app navigation; `online/party-social.ts` calls authenticated Supabase RPCs and `PartySocialProvider` shares current membership with the existing chat overlay. Existing Friends, Guild management, World/Guild Chat and Live Dungeon services remain in use.

Party creation/join/leave reuse `server_action_receipts`. Snapshot, recruitment publishing/refresh/close/browse, reward claims, rankings and Party Chat are connected to the mobile UI. Search filters run on the server before pagination. Parties remain role-flexible; Live uses its existing exact-role validators.

Trusted SQL settlement hooks consume the existing gathering, crafting and combat receipts. Contributions, instance creation and reward generation are unavailable to normal clients. Shared combat credit is divided among actual humans in the same persistent Party; equivalent combat receipt formats share a canonical node key. Offline local saves are not a trusted activity source.

The linked database has both appended v16 migrations. Recruitment and weekly Contract maintenance runs through the enabled `veldryn-party-social-v16` cron job every 30 minutes; expired adverts are hidden immediately by server queries regardless of that schedule.

Party Chat authorization is checked by the database on every read/write. Local membership actions refresh immediately; other-device membership changes are polled every 15 seconds while active, with refresh on foreground and chat open. Background or failed membership checks clear the chat gate. Existing Live Chat run/epoch authorization is preserved.

## Verification and release limits

See [V16_IMPLEMENTATION_REPORT.md](V16_IMPLEMENTATION_REPORT.md) for the exact file inventory, applied migration chain, commands and detailed evidence. Backend and mobile typechecks/builds, configured v15 suites, new v16 suites, real PostgreSQL RLS/RPC/settlement/concurrency tests, schema lint and Android/iOS Expo exports pass. The expanded repository runner reports 70/71: the older progression-balance simulation exceeds its historical duration target after repairing stale setup assumptions.

Native device/accessibility QA and a fresh local Supabase reset were not run. Existing co-op worker/deployment feature gates remain as documented in `COOP_CURRENT_STATUS.md`; this change does not enable them or accept unverified local gameplay as Contract progress.
