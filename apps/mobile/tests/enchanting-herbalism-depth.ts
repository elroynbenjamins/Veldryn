import {HERB_NODES} from '../src/content/herbalism';
import {RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame,startHerbalism} from '../src/core/game';
import {
  HERBALISM_HARVEST_METHODS,
  herbalismEssenceChance,
  selectedHerbalismHarvestMethod,
  setHerbalismHarvestMethod,
} from '../src/core/herbalism';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}

ok(HERBALISM_HARVEST_METHODS.map(row=>row.unlockLevel).join(',')==='1,20,45,70','Herbalism methods must unlock at 1/20/45/70');
ok(HERBALISM_HARVEST_METHODS.some(row=>row.id==='quick'&&row.actionTimeMultiplier<1&&row.yieldMultiplier<1),'Quick Harvest must trade yield for speed');
ok(HERBALISM_HARVEST_METHODS.some(row=>row.id==='careful'&&row.actionTimeMultiplier>1&&row.essenceChanceMultiplier>1),'Careful Harvest must trade speed for rare finds');
ok(HERBALISM_HARVEST_METHODS.some(row=>row.id==='bountiful'&&row.yieldMultiplier>1&&row.xpMultiplier<1),'Bountiful Harvest must trade XP for material yield');
equal(itemDef('WILD_ESSENCE').type,'material','Wild Essence must be a registered crafting material');

let state=createCharacter(newGame(0),'WAYFINDER','Herbalist','male');
equal(selectedHerbalismHarvestMethod(state).id,'balanced','Fresh characters default to Balanced Picking');
let locked=false;try{setHerbalismHarvestMethod(state,'careful')}catch(error){locked=error instanceof Error&&error.message.includes('Herbalism level 45')}
ok(locked,'Careful Harvest must respect its Herbalism level gate');

state={...state,skills:state.skills.map(row=>row.skillId==='herbalism'?{...row,level:50,xp:50000}:row)};
state=setHerbalismHarvestMethod(state,'careful');
equal(selectedHerbalismHarvestMethod(state).id,'careful','Unlocked harvest method selection must persist on the character');

const dew=HERB_NODES.find(row=>row.id==='DEWLEAF_PATCH')!;
const balanced=herbalismEssenceChance({...state,character:{...state.character!,herbalismHarvestMethodId:'balanced'}},dew,'balanced',1);
const quick=herbalismEssenceChance({...state,character:{...state.character!,herbalismHarvestMethodId:'quick'}},dew,'quick',1);
const careful=herbalismEssenceChance(state,dew,'careful',1);
ok(careful>balanced&&balanced>quick,'Harvest methods must meaningfully order Wild Essence chance: careful > balanced > quick');

state=startHerbalism(state,'DEWLEAF_PATCH',1000);
equal(state.activity?.kind,'herbalism','Herbalism must start the authored gathering activity');
equal(state.activity?.herbalismHarvestMethodId,'careful','Active Herbalism sessions must snapshot the selected method');

const regional=RECIPES.find(row=>row.id==='ENCHANT_REGIONAL_CATALYST')!;
const radiant=RECIPES.find(row=>row.id==='ENCHANT_RADIANT_CATALYST')!;
ok(regional.skillId==='enchanting'&&regional.level===70&&regional.inputs.some(row=>row.itemId==='WILD_ESSENCE'),'Regional Catalyst must be advanced Enchanting work using Wild Essence');
ok(radiant.skillId==='enchanting'&&radiant.level===90&&radiant.inputs.some(row=>row.itemId==='REGIONAL_CATALYST'),'Radiant Catalyst must build on Regional Catalysts at high Enchanting');
ok(itemDef(regional.output.itemId).type==='material'&&itemDef(radiant.output.itemId).type==='material','Catalyst synthesis must not reintroduce legacy gear outputs');

console.log('PASS: Herbalism methods, Wild Essence and advanced Enchanting catalyst progression are reconciled onto Equipment 2.0');
