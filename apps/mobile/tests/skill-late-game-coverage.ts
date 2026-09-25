import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {ALCHEMY_RECIPES} from '../src/content/alchemy';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {FAITH_TIERS,FAITH_BLESSINGS,HOLY_WATER_SOURCES} from '../src/content/faith';
import {MONSTERS} from '../src/content/monsters';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const allGather=[...GATHERING,...HERB_NODES];
for(const skill of ['mining','woodcutting','fishing','herbalism'] as const){
 const rows=allGather.filter(x=>x.skillId===skill);ok(rows.length>=4,skill+' needs a meaningful node ladder');
 ok(Math.max(...rows.map(x=>x.unlockLevel))>=46,skill+' needs post-Asterfall progression');
}
for(const skill of ['smithing','tailoring'] as const){
 const rows=V33_EQUIPMENT_RECIPES.filter(x=>x.skillId===skill);ok(rows.some(x=>x.v33EquipmentTier==='T9'),skill+' must remain relevant through T9');
 ok(Math.max(...rows.map(x=>x.level))>=68,skill+' must retain late-game crafting gates');
}
ok(ALCHEMY_RECIPES.some(x=>x.level>=85),'Alchemy must have Ashlands-era utility');
ok(RECIPES.some(x=>x.skillId==='cooking'&&x.level>=48),'Cooking must progress beyond Asterfall');
ok(RECIPES.some(x=>x.skillId==='enchanting'&&x.level>=90),'Enchanting must have level-90 utility');
ok(EXPLORATION_ROUTES.some(x=>x.zoneId==='ASHLANDS'&&x.requiredLevel>=71),'Exploration must reach Ashlands');
ok(FAITH_TIERS.some(x=>x.level>=80)&&FAITH_BLESSINGS.some(x=>x.level>=90),'Faith must have level-80+ practice and level-90 blessing progression');
ok(HOLY_WATER_SOURCES.some(x=>MONSTERS.find(m=>m.id===x.monsterId)?.zone==='Ashlands'),'Faith must have an Ashlands reagent source');
ok(MONSTERS.some(x=>x.zone==='Ashlands'&&x.level>=80),'Combat must retain late-game targets');
console.log(JSON.stringify({status:'PASS',gathering:GATHERING.length,herbalism:HERB_NODES.length,recipes:RECIPES.length,alchemy:ALCHEMY_RECIPES.length,exploration:EXPLORATION_ROUTES.length,faithTiers:FAITH_TIERS.length},null,2));
