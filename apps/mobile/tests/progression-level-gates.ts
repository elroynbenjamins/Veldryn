import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {MONSTERS} from '../src/content/monsters';
import {WORLD_ZONES} from '../src/content/world-map';
import {TIER_CHARACTER_LEVEL_FLOOR,TIER_CRAFTING_LEVEL_FLOOR} from '../src/content/equipment-recipes-v33';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const released=WORLD_ZONES.filter(zone=>zone.availability==='released');
const zoneById=new Map(released.map(zone=>[zone.id,zone]));
const zoneByName=new Map(released.map(zone=>[zone.name,zone]));

for(const monster of MONSTERS){
 const zone=zoneByName.get(monster.zone);
 ok(zone,monster.id+' must live in a released zone');
 ok(monster.unlockLevel>=zone!.minLevel,monster.id+' unlocks before its region');
 ok(monster.unlockLevel<=zone!.maxLevel+1,monster.id+' unlock is outside the authored region band');
}
for(const action of [...GATHERING,...HERB_NODES]){
 const zone=zoneById.get(action.zoneId);
 ok(zone,action.id+' must live in a released zone');
 // Skill level and character level are separate axes, but a launch node should not demand
 // a skill tier wildly beyond the region in which the player first encounters it.
 ok(action.unlockLevel<=Math.max(100,zone!.maxLevel+20),action.id+' has an implausible skill gate for '+zone!.name);
}

const equipment=RECIPES.filter(recipe=>recipe.v33EquipmentTier);
for(const recipe of equipment){
 const tier=recipe.v33EquipmentTier!;
 const characterFloor=TIER_CHARACTER_LEVEL_FLOOR[tier],craftFloor=TIER_CRAFTING_LEVEL_FLOOR[tier];
 ok(characterFloor!==undefined&&craftFloor!==undefined,'Unknown equipment tier '+tier);
 ok((recipe.characterLevel??0)>=characterFloor,recipe.id+' is below '+tier+' character floor');
 ok(recipe.level>=craftFloor,recipe.id+' is below '+tier+' crafting floor');
 ok(recipe.level<=Math.max(1,(recipe.characterLevel??1)+5),recipe.id+' crafting gate runs too far ahead of its character gate');
}
for(let i=1;i<=9;i++){
 const tier='T'+i,recipes=equipment.filter(recipe=>recipe.v33EquipmentTier===tier);
 ok(recipes.length>0,tier+' must contain equipment');
 if(i>1){
  const prev='T'+(i-1);
  ok(TIER_CHARACTER_LEVEL_FLOOR[tier]>TIER_CHARACTER_LEVEL_FLOOR[prev],tier+' character floor must advance');
  ok(TIER_CRAFTING_LEVEL_FLOOR[tier]>TIER_CRAFTING_LEVEL_FLOOR[prev],tier+' crafting floor must advance');
 }
}
for(let i=1;i<released.length;i++)ok(released[i].minLevel>=released[i-1].minLevel,'Released region minimum levels must not move backwards');

console.log(JSON.stringify({status:'PASS',releasedRegions:released.length,monsters:MONSTERS.length,gatheringNodes:GATHERING.length+HERB_NODES.length,equipmentRecipes:equipment.length,equipmentTiers:9},null,2));
