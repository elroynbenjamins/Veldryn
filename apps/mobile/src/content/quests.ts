import {SkillId} from '../core/types';
export type QuestKind='kills'|'item'|'equip'|'level'|'skillLevel'|'craft'|'boss';
export interface QuestDef{id:string;name:string;description:string;kind:QuestKind;targetId?:string;skillId?:SkillId;required:number;rewardGold:number;rewardItemId?:string;rewardItemQty?:number;}
export const QUESTS:QuestDef[]=[
{id:'QST_001',name:'A Name in the Ledger',description:'Defeat 5 Moss Rats.',kind:'kills',targetId:'MOSS_RAT',required:5,rewardGold:40,rewardItemId:'MOSS_FIBER',rewardItemQty:5},
{id:'QST_002',name:'First Blood, First Skill',description:'Reach level 2 in any guided gathering skill.',kind:'skillLevel',required:2,rewardGold:60,rewardItemId:'COPPER_ORE',rewardItemQty:4},
{id:'QST_003',name:"A Hound's Trail",description:'Defeat 6 Ironwood Wolves.',kind:'kills',targetId:'IRONWOOD_WOLF',required:6,rewardGold:90,rewardItemId:'WOLF_PELT',rewardItemQty:3},
{id:'QST_004',name:'Tools of the Trade',description:'Equip at least 2 pieces of gear.',kind:'equip',required:2,rewardGold:110,rewardItemId:'GREENWOOD_LOG',rewardItemQty:6},
{id:'QST_005',name:'Into Ironwood',description:'Reach character level 10.',kind:'level',required:10,rewardGold:160,rewardItemId:'IRONWOOD_LOG',rewardItemQty:4},
{id:'QST_006',name:'Thorn Beneath',description:'Defeat 8 Thornlings.',kind:'kills',targetId:'THORNLING',required:8,rewardGold:210,rewardItemId:'THORN_SAP',rewardItemQty:5},
{id:'QST_007',name:'Silver on the Water',description:'Collect 6 River Eels.',kind:'item',targetId:'RIVER_EEL',required:6,rewardGold:240,rewardItemId:'SILVERFIN',rewardItemQty:6},
{id:'QST_008',name:'Old Mine Bell',description:'Defeat 10 Cave Skitters.',kind:'kills',targetId:'CAVE_SKITTER',required:10,rewardGold:300,rewardItemId:'ASTER_IRON_ORE',rewardItemQty:5},
{id:'QST_009',name:'Rootbound Vault',description:'Defeat 6 Ancient Treants.',kind:'kills',targetId:'ANCIENT_TREANT',required:6,rewardGold:360,rewardItemId:'TROLL_HIDE',rewardItemQty:2},
{id:'QST_010',name:'Lanterns in Fog',description:'Defeat 10 Lantern Wretches.',kind:'kills',targetId:'LANTERN_WRETCH',required:10,rewardGold:430,rewardItemId:'WISP_DUST',rewardItemQty:8},
{id:'QST_011',name:'Place Among Guilds',description:'Reach character level 20.',kind:'level',required:20,rewardGold:500,rewardItemId:'OATHGLASS_SHARD',rewardItemQty:2},
{id:'QST_012',name:'Fallen Procession',description:'Defeat 8 Oathbound Squires.',kind:'kills',targetId:'OATHBOUND_SQUIRE',required:8,rewardGold:600,rewardItemId:'OATHGLASS_SHARD',rewardItemQty:3},
{id:'QST_013',name:'Oathglass Road',description:'Defeat 10 Fallen Sentinels.',kind:'kills',targetId:'FALLEN_SENTINEL',required:10,rewardGold:750,rewardItemId:'OATHGLASS_SHARD',rewardItemQty:5},
{id:'QST_014',name:'Fallen Knight',description:'Defeat the Fallen Knight.',kind:'boss',targetId:'FALLEN_KNIGHT',required:1,rewardGold:1000,rewardItemId:'OATHGLASS_SHARD',rewardItemQty:5},
{id:'QST_015',name:'Beyond the Green',description:'Claim victory over the Fallen Knight and reach level 25.',kind:'level',required:25,rewardGold:1250,rewardItemId:'OATHGLASS_CAPE',rewardItemQty:1},
];
