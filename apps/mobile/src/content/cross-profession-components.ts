import type {ItemDef} from './items';
import type {Recipe} from './skills';
import {increasedCraftingGoldCost} from './crafting-gold-cost';

/** Tradeable, class-independent inputs linking Smithing and Tailoring.
 * Every intermediate is made without the other profession's components,
 * preventing circular prerequisite chains. */
export const CROSS_PROFESSION_COMPONENT_ITEMS:ItemDef[]=[
  {id:'METAL_CLASPS',name:'Metal Clasps',type:'material',value:35},
  {id:'REINFORCED_BUCKLES',name:'Reinforced Buckles',type:'material',value:145},
  {id:'ARMOR_RIVETS',name:'Armor Rivets',type:'material',value:620},
  {id:'CLOTH_BINDINGS',name:'Cloth Bindings',type:'material',value:28},
  {id:'PADDED_LININGS',name:'Padded Linings',type:'material',value:100},
  {id:'REINFORCED_STRAPS',name:'Reinforced Straps',type:'material',value:520},
];

export const CROSS_PROFESSION_COMPONENT_RECIPES:Recipe[]=([
  {id:'FORGE_METAL_CLASPS',name:'Forge Metal Clasps',skillId:'smithing',level:1,xp:75,gold:30,seconds:42,repeatableTraining:true,inputs:[{itemId:'COPPER_INGOT',quantity:1}],output:{itemId:'METAL_CLASPS',quantity:1}},
  {id:'FORGE_REINFORCED_BUCKLES',name:'Forge Reinforced Buckles',skillId:'smithing',level:8,xp:210,gold:85,seconds:75,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:2}],output:{itemId:'REINFORCED_BUCKLES',quantity:1}},
  {id:'FORGE_ARMOR_RIVETS',name:'Forge Armor Rivets',skillId:'smithing',level:20,xp:480,gold:260,seconds:150,repeatableTraining:true,inputs:[{itemId:'SUNSTONE_ORE',quantity:3},{itemId:'ASTER_IRON_INGOT',quantity:1}],output:{itemId:'ARMOR_RIVETS',quantity:1}},
  {id:'WEAVE_CLOTH_BINDINGS',name:'Weave Cloth Bindings',skillId:'tailoring',level:1,xp:75,gold:30,seconds:42,repeatableTraining:true,inputs:[{itemId:'MOSS_FIBER',quantity:5},{itemId:'BOAR_HIDE',quantity:1}],output:{itemId:'CLOTH_BINDINGS',quantity:1}},
  {id:'STITCH_PADDED_LININGS',name:'Stitch Padded Linings',skillId:'tailoring',level:8,xp:210,gold:85,seconds:75,repeatableTraining:true,inputs:[{itemId:'WOLF_PELT',quantity:5},{itemId:'MOSS_FIBER',quantity:6}],output:{itemId:'PADDED_LININGS',quantity:1}},
  {id:'STITCH_REINFORCED_STRAPS',name:'Stitch Reinforced Straps',skillId:'tailoring',level:20,xp:480,gold:260,seconds:150,repeatableTraining:true,inputs:[{itemId:'SUNSCALE',quantity:3},{itemId:'DUNEWOOD',quantity:4}],output:{itemId:'REINFORCED_STRAPS',quantity:1}},
  // Optional reclamation routes: never force Asterfall monster trophies into Sunscar equipment.
  {id:'FORGE_RECLAIMED_ARMOR_RIVETS',name:'Forge Reclaimed Armor Rivets',skillId:'smithing',level:20,xp:480,gold:260,seconds:150,repeatableTraining:true,inputs:[{itemId:'FALLEN_RIVET',quantity:1},{itemId:'SUNSTONE_ORE',quantity:2},{itemId:'ASTER_IRON_INGOT',quantity:1}],output:{itemId:'ARMOR_RIVETS',quantity:1}},
  {id:'STITCH_RECYCLED_REINFORCED_STRAPS',name:'Stitch Recycled Reinforced Straps',skillId:'tailoring',level:20,xp:480,gold:260,seconds:150,repeatableTraining:true,inputs:[{itemId:'TORN_OATHCLOTH',quantity:2},{itemId:'SUNSCALE',quantity:2},{itemId:'DUNEWOOD',quantity:2}],output:{itemId:'REINFORCED_STRAPS',quantity:1}},
] as Recipe[]).map(recipe=>({...recipe,gold:increasedCraftingGoldCost(recipe.gold)}));
