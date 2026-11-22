# Frostfall 2026 — Companion rework (review only)

## Status
- Three Elite companions, including approved artwork, are authored on a review branch, **not deployed or enabled**.
- `FROSTFALL_REWARDS_RELEASED=false` stays unchanged. Both production and staging Frostfall server events remain disabled.
- **No placeholder art is published**. Do not promote this branch or turn on the release flag until visual design, production asset paths, and runtime tests are approved.

## Event reward roster
| Companion | Role | Event reward | Counterplay niche |
| --- | --- | --- | --- |
| Rimeshard Wolverine (`EVT_UNIT_012`) | Damage | 6,000 Frostfall reputation | Fast focused strike; 5-second, 2.5% increased damage taken on its marked target |
| Hearthguard Ram (`EVT_UNIT_013`) | Tank | 8,500 Frostfall reputation | Defensive shield with modest 10% reflection; Bond increases reflected share |
| Frostbell Herald (`EVT_UNIT_009`) | Support | **Original** 10,000-reputation milestone (ID retained) | Direct heal to the lowest-health ally plus a 4-second, 2.5% damage-reduction buff |

The 20-offer Frostfall Shop and current pet/currency rewards remain untouched. All three earn permanent account ownership with normal Level 1/Bond 1 progression; they use Elite level 30, Ascensions, Event Bondbloom and Tier 3 Trial materials, Sanctuary and selectable techniques. Companion affinities are Lynx Arcane, Ram Primal, Herald Arcane. Keep every class able to equip every companion role.

## Gameplay integrity and balancing
- Frostbell Herald is now server-effect **heal**, not the old utility damage-buff cast. Mobile description and server ability should agree.
- Its effective server cooldown is 24 s × 0.88 = 21.12 s, while the mobile authored cooldown rounds to 21 s.
- Character assist and standalone companion combat both implement the Herald's short mitigation buff and Lynx's short vulnerability; no client-only fake effects.
- Damage and mitigation statuses must be verified for replay, refresh/stack rules, bosses, and counter-build comparisons.
- Ram's reflection is **on shield absorption only**, capped by the existing engine; not a free retaliation on every hit.
- Rarity and Housing remain the existing companion rework; no special Frostfall stat ceiling or legacy shortcut.
- No mandatory Frostfall companion: existing damage/mitigation/healing counter-builds must remain viable.

## Art direction / review needed (no assets committed)
- **Rimeshard Wolverine:** heavyset winter wolverine, glimmering cyan fur accents, crystalline shoulder flecks, short ears and broad clawed forelimbs; clearly not the Laurel Lynx pet.
- **Hearthguard Ram:** round heavy-wool ram, broad winter horns, modest protective brass bell, sturdy stance; not a recolored Choir Golem.
- Frostbell Herald retains its existing accepted 96 × 96 portrait unless a separate visual approval requests an update.
- The approved transparent pixel-art PNGs for `EVT_UNIT_012` and `EVT_UNIT_013` are checked in under `assets/event_collectibles/frostfall_festival/companions` and mapped by `eventCompanionSourceById`. Verify Android/Metro packaging and actual on-device screen presentation before enabling rewards. No placeholder images.

## Mandatory release gates
1. Code/CI: mobile core, companion integration, event release graph, backend companion trial and combat tests, and gameplay/co-op Edge parity on an exact reviewed SHA.
2. Staging: verify milestone claims and duplicate/replay safety, multi-character shared ownership, training/Ascension/technique/Bond unlock, Sanctuary availability, Trial three-role composition, dungeon/raid assist and after-event persistence.
3. Balance: test short and endurance (up to 42-room) fights, all five Frostfall dungeon tiers, Rimebell Colossus boss casts, healing counterplay and 10% shield reflection limits.
4. Asset: approved two real 96 × 96 companion portraits and theme; verify icon validator, Android AAB and actual small-screen layout.
5. Release: separately validate production migration/Edge parity and manually approve Frostfall event and reward flags; never activate automatically at calendar start.

### Suggested commands
```sh
pnpm --dir apps/mobile typecheck:core
pnpm --dir apps/mobile test:companions
pnpm --dir apps/mobile test:event-release-graph
pnpm --dir backend typecheck:online
node tools/verify-gameplay-edge.mjs
```

No migration, Edge function deployment, UI/theme change, or production write is included in this review branch.
