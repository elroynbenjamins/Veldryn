# Companion Economy Targets

These are balance guardrails for Combat Companion progression. The executable source of truth is `apps/mobile/src/core/companion-economy-targets.ts`.

## Natural progression targets

The balance model uses roughly **900 natural Companion XP per focused day** from mixed hunting, Trials and Sanctuary Expeditions. This is a yardstick, not a guaranteed daily reward.

| Rarity | Max level | Intended focused days |
| --- | ---: | ---: |
| Standard | 20 | 6–10 |
| Rare | 25 | 14–22 |
| Elite | 30 | 32–48 |
| Prestige | 35 | 70–100 |

Paid one-level training remains an accelerator/resource sink, not the intended primary route to max level.

## Bondstone relationship

A full first-clear monthly Trial run provides **12 Bondstones**. The monthly challenge rotation contributes at most **1 additional Bondstone**, for a Trial-only monthly cycle of **13**.

Current full progression gates:
- Standard: 4 Bondstones
- Rare: 4 Bondstones
- Elite: 13 Bondstones
- Prestige including final Mastery: 29 Bondstones

This makes Elite roughly one complete Trial month and Prestige more than two but no more than three Trial-only months before active weekly/rematch/Expedition acceleration.

## Technique switching

Maximum Essence Basin output is **80 Essence/week** and Technique switching costs **80 Essence / 0 Gold**, so a fully developed Sanctuary can independently support roughly one deliberate Technique switch per week.

## Telemetry before tuning

Do not alter the core curves solely from theoretical totals. Review the write-once milestones for:
- first Combat Companion
- first complete Tank/Damage/Support trio
- first Ascension I / II / III
- first Bond 6 / Bond 10
- first Prestige Mastery

These let real player pacing tell us whether the guardrails are too fast or too slow. Review the telemetry before changing live costs, XP curves, or Bondstone faucets.

Validation note: these guardrails are executed by the mobile core test suite on every companion economy change.
