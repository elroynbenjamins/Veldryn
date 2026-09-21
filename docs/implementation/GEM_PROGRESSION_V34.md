# VELDRYN Gem Progression V34

V34 is the authoritative gem progression/content layer. It is additive to the V33 equipment catalog and preserves older V24/mobile gem identifiers as save compatibility.

## Invariants

- Every equipment piece exposes one Stat Gem socket and one Effect Gem socket.
- Stat Gems are predictable numerical specialization.
- Effect Gems alter playstyle and use Resonance.
- A family may have at most three equipped Effect Gems.
- Five grades: Cut, Polished, Refined, Flawless, Radiant.
- Combining is deterministic; gems are never destroyed by upgrading.
- Effect Gem recipes are account-wide knowledge.
- Radiant Gems are created mainly through combining and endgame catalysts, not ordinary world-drop lottery.
- No gem path uses premium currency and no player Market is assumed.

## Progression economy

| Upgrade | Copies | Dust | Catalyst | Gold | Queue time |
|---|---:|---:|---|---:|---:|
| Cut -> Polished | 3 | 0 | — | 1,500 | 5m |
| Polished -> Refined | 3 | 5 | — | 5,000 | 15m |
| Refined -> Flawless | 3 | 15 | Regional Catalyst x1 | 18,000 | 45m |
| Flawless -> Radiant | 3 | 40 | Radiant Catalyst x1 | 60,000 | 2h |

Dismantle Dust: 1 / 3 / 8 / 22 / 60.

Safe extraction: Grade I-II free, III 500g, IV 1,500g + 1 Dust, V 5,000g + 3 Dust.

## Effect Gem source identity

### Asterfall — foundation

| Family | Primary farm identity | Recipe |
|---|---|---|
| Momentum | Fallen Sentinel / Bell Warden | Bell Warden |
| Bulwark | Root Warden / Rootbound Heart | Rootbound Heart |
| Opening Strike | Fallen Lantern Knight / Bell Warden | Bell Warden |
| Sustenance | Briar Husk / Rootbound Heart | Rootbound Heart |
| Battle Rhythm | Bell Sentinel / Bell Warden | Bell Warden |
| Mercy | Drowned Pilgrim / Bell Warden | Bell Warden |

Asterfall primarily drops Cut gems, with bosses able to reach Polished.

### Sunscar — specialization

| Family | Dungeon identity |
|---|---|
| Execution | Caravan of Glass |
| Predator | Caravan of Glass |
| Critical Surge | Mirage Well |
| Ruin | Mirage Well |
| Aegis | Buried Observatory |
| Benediction | Buried Observatory |
| Opportunist | Buried Observatory |

Sunscar targets Polished/Refined progression.

### Frostmarch — advanced builds

| Family | Dungeon identity |
|---|---|
| Last Stand | Whitepine Hunt |
| Retaliation | Whitepine Hunt |
| Unyielding | Shiverlake Descent |
| Guardian's Gift | Shiverlake Descent |
| Renewal | Choir Caverns |
| Shared Resolve | Choir Caverns |
| Flow | Choir Caverns |

Frostmarch targets Refined/Flawless progression. Rimeglass remains a thematic regional gem material.

## Pity and duplicate protection

- Mapped dungeon Effect Gem: guaranteed no later than the 6th eligible clear without a mapped Effect Gem.
- Regional boss Effect Gem: guaranteed no later than the 10th eligible kill.
- Dungeon recipe: guaranteed no later than the 12th eligible clear.
- Regional boss recipe: guaranteed no later than the 20th eligible kill.
- Recipe rolls prioritize unlearned recipes from that source.
- If every recipe in the source pool is learned, a recipe result converts to 25 Gem Dust.
- Ordinary enemy/elite drops intentionally have no pity; they are supplementary farming routes.

## Party and Live Co-op

Weekly Combat/Mixed Party Contracts are fallback catalyst/gem progression sources; they do not hold exclusive best-in-slot effects.

The Resonance Cache is earned at 3 successful Live Co-op Dungeon clears per account week. It contains 25–40 Gem Dust, one Regional Catalyst, and a choice of 1 from 3 non-exclusive Effect Gems. Late progression may roll a Radiant Catalyst. Choice generation weights the active class and strongly weights a family currently at Resonance II, but never duplicates an option.

## Runtime safety

Effect proc state is per character + family. DoT may benefit from Execution/Predator/Ruin but does not generate Momentum/Critical Surge. HoT does not recursively generate Renewal/Mercy. Reflected damage cannot generate Momentum, Critical Surge, Opportunist or Retaliation. Environmental damage cannot trigger Retaliation. Pet/companion actions do not trigger player Effect Gems unless a future effect explicitly opts in.

## Implementation files

- `backend/src/server/equipment/gem-system-v34.ts` — canonical 12 Stat + 20 Effect families and Resonance.
- `backend/src/server/equipment/gem-progression-v34.ts` — grade/economy/material/item-ID rules.
- `backend/src/server/equipment/gem-acquisition-v34.ts` — region sources, pity, duplicate protection, Resonance Cache choices.
- Mobile V34 content/runtime extends the current two-socket equipment enhancement UI while retaining old gem IDs for existing local saves.
