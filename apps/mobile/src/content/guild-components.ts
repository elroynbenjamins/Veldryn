import type {ItemDef} from './items';
import type {Recipe} from './skills';

/** Eight illustrated guild-only construction components. Material costs and
 * crafting inputs are fixed, not equipment rarity/quality rolls.
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
/** Do not allow commission crafting before real project rewards, server inventory
 * settlement, and the construction release gate have been verified together.
 */
export const GUILD_COMPONENT_CRAFTING_RELEASED:boolean=false;
export const GUILD_COMPONENT_RECIPES:Recipe[]=[
 {id:'GUILD_FORGE_TIMBER',name:'Prepare Reinforced Timber',skillId:'smithing',level:5,xp:110,gold:30,seconds:75,repeatableTraining:true,inputs:[{itemId:'COPPER_INGOT',quantity:3},{itemId:'GREENWOOD_LOG',quantity:2}],output:{itemId:'GUILD_REINFORCED_TIMBER',quantity:1}},
 {id:'GUILD_FORGE_KEYSTONE',name:'Forge Mason\'s Keystone',skillId:'smithing',level:18,xp:280,gold:95,seconds:140,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:3}],output:{itemId:'GUILD_MASONS_KEYSTONE',quantity:1}},
 {id:'GUILD_FORGE_RIVETS',name:'Forge Rivet Crate',skillId:'smithing',level:35,xp:560,gold:290,seconds:260,repeatableTraining:true,inputs:[{itemId:'OATHSTONE_INGOT',quantity:2},{itemId:'OATHGLASS_SHARD',quantity:1}],output:{itemId:'GUILD_FORGED_RIVETS',quantity:1}},
 {id:'GUILD_FORGE_HINGES',name:'Forge Fortification Hinges',skillId:'smithing',level:60,xp:1450,gold:1000,seconds:570,repeatableTraining:true,inputs:[{itemId:'FROSTIRON_INGOT',quantity:2},{itemId:'WHITEPINE_LOG',quantity:2}],output:{itemId:'GUILD_FORTIFICATION_HINGES',quantity:1}},
 {id:'GUILD_TAILOR_BANNERWEAVE',name:'Weave Bannerweave Cloth',skillId:'tailoring',level:5,xp:100,gold:25,seconds:75,repeatableTraining:true,inputs:[{itemId:'MOSS_FIBER',quantity:5},{itemId:'BOAR_HIDE',quantity:2}],output:{itemId:'GUILD_BANNERWEAVE',quantity:1}},
 {id:'GUILD_TAILOR_DYE',name:'Prepare Heraldic Dye',skillId:'tailoring',level:18,xp:275,gold:90,seconds:140,repeatableTraining:true,inputs:[{itemId:'WOLF_PELT',quantity:3},{itemId:'THORN_SAP',quantity:1}],output:{itemId:'GUILD_HERALDIC_DYE',quantity:1}},
 {id:'GUILD_TAILOR_WAX',name:'Prepare Guild Seal Wax',skillId:'tailoring',level:35,xp:565,gold:300,seconds:260,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:1},{itemId:'TORN_OATHCLOTH',quantity:2}],output:{itemId:'GUILD_SEAL_WAX',quantity:1}},
 {id:'GUILD_TAILOR_BEACON_OIL',name:'Prepare Beacon Oil',skillId:'tailoring',level:60,xp:1420,gold:950,seconds:570,repeatableTraining:true,inputs:[{itemId:'ECHO_TOUCHED_PELT',quantity:2},{itemId:'WINTERMINT',quantity:2}],output:{itemId:'GUILD_BEACON_OIL',quantity:1}},
];
