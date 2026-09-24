import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {HOLY_WATER_SOURCES} from '../src/content/faith';
import {MONSTERS} from '../src/content/monsters';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const gather=(id:string)=>GATHERING.find(row=>row.id===id);
const recipe=(id:string)=>RECIPES.find(row=>row.id===id);

for(const [region,mine,wood,smelt] of [
 ['SUNSCAR','SUNSTONE_OUTCROP','DUNEWOOD_TREE','SMELT_SUNSTONE_INGOT'],
 ['FROSTMARCH','FROSTIRON_VEIN','WHITEPINE_TREE','SMELT_FROSTIRON_INGOT'],
 ['ASHLANDS','BLACKGLASS_VEIN','CINDERWOOD_TREE','SMELT_BLACKGLASS_INGOT'],
] as const){
 ok(gather(mine)?.zoneId===region,region+' must have regional Mining');
 ok(gather(wood)?.zoneId===region,region+' must have regional Woodcutting');
 const r=recipe(smelt);ok(r?.repeatableTraining&&r.inputs.length>=2,region+' metal processing must be repeatable and cross-skill');
 const mineItem=gather(mine)!.itemId,woodItem=gather(wood)!.itemId;
 ok(r!.inputs.some(x=>x.itemId===mineItem)&&r!.inputs.some(x=>x.itemId===woodItem),region+' smelting must consume its ore and wood fuel');
}
ok(gather('OASIS_CARP_POOL')?.zoneId==='SUNSCAR'&&gather('GLASSFIN_POOL')?.zoneId==='SUNSCAR','Sunscar Fishing must have regional progression');
ok(gather('ICEFISH_POOL')?.zoneId==='FROSTMARCH','Frostmarch Fishing must have regional progression');
ok(recipe('COOK_OASIS_CARP')?.inputs.some(x=>x.itemId==='OASIS_CARP'),'Sunscar Fishing must feed Cooking');
ok(recipe('COOK_GLASSFIN_FEAST')?.inputs.some(x=>x.itemId==='GLASSFIN'),'Sunscar advanced Fishing must feed Cooking');
ok(recipe('COOK_ICEFISH')?.inputs.some(x=>x.itemId==='ICEFIN')&&recipe('COOK_ICEFISH')?.inputs.some(x=>x.itemId==='WINTERMINT'),'Frostmarch Cooking must combine Fishing and Herbalism');
for(const [region,fish,cook] of [
 ['GREENFIELDS','MEADOW_PERCH','COOK_MEADOW_PERCH'],
 ['SILVERBROOK','SILVERFIN','COOK_SILVERFIN'],
 ['IRONWOOD','ROOTSTREAM_TROUT','COOK_ROOTSTREAM_TROUT'],
 ['OLD_MINES','CAVE_LOACH','COOK_CAVE_LOACH'],
 ['KINGS_ROAD','CROWN_CARP','COOK_CROWN_CARP'],
 ['SUNSCAR','OASIS_CARP','COOK_OASIS_CARP'],
 ['FROSTMARCH','ICEFIN','COOK_ICEFISH'],
 ['ASHLANDS','EMBERFIN','COOK_EMBERFIN'],
] as const){
 ok(GATHERING.some(x=>x.skillId==='fishing'&&x.zoneId===region&&x.itemId===fish),region+' must have a local Fishing sustain source');
 ok(recipe(cook)?.inputs.some(x=>x.itemId===fish),region+' local fish must feed Cooking');
}
ok(HERB_NODES.some(x=>x.id==='WINTERMINT_PATCH'&&x.zoneId==='FROSTMARCH'),'Wintermint must have a Frostmarch Herbalism source');

for(const region of ['SUNSCAR','FROSTMARCH','ASHLANDS'])ok(EXPLORATION_ROUTES.some(x=>x.zoneId===region),region+' must have Exploration progression');
for(const monsterId of HOLY_WATER_SOURCES.map(x=>x.monsterId))ok(MONSTERS.some(x=>x.id===monsterId),'Faith Holy Water source must resolve');
ok(HOLY_WATER_SOURCES.some(x=>MONSTERS.find(m=>m.id===x.monsterId)?.zone==='Sunscar'),'Faith must have a Sunscar source');
ok(HOLY_WATER_SOURCES.some(x=>MONSTERS.find(m=>m.id===x.monsterId)?.zone==='Frostmarch'),'Faith must have a Frostmarch source');
ok(HOLY_WATER_SOURCES.some(x=>MONSTERS.find(m=>m.id===x.monsterId)?.zone==='Ashlands'),'Faith must have an Ashlands source');
ok(MONSTERS.some(x=>x.zone==='Sunscar')&&MONSTERS.some(x=>x.zone==='Frostmarch')&&MONSTERS.some(x=>x.zone==='Ashlands'),'Hunting must retain combat targets through every released late region');

console.log(JSON.stringify({status:'PASS',regionalGathering:GATHERING.length,herbalismNodes:HERB_NODES.length,recipes:RECIPES.length,explorationRoutes:EXPLORATION_ROUTES.length,faithSources:HOLY_WATER_SOURCES.length},null,2));
