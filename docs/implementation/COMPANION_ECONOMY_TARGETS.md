# Companion Economy Targets

This file records the intended balance relationships for Combat Companion progression. The executable source of truth is `apps/mobile/src/core/companion-economy-targets.ts`.

## Natural progression targets

The balance yardstick assumes roughly **900 natural Companion XP per focused day** from mixed hunting, Companion Trials and Sanctuary Expeditions. It is not a guaranteed daily reward.

| Rarity | Max level | Current natural XP | Target focused days |
| --- | ---: | ---: | ---: |
| Standard | 20 | 6,409 | 6–10 |
| Rare | 25 | 15,019 | 14–22 |
| Elite | 30 | 34,404 | 32–48 |
| Prestige | 35 | 78,426 | 70–100 |

Paid one-level training is an **accelerator and resource sink**, not the expected primary route to max level.

## Current cumulative currency budgets

These totals include required Ascensions. Prestige also includes final Prestige Mastery.

| Rarity | Natural-path Ascension Gold | Natural-path Ascension Essence | Bondstones | Buy-every-level Gold | Buy-every-level Essence |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standard | 2,550 | 330 | 4 | 11,820 total | 884 total |
| Rare | 3,009 | 389 | 4 | 35,450 total | 1,980 total |
| Elite | 10,143 | 1,228 | 13 | 121,786 total | 5,706 total |
| Prestige | 26,487 | 2,981 | 29 | 411,201 total | 15,577 total |

Per-companion regional/event material requirements are additional and intentionally content-specific.

## Monthly Trial economy

A full first-clear run through all 30 Companion Trial floors currently provides, including the monthly Floor 30 completion package:

- **3,570 Companion Essence**
- **73,050 Gold**
- **12 Bondstones**
- Trial Sanctuary materials from boss floors

The monthly featured Trial challenges are budgeted to add **1 Bondstone total per month**, giving a Trial-only monthly Bondstone cycle of **13**.

Important target relationships:

- Elite full Ascension = **13 Bondstones** → approximately one complete Trial month.
- Prestige Ascension + Mastery = **29 Bondstones**.
- Two Trial-only months = 26 Bondstones, deliberately not enough for Prestige completion.
- Three Trial-only months = 39 Bondstones, enough even without weekly acceleration.
- Fallen Knight rematches, Proving Grounds and eligible Expeditions accelerate this path for active players.
- One complete Trial month provides enough Essence and Gold for the natural-path Prestige Ascension/Mastery currency requirements, leaving Bondstones and materials as the meaningful long-term gates.

## Technique switching

Maximum Essence Basin output is **80 Essence per week**.

Technique switching costs **80 Essence and 0 Gold**.

Therefore a fully upgraded Essence Basin independently supports approximately one deliberate Technique switch per week.

## Telemetry milestones

Balance telemetry records write-once timestamps for:

- first Combat Companion
- first complete Tank / Damage / Support Trial trio
- first Ascension I
- first Ascension II
- first Ascension III
- first Bond 6
- first Bond 10
- first Prestige Mastery

These metrics should be reviewed before changing progression curves. The target ranges above are guardrails, not reasons to force player behavior into an exact timetable.
