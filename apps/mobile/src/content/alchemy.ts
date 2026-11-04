import type {ItemDef} from './items';
import type {ItemStack} from '../core/types';
import {increasedCraftingGoldCost} from './crafting-gold-cost';

export type PotionTier=1|2|3;
export const POTION_TIER_UNLOCK_LEVELS:Record<PotionTier,number>={1:1,2:25,3:60};
export type PotionEffect = {kind:'healing';maxHpFraction:number} |
  {kind:'preparation';attackFraction:number;damageDealtFraction:number;damageReductionFraction:number;healingStrengthFraction:number;shieldStrengthFraction:number;encounters:number};
export interface PotionDefinition {id:string;name:string;tier:PotionTier;effect:PotionEffect;description:string;}
export interface AlchemyRecipe {
  id:string;name:string;skillId:'alchemy';level:number;seconds:number;xp:number;gold:number;
  inputs:ItemStack[];output:ItemStack;
}
// One start reserves a full AFK run, bounded by resources, Gold and the AFK cap.
export const MAX_ALCHEMY_BATCHES=10_000;
/** Healing potions are scarce consumables for dungeon and boss encounters. */
export const HEALING_POTION_CRAFT_COST_MULTIPLIER=5;
export const HEALING_POTION_XP_MULTIPLIER=3;
export const POTIONS:readonly PotionDefinition[]=[
  {id:'DEWLEAF_DRAUGHT',name:'Dewleaf Draught',tier:1,effect:{kind:'healing',maxHpFraction:.20},description:'Restore 20% max HP in boss fights or dungeons. Not usable in ordinary hunts.'},
  {id:'RIVERHEART_DRAUGHT',name:'Riverheart Draught',tier:2,effect:{kind:'healing',maxHpFraction:.35},description:'Restore 35% max HP in boss fights or dungeons. Not usable in ordinary hunts.'},
  {id:'OATHBLOOM_DRAUGHT',name:'Oathbloom Draught',tier:3,effect:{kind:'healing',maxHpFraction:.50},description:'Restore 50% max HP in boss fights or dungeons. Not usable in ordinary hunts.'},
  {id:'VIGOR_TONIC',name:'Vigor Tonic',tier:1,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.05,damageReductionFraction:0,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:30},description:'+5% damage dealt; replaces your current preparation. Lasts 30 ordinary encounters; combat run support requires server integration.'},
  {id:'GREATER_VIGOR_TONIC',name:'Greater Vigor Tonic',tier:2,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.10,damageReductionFraction:0,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:45},description:'+10% damage dealt; replaces your current preparation. Lasts 45 ordinary encounters; combat run support requires server integration.'},
  {id:'OATH_VIGOR_TONIC',name:'Oath Vigor Tonic',tier:3,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.15,damageReductionFraction:0,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:60},description:'+15% damage dealt; replaces your current preparation. Lasts 60 ordinary encounters; combat run support requires server integration.'},
  {id:'WARD_TONIC',name:'Ward Tonic',tier:1,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:0,damageReductionFraction:.05,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:30},description:'5% less incoming damage; replaces your current preparation. Lasts 30 ordinary encounters; combat run support requires server integration.'},
  {id:'GREATER_WARD_TONIC',name:'Greater Ward Tonic',tier:2,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:0,damageReductionFraction:.10,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:45},description:'10% less incoming damage; replaces your current preparation. Lasts 45 ordinary encounters; combat run support requires server integration.'},
  {id:'OATH_WARD_TONIC',name:'Oath Ward Tonic',tier:3,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:0,damageReductionFraction:.15,healingStrengthFraction:0,shieldStrengthFraction:0,encounters:60},description:'15% less incoming damage; replaces your current preparation. Lasts 60 ordinary encounters; combat run support requires server integration.'},
  {id:'HARMONY_TONIC',name:'Harmony Tonic',tier:1,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.02,damageReductionFraction:0,healingStrengthFraction:.05,shieldStrengthFraction:.05,encounters:30},description:'+2% damage and +5% ability healing/shielding. Lasts 30 ordinary encounters; dungeon support requires server integration.'},
  {id:'GREATER_HARMONY_TONIC',name:'Greater Harmony Tonic',tier:2,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.04,damageReductionFraction:0,healingStrengthFraction:.10,shieldStrengthFraction:.10,encounters:45},description:'+4% damage and +10% ability healing/shielding. Lasts 45 ordinary encounters; dungeon support requires server integration.'},
  {id:'OATH_HARMONY_TONIC',name:'Oath Harmony Tonic',tier:3,effect:{kind:'preparation',attackFraction:0,damageDealtFraction:.06,damageReductionFraction:0,healingStrengthFraction:.15,shieldStrengthFraction:.15,encounters:60},description:'+6% damage and +15% ability healing/shielding. Lasts 60 ordinary encounters; dungeon support requires server integration.'},
];
/** Regional infusion reagents turn Alchemy into a deliberate part of the gear
 * loop. They are consumed for initial assembly and naturally reappear in the
 * existing regional-upgrade costs through the equipment recipe itself. */
export const ALCHEMY_EQUIPMENT_INFUSIONS=Object.freeze([
  {id:'VERDANT_BINDING_RESIN',name:'Verdant Binding Resin',rarity:'rare' as const,value:70,description:'A dewleaf resin that binds early regional gear.'},
  {id:'OATHGLASS_SOLVENT',name:'Oathglass Solvent',rarity:'rare' as const,value:310,description:'A crystalline solvent for Oathstone-era gear.'},
  {id:'SUNFUSED_FIXATIVE',name:'Sunfused Fixative',rarity:'epic' as const,value:720,description:'A heat-stable fixative for Sunscar equipment.'},
  {id:'RIMEWARD_DISTILLATE',name:'Rimeward Distillate',rarity:'epic' as const,value:1320,description:'A frostbound distillate for Frostmarch equipment.'},
  {id:'CINDERHEART_ELIXIR',name:'Cinderheart Elixir',rarity:'legendary' as const,value:1600,description:'A volatile Ashlands elixir for capstone equipment.'},
] as const);
const recipe=(potionId:string,level:number,seconds:number,xp:number,gold:number,inputs:ItemStack[],suffix=''):AlchemyRecipe=>({
  id:`BREW_${potionId}${suffix}`,name:POTIONS.find(p=>p.id===potionId)!.name,skillId:'alchemy',level,seconds,xp,gold,inputs,output:{itemId:potionId,quantity:1},
});
export const ALCHEMY_RECIPES:readonly AlchemyRecipe[]=([
  recipe('DEWLEAF_DRAUGHT',1,60,60,4,[{itemId:'DEWLEAF',quantity:2}]),
  recipe('VIGOR_TONIC',1,75,115,8,[{itemId:'DEWLEAF',quantity:4}]),
  recipe('WARD_TONIC',1,90,195,12,[{itemId:'DEWLEAF',quantity:5}]),
  recipe('HARMONY_TONIC',1,100,220,14,[{itemId:'DEWLEAF',quantity:6}]),
  recipe('RIVERHEART_DRAUGHT',25,105,315,18,[{itemId:'DEWLEAF',quantity:3},{itemId:'RIVER_MINT',quantity:3}]),
  recipe('GREATER_VIGOR_TONIC',25,120,475,28,[{itemId:'RIVER_MINT',quantity:3},{itemId:'IRONBLOOM',quantity:2}]),
  recipe('GREATER_WARD_TONIC',25,135,700,40,[{itemId:'IRONBLOOM',quantity:3},{itemId:'RIVER_MINT',quantity:3}]),
  recipe('GREATER_HARMONY_TONIC',25,145,760,46,[{itemId:'RIVER_MINT',quantity:3},{itemId:'IRONBLOOM',quantity:4}]),
  recipe('OATHBLOOM_DRAUGHT',60,150,1075,60,[{itemId:'DEWLEAF',quantity:4},{itemId:'OATHBLOSSOM',quantity:2}]),
  recipe('OATH_VIGOR_TONIC',60,165,1550,90,[{itemId:'CAVELICHEN',quantity:3},{itemId:'OATHBLOSSOM',quantity:3}]),
  recipe('OATH_WARD_TONIC',60,180,2000,120,[{itemId:'CROWN_SAGE',quantity:3},{itemId:'OATHBLOSSOM',quantity:3}]),
  recipe('OATH_HARMONY_TONIC',60,190,2150,135,[{itemId:'CROWN_SAGE',quantity:4},{itemId:'OATHBLOSSOM',quantity:3}]),
  recipe('GREATER_VIGOR_TONIC',25,132,550,32,[{itemId:'SUNSCALE',quantity:2},{itemId:'RIVER_MINT',quantity:2}],'_SUNSCAR'),
  recipe('OATH_VIGOR_TONIC',60,174,1700,98,[{itemId:'WINTERMINT',quantity:2},{itemId:'OATHBLOSSOM',quantity:2}],'_FROSTMARCH'),
  recipe('OATH_WARD_TONIC',60,190,2150,128,[{itemId:'ASHEN_MYRRH',quantity:2},{itemId:'FROSTBLOOM',quantity:2}],'_ASHLANDS'),
  {id:'BREW_VERDANT_BINDING_RESIN',name:'Verdant Binding Resin',skillId:'alchemy',level:1,seconds:90,xp:95,gold:18,inputs:[{itemId:'DEWLEAF',quantity:5},{itemId:'MOSS_FIBER',quantity:12},{itemId:'WISP_DUST',quantity:3},{itemId:'ASTERFALL_BOTANICAL_ESSENCE',quantity:1}],output:{itemId:'VERDANT_BINDING_RESIN',quantity:1}},
  {id:'BREW_OATHGLASS_SOLVENT',name:'Oathglass Solvent',skillId:'alchemy',level:20,seconds:135,xp:420,gold:55,inputs:[{itemId:'IRONBLOOM',quantity:4},{itemId:'OATHGLASS_SHARD',quantity:4},{itemId:'ECHO_QUARTZ',quantity:2},{itemId:'ASTERFALL_BOTANICAL_ESSENCE',quantity:1}],output:{itemId:'OATHGLASS_SOLVENT',quantity:1}},
  {id:'BREW_SUNFUSED_FIXATIVE',name:'Sunfused Fixative',skillId:'alchemy',level:49,seconds:165,xp:950,gold:110,inputs:[{itemId:'SUNSCALE',quantity:3},{itemId:'AMBERGLASS',quantity:2},{itemId:'SCORPION_VENOM',quantity:2}],output:{itemId:'SUNFUSED_FIXATIVE',quantity:1}},
  {id:'BREW_RIMEWARD_DISTILLATE',name:'Rimeward Distillate',skillId:'alchemy',level:76,seconds:195,xp:1750,gold:220,inputs:[{itemId:'WINTERMINT',quantity:3},{itemId:'RIMEGLASS',quantity:2},{itemId:'RIME_RESIN',quantity:3}],output:{itemId:'RIMEWARD_DISTILLATE',quantity:1}},
  {id:'BREW_CINDERHEART_ELIXIR',name:'Cinderheart Elixir',skillId:'alchemy',level:96,seconds:225,xp:3000,gold:420,inputs:[{itemId:'ASHEN_MYRRH',quantity:4},{itemId:'BLACKGLASS_CORE',quantity:2},{itemId:'CINDER_HEART',quantity:1}],output:{itemId:'CINDERHEART_ELIXIR',quantity:1}},
] as AlchemyRecipe[]).map(recipe=>{
  const healing=POTIONS.some(potion=>potion.id===recipe.output.itemId&&potion.effect.kind==='healing');
  const costMultiplier=healing?HEALING_POTION_CRAFT_COST_MULTIPLIER:1;
  return {...recipe,
    xp:recipe.xp*(healing?HEALING_POTION_XP_MULTIPLIER:1),
    gold:increasedCraftingGoldCost(recipe.gold)*costMultiplier,
    inputs:recipe.inputs.map(input=>({...input,quantity:input.quantity*costMultiplier}))};
});
export const POTION_ITEMS:ItemDef[]=POTIONS.map(potion=>({id:potion.id,name:potion.name,type:'potion',
  value:potion.id==='DEWLEAF_DRAUGHT'?4:potion.id.includes('OATH')?32:potion.id.includes('GREATER')?20:8,
  rarity:potion.id.includes('OATH')?'rare':potion.id.includes('GREATER')?'uncommon':'common',passive:potion.description}));
export const ALCHEMY_EQUIPMENT_INFUSION_ITEMS:ItemDef[]=ALCHEMY_EQUIPMENT_INFUSIONS.map(infusion=>({id:infusion.id,name:infusion.name,type:'material',value:infusion.value,rarity:infusion.rarity,passive:infusion.description}));
export const potionDef=(id:string|undefined)=>POTIONS.find(p=>p.id===id);
/** Present potions in a single scrolling list with tier separators; never add a tier tab. */
export const potionTier=(id:string|undefined):PotionTier|undefined=>potionDef(id)?.tier;
export const alchemyRecipeDef=(id:string)=>ALCHEMY_RECIPES.find(recipe=>recipe.id===id);
