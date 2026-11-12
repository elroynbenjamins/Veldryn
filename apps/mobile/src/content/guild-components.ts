import type {ItemDef} from './items';
import type {Recipe} from './skills';
import {increasedCraftingGoldCost} from './crafting-gold-cost';

/** Eight illustrated guild-only construction components. Material costs and
 * crafting inputs are fixed, not equipment rarity/quality rolls.
 * Guild-only component crafts cost 5x the original ingredients and Gold, and earn 2x XP.
 */
export const GUILD_COMPONENT_ITEMS:ItemDef[]=[
 {id:'GUILD_REINFORCED_TIMBER',name:'Reinforced Timber Bundle',type:'material',rarity:'common',value:0,guildOnly:true},
 {id:'GUILD_MASONS_KEYSTONE',name:"Mason's Keystone",type:'material',rarity:'uncommon',value:0,guildOnly:true},
 {id:'GUILD_FORGED_RIVETS',name:'Forged Rivet Crate',type:'material',rarity:'rare',value:0,guildOnly:true},
 {id:'GUILD_FORTIFICATION_HINGES',name:'Fortification Hinge Set',type:'material',rarity:'epic',value:0,guildOnly:true},
 {id:'GUILD_BANNERWEAVE',name:'Bannerweave Cloth',type:'material',rarity:'common',value:0,guildOnly:true},
 {id:'GUILD_HERALDIC_DYE',name:'Heraldic Dye Flask',type:'material',rarity:'uncommon',value:0,guildOnly:true},
 {id:'GUILD_SEAL_WAX',name:'Guild Seal Wax',type:'material',rarity:'rare',value:0,guildOnly:true},
 {id:'GUILD_BEACON_OIL',name:'Beacon Oil Flask',type:'material',rarity:'epic',value:0,guildOnly:true},
];
/** Guild construction is released and guild materials are ordinary repeatable
 * profession processing outputs. Keep client and deployed gameplay engine in sync.
 */
export const GUILD_COMPONENT_CRAFTING_RELEASED:boolean=true;
export const GUILD_COMPONENT_RECIPES:Recipe[]=([
 {id:'GUILD_FORGE_TIMBER',name:'Prepare Reinforced Timber',skillId:'smithing',level:4,xp:220,gold:150,seconds:75,repeatableTraining:true,inputs:[{itemId:'COPPER_INGOT',quantity:15},{itemId:'GREENWOOD_LOG',quantity:10}],output:{itemId:'GUILD_REINFORCED_TIMBER',quantity:1}},
 {id:'GUILD_FORGE_KEYSTONE',name:'Forge Mason\'s Keystone',skillId:'smithing',level:18,xp:560,gold:475,seconds:140,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:10},{itemId:'IRONWOOD_LOG',quantity:15}],output:{itemId:'GUILD_MASONS_KEYSTONE',quantity:1}},
 {id:'GUILD_FORGE_RIVETS',name:'Forge Rivet Crate',skillId:'smithing',level:35,xp:1120,gold:1450,seconds:260,repeatableTraining:true,inputs:[{itemId:'OATHSTONE_INGOT',quantity:10},{itemId:'OATHGLASS_SHARD',quantity:5}],output:{itemId:'GUILD_FORGED_RIVETS',quantity:1}},
 {id:'GUILD_FORGE_HINGES',name:'Forge Fortification Hinges',skillId:'smithing',level:60,xp:2900,gold:5000,seconds:570,repeatableTraining:true,inputs:[{itemId:'FROSTIRON_INGOT',quantity:10},{itemId:'WHITEPINE_LOG',quantity:10}],output:{itemId:'GUILD_FORTIFICATION_HINGES',quantity:1}},
 {id:'GUILD_TAILOR_BANNERWEAVE',name:'Weave Bannerweave Cloth',skillId:'tailoring',level:4,xp:200,gold:125,seconds:75,repeatableTraining:true,inputs:[{itemId:'MOSS_FIBER',quantity:25},{itemId:'BOAR_HIDE',quantity:10}],output:{itemId:'GUILD_BANNERWEAVE',quantity:1}},
 {id:'GUILD_TAILOR_DYE',name:'Prepare Heraldic Dye',skillId:'tailoring',level:18,xp:550,gold:450,seconds:140,repeatableTraining:true,inputs:[{itemId:'WOLF_PELT',quantity:15},{itemId:'THORN_SAP',quantity:5}],output:{itemId:'GUILD_HERALDIC_DYE',quantity:1}},
 {id:'GUILD_TAILOR_WAX',name:'Prepare Guild Seal Wax',skillId:'tailoring',level:35,xp:1130,gold:1500,seconds:260,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:5},{itemId:'TORN_OATHCLOTH',quantity:10}],output:{itemId:'GUILD_SEAL_WAX',quantity:1}},
 {id:'GUILD_TAILOR_BEACON_OIL',name:'Prepare Beacon Oil',skillId:'tailoring',level:60,xp:2840,gold:4750,seconds:570,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:10},{itemId:'WINTERMINT',quantity:10}],output:{itemId:'GUILD_BEACON_OIL',quantity:1}},
] as Recipe[]).map(recipe=>({...recipe,gold:increasedCraftingGoldCost(recipe.gold)}));
