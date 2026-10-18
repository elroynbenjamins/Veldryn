import type {ItemDef} from './items';
import type {ItemStack} from '../core/types';

export type PotionEffect = {kind:'healing';maxHpFraction:number} |
  {kind:'preparation';attackFraction:number;damageReductionFraction:number;encounters:number};
export interface PotionDefinition {id:string;name:string;effect:PotionEffect;description:string;}
export interface AlchemyRecipe {
  id:string;name:string;skillId:'alchemy';level:number;seconds:number;xp:number;gold:number;
  inputs:ItemStack[];output:ItemStack;
}
// One start reserves a full AFK run, bounded by resources, Gold and the AFK cap.
export const MAX_ALCHEMY_BATCHES=10_000;
export const POTIONS:readonly PotionDefinition[]=[
  {id:'DEWLEAF_DRAUGHT',name:'Dewleaf Draught',effect:{kind:'healing',maxHpFraction:.25},description:'Restore 25% of maximum HP outside a hunt. No effect at full health.'},
  {id:'RIVERHEART_DRAUGHT',name:'Riverheart Draught',effect:{kind:'healing',maxHpFraction:.45},description:'Restore 45% of maximum HP outside a hunt. No effect at full health.'},
  {id:'OATHBLOOM_DRAUGHT',name:'Oathbloom Draught',effect:{kind:'healing',maxHpFraction:.65},description:'Restore 65% of maximum HP outside a hunt. No effect at full health.'},
  {id:'VIGOR_TONIC',name:'Vigor Tonic',effect:{kind:'preparation',attackFraction:.04,damageReductionFraction:0,encounters:30},description:'+4% attack for 30 resolved ordinary encounters.'},
  {id:'GREATER_VIGOR_TONIC',name:'Greater Vigor Tonic',effect:{kind:'preparation',attackFraction:.06,damageReductionFraction:0,encounters:45},description:'+6% attack for 45 resolved ordinary encounters.'},
  {id:'OATH_VIGOR_TONIC',name:'Oath Vigor Tonic',effect:{kind:'preparation',attackFraction:.08,damageReductionFraction:0,encounters:60},description:'+8% attack for 60 resolved ordinary encounters.'},
  {id:'WARD_TONIC',name:'Ward Tonic',effect:{kind:'preparation',attackFraction:0,damageReductionFraction:.04,encounters:30},description:'4% less incoming damage for 30 resolved ordinary encounters.'},
  {id:'GREATER_WARD_TONIC',name:'Greater Ward Tonic',effect:{kind:'preparation',attackFraction:0,damageReductionFraction:.06,encounters:45},description:'6% less incoming damage for 45 resolved ordinary encounters.'},
  {id:'OATH_WARD_TONIC',name:'Oath Ward Tonic',effect:{kind:'preparation',attackFraction:0,damageReductionFraction:.08,encounters:60},description:'8% less incoming damage for 60 resolved ordinary encounters.'},
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
export const ALCHEMY_RECIPES:readonly AlchemyRecipe[]=[
  recipe('DEWLEAF_DRAUGHT',1,60,60,4,[{itemId:'DEWLEAF',quantity:2}]),
  recipe('VIGOR_TONIC',8,75,115,8,[{itemId:'DEWLEAF',quantity:2},{itemId:'RIVER_MINT',quantity:2}]),
  recipe('WARD_TONIC',16,90,195,12,[{itemId:'DEWLEAF',quantity:2},{itemId:'IRONBLOOM',quantity:2}]),
  recipe('RIVERHEART_DRAUGHT',25,105,315,18,[{itemId:'DEWLEAF',quantity:3},{itemId:'RIVER_MINT',quantity:3}]),
  recipe('GREATER_VIGOR_TONIC',35,120,475,28,[{itemId:'RIVER_MINT',quantity:3},{itemId:'CAVELICHEN',quantity:2}]),
  recipe('GREATER_WARD_TONIC',45,135,700,40,[{itemId:'IRONBLOOM',quantity:3},{itemId:'CROWN_SAGE',quantity:2}]),
  recipe('OATHBLOOM_DRAUGHT',60,150,1075,60,[{itemId:'DEWLEAF',quantity:4},{itemId:'OATHBLOSSOM',quantity:2}]),
  recipe('OATH_VIGOR_TONIC',75,165,1550,90,[{itemId:'CAVELICHEN',quantity:3},{itemId:'OATHBLOSSOM',quantity:3}]),
  recipe('OATH_WARD_TONIC',85,180,2000,120,[{itemId:'CROWN_SAGE',quantity:3},{itemId:'OATHBLOSSOM',quantity:3}]),
  recipe('GREATER_VIGOR_TONIC',35,132,550,32,[{itemId:'SUNSCALE',quantity:2},{itemId:'RIVER_MINT',quantity:2}],'_SUNSCAR'),
  recipe('OATH_VIGOR_TONIC',75,174,1700,98,[{itemId:'WINTERMINT',quantity:2},{itemId:'OATHBLOSSOM',quantity:2}],'_FROSTMARCH'),
  recipe('OATH_WARD_TONIC',85,190,2150,128,[{itemId:'ASHEN_MYRRH',quantity:2},{itemId:'FROSTBLOOM',quantity:2}],'_ASHLANDS'),
  {id:'BREW_VERDANT_BINDING_RESIN',name:'Verdant Binding Resin',skillId:'alchemy',level:1,seconds:90,xp:95,gold:18,inputs:[{itemId:'DEWLEAF',quantity:5},{itemId:'MOSS_FIBER',quantity:12},{itemId:'WISP_DUST',quantity:3},{itemId:'ASTERFALL_BOTANICAL_ESSENCE',quantity:1}],output:{itemId:'VERDANT_BINDING_RESIN',quantity:1}},
  {id:'BREW_OATHGLASS_SOLVENT',name:'Oathglass Solvent',skillId:'alchemy',level:20,seconds:135,xp:420,gold:55,inputs:[{itemId:'IRONBLOOM',quantity:4},{itemId:'OATHGLASS_SHARD',quantity:4},{itemId:'ECHO_QUARTZ',quantity:2},{itemId:'ASTERFALL_BOTANICAL_ESSENCE',quantity:1}],output:{itemId:'OATHGLASS_SOLVENT',quantity:1}},
  {id:'BREW_SUNFUSED_FIXATIVE',name:'Sunfused Fixative',skillId:'alchemy',level:49,seconds:165,xp:950,gold:110,inputs:[{itemId:'SUNSCALE',quantity:3},{itemId:'AMBERGLASS',quantity:2},{itemId:'SCORPION_VENOM',quantity:2}],output:{itemId:'SUNFUSED_FIXATIVE',quantity:1}},
  {id:'BREW_RIMEWARD_DISTILLATE',name:'Rimeward Distillate',skillId:'alchemy',level:76,seconds:195,xp:1750,gold:220,inputs:[{itemId:'WINTERMINT',quantity:3},{itemId:'RIMEGLASS',quantity:2},{itemId:'RIME_RESIN',quantity:3}],output:{itemId:'RIMEWARD_DISTILLATE',quantity:1}},
  {id:'BREW_CINDERHEART_ELIXIR',name:'Cinderheart Elixir',skillId:'alchemy',level:96,seconds:225,xp:3000,gold:420,inputs:[{itemId:'ASHEN_MYRRH',quantity:4},{itemId:'BLACKGLASS_CORE',quantity:2},{itemId:'CINDER_HEART',quantity:1}],output:{itemId:'CINDERHEART_ELIXIR',quantity:1}},
];
export const POTION_ITEMS:ItemDef[]=POTIONS.map(potion=>({id:potion.id,name:potion.name,type:'potion',
  value:potion.id==='DEWLEAF_DRAUGHT'?4:potion.id.includes('OATH')?32:potion.id.includes('GREATER')?20:8,
  rarity:potion.id.includes('OATH')?'rare':potion.id.includes('GREATER')?'uncommon':'common',passive:potion.description}));
export const ALCHEMY_EQUIPMENT_INFUSION_ITEMS:ItemDef[]=ALCHEMY_EQUIPMENT_INFUSIONS.map(infusion=>({id:infusion.id,name:infusion.name,type:'material',value:infusion.value,rarity:infusion.rarity,passive:infusion.description}));
export const potionDef=(id:string|undefined)=>POTIONS.find(p=>p.id===id);
export const alchemyRecipeDef=(id:string)=>ALCHEMY_RECIPES.find(recipe=>recipe.id===id);
