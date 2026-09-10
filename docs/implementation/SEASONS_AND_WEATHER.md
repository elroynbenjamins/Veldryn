# Seasons and weather

## Runtime model

- The season follows UTC calendar months: Bloomtide (March–May), Suncrest (June–August), Emberfall (September–November), and Frostwane (December–February).
- Every region receives a deterministic daily weather roll at 00:00 UTC. The seed includes the UTC date and region ID, so regions may have different weather while all players see stable results for the same region and day.
- Starting combat or gathering snapshots the region, season, and weather. Those conditions remain fixed until rewards are collected or the activity changes, preventing a midnight roll from changing already-earned rewards.
- Season and weather multipliers stack multiplicatively. Existing equipment, tool, pet, event, and permanent modifiers continue to apply through their established systems.

## Seasonal rules

| Season | Months | Weighted weather pool | Activity effect |
|---|---|---|---|
| Bloomtide | Mar–May | Rain 40%; Mist 20%; Clear 20%; Bloomwind 20% | Mining, Woodcutting, Fishing: +8% materials |
| Suncrest | Jun–Aug | Clear 40%; Heatwave 20%; Storm 20%; Mist 20% | Mining, Woodcutting, Fishing: +5% speed |
| Emberfall | Sep–Nov | Mist, Rain, Harvest Wind, Clear, Storm: 20% each | Combat: +8% gold; gathering: +5% materials |
| Frostwane | Dec–Feb | Snow 40%; Frost 20%; Clear 20%; Mist 20% | Combat: +8% XP, −5% speed |

## Weather rules

| Weather | Combat | Mining | Woodcutting | Fishing |
|---|---|---|---|---|
| Clear Skies | +3% speed | +3% speed | +3% speed | +3% speed |
| Steady Rain | −5% speed | — | — | +12% speed, +10% fish |
| Gloam Mist | +12% loot chance | — | — | — |
| Thunderstorm | +10% XP, −8% speed | +12% ore | — | — |
| Bloomwind | — | — | +12% logs | — |
| Heatwave | — | +10% speed | −8% speed | −8% speed |
| Harvest Wind | — | — | +10% speed | — |
| Snowfall | +12% XP, −10% speed | — | — | — |
| Deep Frost | — | +10% ore | — | −12% speed |

The top-left pair of icons in the shared top bar always shows the conditions currently governing the player: current-region conditions while idle, or the locked activity snapshot while working. Pressing either icon opens the live rules and combined-effects sheet. That sheet shows the next weather and season rollover, highlights the active discipline, presents exact stacked cycle-time/reward multipliers, and lists the weighted weather possibilities for the current season.
