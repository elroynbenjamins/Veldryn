# VELDRYN Offline Prototype v0.4 — Fallen Knight Slice

This is the first broader **fun-test** build. It includes combat idling, gear drops/equip/sell/salvage, Mining/Woodcutting/Fishing, Smithing/Cooking, five onboarding quests, and the first local Fallen Knight challenge.

Everything remains offline/local. No Supabase project or paid hosting is needed. The UI depends on the GameRepository interface so a future Supabase implementation can replace AsyncStorage without rewriting the screens.

## Test goal
Create a character → fight → loot/equip → gather/craft → complete onboarding quests → reach level 25 → defeat Fallen Knight.
