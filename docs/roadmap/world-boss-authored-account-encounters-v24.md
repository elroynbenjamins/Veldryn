# World Boss V24 — authored 14-round regional Account Raids (hidden)

**Status:** November 15, 2026 — offline prototype only. **Not a playable World Boss, not a migration, not merged into 1.0.10/main.**

## Design carried forward

The live feature design remains **five days of War Camp preparation**, six 30-minute raid windows at 00:00, 08:00 and 16:00 UTC on Saturday and Sunday, then seven days of downtime. A player can use **up to five unlocked owned characters in one synchronous account-side battle**; the account gets **three total attempts per event**. Many accounts can independently fight the single worldwide boss simultaneously; only a future audited private worker may settle once per account attempt.

V24 replaces the **generic two-ability V22 temporal enemy** as an offline option with the already-authorized authored regional encounter designs from V6/V13. The previous V6 four-Echo roster and its role validation are unchanged unless the server explicitly sets the new **accountRaidV24** flag. The V23 private worker currently keeps using V22; **it does not read or run this new V24 replay yet**.

## Regional boss identities

| Boss | Mechanic emphasis | Signature attacks / player decisions |
| --- | --- | --- |
| Hollowroot Colossus | Attrition, exposed heart, root/spore control | Root Slam (telegraph), Vines, Sporeburst, Splinterstorm, Regrowth |
| Sunscar Devourer | Breakable solar plates, burns and sweeping AoE | Sandbreaker, Heat Haze, Scorch Mark, Burning Tempest, Solar Collapse |
| Frostmarch Warden | Frost aegis, freeze control, guard restoration | Ice Spear, Shard Volley, Freezing Chains, Frostbite, Whiteout, Aegis Refresh |

The authored 14-round cue scripts cover **3 bosses × 3 phases × 14 rounds = 126 cues**. They emit real telegraphs, interrupts, guard absorption, guard breaks, weak-point windows, shielding, healing, cleanses, burns and freezes. These are deterministic engine results, not cosmetic filler or client-predicted damage.

## One through five characters and fairness

A V24-only opt-in loosens V6's strict 1 Tank / 2 Damage / 1 Support four-Echo check, without modifying legacy results. One to five *previously verified* characters may fight together with any legal role mix. They retain their actual V12-verified stats, equipment, companion effects and abilities frozen at reservation.

The account-size **boss-attack pressure multiplier** is currently only a **calibration candidate**: 70%, 77.5%, 85%, 92.5%, 100% of the frozen profile's boss attack for rosters of 1, 2, 3, 4 and 5. It does **not** alter the fixed profile's defense/guard budget or global boss max HP. This is intended to prevent solo accounts from absorbing damage balanced for five bodies, but **must be tuned with actual class/level cohorts before launch**.

The V24 result reports:
- real per-character boss HP damage **separately** from local guard absorption;
- guardian protection, effective healing, shielding consumed, cleanses prevented and interrupts;
- the exact 14-round events and survived/wiped result;
- one provisional *account-normalized* contribution using V22's 100% / 12% / 7% / 5% / 4% actual HP-damage weighting, not one global HP transaction per character.

**Important:** A guard-only hit contributes **zero global HP damage**; it still counts in local mechanics and player impact scoring when those systems are later approved. This must be balanced so Frostmarch armored fights do not produce all-zero solo contributions.

## Implementation

- backend/src/server/combat/world-boss-round-prototype.ts — opt-in V24 one-to-five-character validation while preserving V6 four-role behavior as default.
- backend/src/server/combat/world-boss-account-raid-v22.ts — shared immutable roster hash verifier extracted without changing V22 replay semantics.
- backend/src/server/combat/world-boss-account-script-v24.ts — authoritative-script account adapter, boss/phase profile digest checks, role ledger and normalized single-account impact.
- apps/mobile/tests/world-boss-account-script-v24.ts — V12-derived five-character fixture, 3×3×5 coverage, baseline scripted mechanics, frozen packet tampering, old mode regressions.
- .github/workflows/world-boss-v12-validation.yml — focused TypeScript + existing private PostgreSQL tests; **no live database**.

## Blockers before any feature release

1. **New engine version and trusted worker migration:** the V23 worker reserves/settles a V22 time-driven packet. A V24 worker must explicitly freeze and verify a *new versioned battle packet*, replay payload and DB engine string before using this 14-round mode. Silent replay version changes would risk a retry crediting a different amount.
2. **Calibration:** evaluate one-to-five characters, class/role mixtures, all gear brackets and all three bosses/phases on measured population cohorts, including frontline-less and Support-less squads. Tune survival rate, local guard distribution, DPS vs utility and the provisional pressure/normalization coefficients; no approved values yet.
3. **War Camp:** implement real resource debits, donation receipts and Friday 23:59:59.999 UTC event-wide freeze and revision binding.
4. **Wallet and replay:** persist replay recovery, global HP/milestones and exactly-once account rewards up to 100 World Sigils per event. The 100 cap remains design only.
5. **Mobile UX:** compact account roster, explicit window clocks in local time (UTC reference), stable boss cast HUD, and summary details. Keep disabled until staged security review.

**No V24 route, event, Supabase migration or payout was activated.**
