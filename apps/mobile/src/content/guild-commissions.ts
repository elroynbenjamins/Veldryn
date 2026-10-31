import type {ItemDef} from './items';
import type {Recipe} from './skills';

/** Guild-only, stackable commission outputs. These are never personal gear,
 * do not roll rarity/quality and deliberately have no shop resale value.
 * Server donations remain disabled until construction and inventory sync pass staging.
 */
export const GUILD_COMMISSION_ITEMS:ItemDef[]=[
 {id:'GUILD_IRON_BRACKET',name:'Guild Iron Bracket',type:'material',value:0,rarity:'common',guildOnly:true},
 {id:'GUILD_HEARTIRON_SUPPORT',name:'Heartiron Support',type:'material',value:0,rarity:'uncommon',guildOnly:true},
 {id:'GUILD_OATHSILVER_FITTING',name:'Oathsilver Fitting',type:'material',value:0,rarity:'rare',guildOnly:true},
 {id:'GUILD_FROSTIRON_FRAME',name:'Frostiron Frame',type:'material',value:0,rarity:'rare',guildOnly:true},
 {id:'GUILD_EMBERSTEEL_REINFORCEMENT',name:'Embersteel Reinforcement',type:'material',value:0,rarity:'epic',guildOnly:true},
 {id:'GUILD_PENNANT',name:'Guild Pennant',type:'material',value:0,rarity:'common',guildOnly:true},
 {id:'GUILD_RESINBOUND_CANVAS',name:'Resinbound Canvas',type:'material',value:0,rarity:'uncommon',guildOnly:true},
 {id:'GUILD_ECHO_WOVEN_BANNER',name:'Echo-Woven Banner',type:'material',value:0,rarity:'rare',guildOnly:true},
 {id:'GUILD_WINTERVEIL_STANDARD',name:'Winterveil Standard',type:'material',value:0,rarity:'rare',guildOnly:true},
 {id:'GUILD_ASHEN_WAR_BANNER',name:'Ashen War Banner',type:'material',value:0,rarity:'epic',guildOnly:true},
];
/** Inputs are real Veldryn resource IDs, not descriptive placeholders.
 * Repeatable processing grants regular profession XP on completed cycles.
 */
export const GUILD_COMMISSION_RECIPES:Recipe[]=[
 {id:'FORGE_GUILD_IRON_BRACKET',name:'Forge Guild Iron Bracket',skillId:'smithing',level:5,xp:110,gold:30,seconds:75,repeatableTraining:true,inputs:[{itemId:'COPPER_INGOT',quantity:3},{itemId:'GREENWOOD_LOG',quantity:2}],output:{itemId:'GUILD_IRON_BRACKET',quantity:1}},
 {id:'FORGE_GUILD_HEARTIRON_SUPPORT',name:'Forge Heartiron Support',skillId:'smithing',level:18,xp:280,gold:95,seconds:140,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:3}],output:{itemId:'GUILD_HEARTIRON_SUPPORT',quantity:1}},
 {id:'FORGE_GUILD_OATHSILVER_FITTING',name:'Forge Oathsilver Fitting',skillId:'smithing',level:35,xp:560,gold:290,seconds:260,repeatableTraining:true,inputs:[{itemId:'OATHSTONE_INGOT',quantity:2},{itemId:'OATHGLASS_SHARD',quantity:1}],output:{itemId:'GUILD_OATHSILVER_FITTING',quantity:1}},
 {id:'FORGE_GUILD_FROSTIRON_FRAME',name:'Forge Frostiron Frame',skillId:'smithing',level:60,xp:1450,gold:1000,seconds:570,repeatableTraining:true,inputs:[{itemId:'FROSTIRON_INGOT',quantity:2},{itemId:'WHITEPINE_LOG',quantity:2}],output:{itemId:'GUILD_FROSTIRON_FRAME',quantity:1}},
 {id:'FORGE_GUILD_EMBERSTEEL_REINFORCEMENT',name:'Forge Embersteel Reinforcement',skillId:'smithing',level:80,xp:2700,gold:2200,seconds:1050,repeatableTraining:true,inputs:[{itemId:'BLACKGLASS_INGOT',quantity:2},{itemId:'CINDERWOOD_LOG',quantity:2}],output:{itemId:'GUILD_EMBERSTEEL_REINFORCEMENT',quantity:1}},
 {id:'TAILOR_GUILD_PENNANT',name:'Sew Guild Pennant',skillId:'tailoring',level:5,xp:100,gold:25,seconds:75,repeatableTraining:true,inputs:[{itemId:'MOSS_FIBER',quantity:5},{itemId:'BOAR_HIDE',quantity:2}],output:{itemId:'GUILD_PENNANT',quantity:1}},
 {id:'TAILOR_GUILD_RESINBOUND_CANVAS',name:'Weave Resinbound Canvas',skillId:'tailoring',level:18,xp:275,gold:90,seconds:140,repeatableTraining:true,inputs:[{itemId:'WOLF_PELT',quantity:3},{itemId:'THORN_SAP',quantity:1}],output:{itemId:'GUILD_RESINBOUND_CANVAS',quantity:1}},
 {id:'TAILOR_GUILD_ECHO_WOVEN_BANNER',name:'Weave Echo-Woven Banner',skillId:'tailoring',level:35,xp:565,gold:300,seconds:260,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:1},{itemId:'TORN_OATHCLOTH',quantity:2}],output:{itemId:'GUILD_ECHO_WOVEN_BANNER',quantity:1}},
 {id:'TAILOR_GUILD_WINTERVEIL_STANDARD',name:'Sew Winterveil Standard',skillId:'tailoring',level:60,xp:1420,gold:950,seconds:570,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:2},{itemId:'WINTERMINT',quantity:2}],output:{itemId:'GUILD_WINTERVEIL_STANDARD',quantity:1}},
 {id:'TAILOR_GUILD_ASHEN_WAR_BANNER',name:'Sew Ashen War Banner',skillId:'tailoring',level:80,xp:2600,gold:2100,seconds:1050,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:2},{itemId:'ASHEN_MYRRH',quantity:2}],output:{itemId:'GUILD_ASHEN_WAR_BANNER',quantity:1}},
];