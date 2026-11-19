/** HIDDEN EQ2 T1–T4 expanded crafted inventory. Source of identity:
 * docs/equipment-2-0/t1-t4-expansion-design.json (PR #1460).
 * Each row has a normal unrestricted 2-route crafting recipe; distinct
 * role recommendations are not class locks. Both V2 release flags OFF.
 * No set IDs: these are gap-filling standalone gear, not invented full sets.
 */
import type {EquipmentV2Standalone} from './equipment-v2-catalog';
export const EQUIPMENT_V2_EXPANDED_STANDALONES:readonly EquipmentV2Standalone[]=[
 {"id":"EQ2_EXP_T1_TANK_GLOVES","tier":1,"name":"Fieldborn Watcher's Grips","role":"tank","material":"steel","slot":"gloves","profile":"attack_defense"},
 {"id":"EQ2_EXP_T1_TANK_BOOTS","tier":1,"name":"Fieldborn Ironmarch Boots","role":"tank","material":"steel","slot":"boots","profile":"defense"},
 {"id":"EQ2_EXP_T1_TANK_CAPE","tier":1,"name":"Fieldborn Weatherworn Mantle","role":"tank","material":"mail","slot":"cape","profile":"defense_health"},
 {"id":"EQ2_EXP_T1_TANK_AMULET","tier":1,"name":"Fieldborn Anchor Pendant","role":"tank","material":"jewelry","slot":"amulet","profile":"health"},
 {"id":"EQ2_EXP_T1_DAMAGE_HELMET","tier":1,"name":"Fieldborn Scout Cowl","role":"damage","material":"leather","slot":"helmet","profile":"health"},
 {"id":"EQ2_EXP_T1_DAMAGE_LEGS","tier":1,"name":"Fieldborn Prowler Legwraps","role":"damage","material":"leather","slot":"legs","profile":"defense"},
 {"id":"EQ2_EXP_T1_DAMAGE_AMULET","tier":1,"name":"Fieldborn Keeneye Charm","role":"damage","material":"jewelry","slot":"amulet","profile":"attack"},
 {"id":"EQ2_EXP_T1_DAMAGE_RING","tier":1,"name":"Fieldborn Quickstrike Ring","role":"damage","material":"jewelry","slot":"ring","profile":"attack"},
 {"id":"EQ2_EXP_T1_SUPPORT_CHEST","tier":1,"name":"Fieldborn Herbalist Vest","role":"support","material":"cloth","slot":"chest","profile":"health"},
 {"id":"EQ2_EXP_T1_SUPPORT_LEGS","tier":1,"name":"Fieldborn Caretaker Trousers","role":"support","material":"cloth","slot":"legs","profile":"defense_health"},
 {"id":"EQ2_EXP_T1_SUPPORT_BOOTS","tier":1,"name":"Fieldborn Softstep Boots","role":"support","material":"cloth","slot":"boots","profile":"defense_health"},
 {"id":"EQ2_EXP_T1_SUPPORT_RING","tier":1,"name":"Fieldborn Shelter Signet","role":"support","material":"jewelry","slot":"ring","profile":"health"},
 {"id":"EQ2_EXP_T2_TANK_GLOVES","tier":2,"name":"Ironwood Thornwall Gauntlets","role":"tank","material":"steel","slot":"gloves","profile":"attack_defense"},
 {"id":"EQ2_EXP_T2_TANK_AMULET","tier":2,"name":"Ironwood Rootbound Pendant","role":"tank","material":"jewelry","slot":"amulet","profile":"health"},
 {"id":"EQ2_EXP_T2_TANK_RING","tier":2,"name":"Ironwood Watchsignet","role":"tank","material":"jewelry","slot":"ring","profile":"health"},
 {"id":"EQ2_EXP_T2_DAMAGE_LEGS","tier":2,"name":"Ironwood Ambusher Leggings","role":"damage","material":"leather","slot":"legs","profile":"defense"},
 {"id":"EQ2_EXP_T2_DAMAGE_BOOTS","tier":2,"name":"Ironwood Pathfinder Boots","role":"damage","material":"leather","slot":"boots","profile":"attack_health"},
 {"id":"EQ2_EXP_T2_DAMAGE_AMULET","tier":2,"name":"Ironwood Arrowcrest Pendant","role":"damage","material":"jewelry","slot":"amulet","profile":"attack"},
 {"id":"EQ2_EXP_T2_SUPPORT_LEGS","tier":2,"name":"Ironwood Groveweave Trousers","role":"support","material":"cloth","slot":"legs","profile":"defense_health"},
 {"id":"EQ2_EXP_T2_SUPPORT_CAPE","tier":2,"name":"Ironwood Restorative Cloak","role":"support","material":"cloth","slot":"cape","profile":"health"},
 {"id":"EQ2_EXP_T2_SUPPORT_RING","tier":2,"name":"Ironwood Sanctum Ring","role":"support","material":"jewelry","slot":"ring","profile":"health"},
 {"id":"EQ2_EXP_T3_TANK_LEGS","tier":3,"name":"Sunscar Stonewarden Greaves","role":"tank","material":"steel","slot":"legs","profile":"defense_health"},
 {"id":"EQ2_EXP_T3_TANK_BOOTS","tier":3,"name":"Sunscar Dunesentinel Boots","role":"tank","material":"steel","slot":"boots","profile":"defense"},
 {"id":"EQ2_EXP_T3_TANK_AMULET","tier":3,"name":"Sunscar Oathstone Pendant","role":"tank","material":"jewelry","slot":"amulet","profile":"health"},
 {"id":"EQ2_EXP_T3_DAMAGE_CAPE","tier":3,"name":"Sunscar Sandstalker Mantle","role":"damage","material":"leather","slot":"cape","profile":"attack_health"},
 {"id":"EQ2_EXP_T3_DAMAGE_AMULET","tier":3,"name":"Sunscar Glassfang Talisman","role":"damage","material":"jewelry","slot":"amulet","profile":"attack"},
 {"id":"EQ2_EXP_T3_DAMAGE_RING","tier":3,"name":"Sunscar Scorpion Ring","role":"damage","material":"jewelry","slot":"ring","profile":"attack"},
 {"id":"EQ2_EXP_T3_SUPPORT_GLOVES","tier":3,"name":"Sunscar Wellspring Wraps","role":"support","material":"cloth","slot":"gloves","profile":"attack_defense"},
 {"id":"EQ2_EXP_T3_SUPPORT_LEGS","tier":3,"name":"Sunscar Lifebloom Leggings","role":"support","material":"cloth","slot":"legs","profile":"defense_health"},
 {"id":"EQ2_EXP_T3_SUPPORT_RING","tier":3,"name":"Sunscar Renewal Signet","role":"support","material":"jewelry","slot":"ring","profile":"health"},
 {"id":"EQ2_EXP_T4_TANK_RING","tier":4,"name":"Glassbound Citadel Signet","role":"tank","material":"jewelry","slot":"ring","profile":"health"},
 {"id":"EQ2_EXP_T4_DAMAGE_LEGS","tier":4,"name":"Glassbound Razorwind Legguards","role":"damage","material":"leather","slot":"legs","profile":"defense"},
 {"id":"EQ2_EXP_T4_SUPPORT_AMULET","tier":4,"name":"Glassbound Starweave Pendant","role":"support","material":"jewelry","slot":"amulet","profile":"health"},
];
