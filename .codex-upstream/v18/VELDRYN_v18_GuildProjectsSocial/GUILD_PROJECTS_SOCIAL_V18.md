# VELDRYN v18 — Guild Projects + deeper Guild social systems

## 1. Design goal

Guilds should feel like a persistent long-term community layer without becoming scheduled raid attendance or another daily checklist. v18 therefore focuses on asynchronous shared goals that normal VELDRYN play can advance.

The social ladder stays distinct:

- Solo: normal character progression.
- Party: lightweight 1–4 player cooperation.
- Guild: long-term community + larger asynchronous projects.
- Live Dungeon: synchronous 1 Tank / 2 Damage / 1 Support.
- Q-Mode: asynchronous dungeon alternative.
- Companion systems: separate personal/team progression.

No new Guild Project currency is introduced.

## 2. Project slots and progression

Use the existing Guild-level progression:

| Guild Level | Active Project Slots |
|---|---:|
| 1–4 | 0 |
| 5–9 | 1 |
| 10–24 | 2 |
| 25+ | 3 |

At Lv5, the first slot primarily supports Development Projects. The repeatable Weekly Project Board begins at Lv10, when the Guild can support two project slots and therefore does not have to choose between permanent Guild construction and the weekly social loop.

Only one Weekly Campaign can be active at once. Other slots can hold Development/Event projects.

## 3. Three Project kinds

### Weekly Campaign

Repeatable 7-day-cycle social objective. Three candidates are shown:

- Combat
- Skilling
- Mixed

Exact current content is not required for recruitment/discovery. These are broad Guild playstyle signals.

The server rotates one candidate per category deterministically each Monday at 00:00 UTC. Authorized roles can start one. All members can recommend/vote.

If Guild management is inactive for 36 hours, the server can auto-start the highest-voted candidate when it has enough support. Required votes scale from 2 to 6 based on active Guild size.

The active Weekly Project expires at the cycle boundary (next Monday 00:00 UTC), so cycles never overlap.

### Development Project

Persistent communal Gold/material construction/research goal. It does not expire through the weekly rotation. These projects unlock/advance existing Guild buildings/features.

Development Projects use project-scoped atomic donations, not a Market and not standardized activity effort.

### Event Project

Live-Ops-authored temporary Guild Project using the same immutable definition/snapshot framework. This hook allows future seasonal events or Regional Crises to create Guild-specific goals without creating a fourth Project engine.

## 4. Weekly difficulty scaling

Difficulty is based on the Guild's recently active roster at Project start, not total capacity.

Reference formula:

`target = clamp(4,000 + 700 × active members, 6,000, 32,000)`

`active members` is clamped to 2–40 for scaling.

Examples:

| Active members | Target | Standardized Guild effort |
|---:|---:|---:|
| 4 | 6,800 | 6.8h |
| 10 | 11,000 | 11h |
| 20 | 18,000 | 18h |
| 30 | 25,000 | 25h |
| 40+ | 32,000 | 32h |

This is intended to be moderately challenging while allowing imperfect participation.

## 5. Anti-carry rules

Minimum meaningful contributors:

`ceil(active members × 20%)`, clamped to 2–10.

Single-account completion share cap:

- 2 active members: 60%
- 3–5: 50%
- 6–12: 40%
- 13–25: 35%
- 26+: 30%

One account therefore cannot carry a large Guild.

Each account can have at most 2,400 standardized Weekly Project points credited per UTC day.

## 6. Combat / Skilling / Mixed

Combat Projects require their completion target from Combat contribution.

Skilling Projects require their completion target from Skilling contribution.

Mixed Projects require:

- total completion target,
- at least 30% of target from Combat,
- at least 30% of target from Skilling.

The remaining 40% can come from either category.

Skilling includes gathering, processing, crafting, fishing, hunting, alchemy and eligible deliveries as mapped by current server content.

## 7. Personal participation / rewards

Personal completion-reward eligibility is:

`max(300 points, 2% of Guild target)`

This is enough participation to matter without demanding equal contribution.

Personal milestones are reference thresholds:

- 300
- 750
- 1,500
- 2,500

Use existing reward bundles: Gold, regional materials, Companion Essence, ordinary crafting materials and occasional cosmetic/achievement progress. Do not add Guild Project Tokens.

## 8. Guild milestones

Project progress milestones:

- 25%
- 50%
- 75%
- 100% completion
- 125% stretch

100% completes the Project. 125% is optional prestige/season-score progress and should not gate normal rewards.

The Project grants fixed Guild XP at completion rather than converting every Project point into Guild XP.

## 9. Membership and Guild hopping

### Starting members

Members present when the Project starts are eligible for the shared completion reward if they meet the personal threshold and are still Guild members when claiming.

### Late joiners

Late joiners can contribute immediately.

They can become eligible for the completion reward only when:

- they joined while Project progress was <=70%,
- they have been in the Guild for at least 48 hours by Project completion,
- they meet the personal contribution threshold,
- they are still a Guild member at claim.

They can still earn appropriate personal milestone rewards before becoming completion-reward eligible.

### Weekly binding

Once meaningful Project contribution is reached, the account is bound to one Guild for that weekly Project cycle. Switching Guilds remains allowed, but the same account cannot feed a second Guild's Weekly Project that cycle.

## 10. Development Projects

The pack carries forward the intent of the existing design database:

- Reinforce the Guild Hall
- Stock the Expedition Lodge
- Runebound Research
- Forge the War Standards (leave disabled until Guild War exists)

Current repository content IDs are authoritative. Codex must validate the reference item/building/unlock IDs before publishing definitions.

### Meaningful donors

A mature Guild Development Project cannot complete with literally one donor. Reference rule:

- meaningful donor = at least 3% normalized share of the complete Project requirements,
- required meaningful donors = 15% of active members, clamped to 1–3.

This keeps early/small Guilds viable while preserving communal intent.

## 11. Weekly Guild Decree

Completing the Weekly Campaign opens a temporary Guild Decree choice.

General launch choices:

- Scholar's Week: +2% Guild-sourced XP, total Guild-sourced cap 12%.
- Fortune's Ledger: +1% relative drop chance, cap 8%.
- Golden Charter: +2% eligible activity Gold, cap 10%. No Market effect.
- Maker's Rhythm: +2% crafting production speed, cap 12%.
- Gatherer's Call: +2% gathering speed, cap 10%.

Future-system decrees remain disabled until their systems exist:

- Expedition Orders
- War Mobilization

Only one Decree can be active at once. It lasts 7 days and never bypasses the existing global/guild hard caps.

Members vote. Authorized Guild roles can confirm; an expired selection window can resolve the top vote server-side.

## 12. Guild roles / permissions

v18 aligns with the richer existing Guild-role design:

- Guild Master
- Co-Leader
- Officer
- Quartermaster
- War Captain
- Recruiter
- Veteran
- Member
- Recruit

Quartermaster no longer has Market/Procurement powers. It manages Projects/project-vault logistics instead.

All role changes and management actions remain server-authoritative and should enter the existing audit/Activity Feed where appropriate.

## 13. Guild Bulletin

A short 280-character Guild Bulletin appears near the top of the Guild Hub.

Editable by authorized roles. Keep append-only revision history server-side for moderation/support even though members only see the current version.

Examples:

- “Mixed Project this week — skilling still needed.”
- “New members: check the Project tab for easy ways to contribute.”

## 14. Guild Activity Feed

The feed is deliberately bounded (~30 days) and event-based. Do not post every fish/mining action.

Good feed entries:

- member joined/left/promoted,
- bulletin changed,
- Project started,
- 25/50/75/100 milestone,
- Project completed/expired,
- Decree vote opened/activated/ended,
- Guild achievement,
- recruitment status changed.

## 15. Project Architects leaderboard

Existing design contains `Guild Project Architects`. v18 provides the scoring hook.

Reference completion weight:

- permanent Development: 100
- Weekly standard: 40
- Weekly enhanced: 50
- Weekly prestige: 60
- Event: 60
- 125% stretch: +10

Repeated completion of the same repeatable template in one season uses diminishing value:

- first: 100%
- second: 70%
- third: 50%
- fourth+: 35%

Ties:

1. score,
2. unique Project templates,
3. earlier final completion timestamp,
4. Guild ID deterministic fallback.

Leaderboard rewards should be Guild-hall decoration / crest / profile prestige, not large permanent combat power.

## 16. Recruitment integration

Do not make exact current Project a hard Guild-finder filter.

Primary discovery remains broad:

- Combat / Skilling / Mixed focus,
- casual / balanced / active / competitive play style,
- PvE / social / crafting / events / etc.

The currently active Guild Project may appear as a soft informational tag/card detail.

## 17. Mobile UI

No new bottom-navigation tab.

Path remains:

`Account -> Social -> Guild`

Guild Hub tabs in the v18 reference UI:

- Overview
- Projects
- Members
- Activity
- Decrees

Recruitment remains accessible through the existing Social/Guild discovery surface.

## 18. Control Center

v17.3 is schema-driven, so v18 does not require a brand-new admin webpage.

v18 registers commands for:

- regenerate Project board,
- cancel stuck Project,
- repair exact Project progress (critical + approval),
- re-run normal Project finalization,
- cancel broken Decree.

It also adds remote gates and a Monday Project-board reset definition when the v17.2 operations tables are present.

## 19. Notifications

Recommended notification hooks:

- Project started,
- 75% complete,
- complete,
- <24h remaining,
- Decree vote open,
- Decree active,
- Bulletin updated.

Respect the user's notification-category settings and quiet hours. Do not turn ordinary contribution ticks into push notifications.

## 20. Security / consistency requirements

- Server owns all Project definitions/balance snapshots.
- Definition versions are immutable.
- Active Project balance snapshot is immutable.
- Contribution writes are idempotent.
- Contribution targets are snapshotted at settlement time.
- Guild cycle bindings prevent cross-Guild Project farming.
- Development donations are atomic with economy/inventory debit.
- Reward claims are idempotent.
- Client cannot submit contribution points or progress totals.
- Project repair controls go through v17.3 admin command auditing.
- Player Market must remain absent.
