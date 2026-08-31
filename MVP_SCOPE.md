# VELDRYN Offline MVP Scope — Milestone 1: The Fallen Knight

## Definition of done
A fresh local account can:
Create a character -> learn the Home/activity loop -> fight Asterfall monsters -> earn/equip/salvage/sell gear -> gather/craft useful items -> complete onboarding quests -> reach level 25 -> defeat the Fallen Knight -> see Sunscar unlocked/teased.

## Required systems
- 7 class choices.
- One playable character required; extra character/squad systems may remain inaccessible in this milestone.
- Local save/load + migrations.
- Timestamp-based offline progression, launch cap 8 hours.
- Asterfall combat targets and meaningful unlock progression.
- XP, level, gold, loot, inventory, equipment, basic item comparison.
- Sell/salvage loop.
- Mining, Woodcutting, Fishing, Smithing, Cooking baseline loops.
- First onboarding quest chain and Fallen Knight gate.
- Settings/accessibility basics from workbook v4.5.
- Development-only debug tools.
- Local telemetry suitable for balance testing.

## Explicitly out of scope for Milestone 1
- Supabase deployment or paid hosting.
- Real account authentication.
- Live co-op.
- Q-Mode/Echo recruitment UI.
- Guilds.
- Production Market.
- Arena / Squad Arena / Triad Trials.
- Raids.
- Chat/network moderation UI.
- Purchases/VIP/season monetization.
- Full Sunscar content.

## Quality targets
- Core action reachable in <=4 taps from Home.
- Claim offline progress in 1 primary action.
- No critical data loss across current supported save migrations.
- No required gameplay mechanic depends on animation.
- No class should be obviously unusable for level 1-25 solo progression.
- Fallen Knight should feel like a real milestone, not a passive stat check only.
