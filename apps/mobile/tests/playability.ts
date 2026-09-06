import {createCharacter,newGame,startCombat,startGathering,previewActivityReward,craftRecipe} from '../src/core/game';
import {transitionActivity,recipeAvailability} from '../src/core/playability';
import {encounterUnlocked,nextRegionUnlock,regionEncounters} from '../src/core/world-navigation';
import {MONSTERS} from '../src/content/monsters';
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const initial=createCharacter(newGame(1000),'IRONWARDEN');
const combat=startCombat(initial,'MOSS_RAT',1000);
const expected=previewActivityReward(combat,61000);
const stopped=transitionActivity(combat,61000);
ok(stopped.state.activity===null,'Stop clears activity');
ok(stopped.state.character!.xp===expected.xp,'Stop preserves XP');
ok(stopped.state.character!.gold===initial.character!.gold+expected.gold,'Stop preserves gold');
ok(transitionActivity(stopped.state,61000).reward.kills===0,'Stop cannot duplicate rewards');
const switched=transitionActivity(combat,61000,{kind:'gathering',id:'COPPER_VEIN'});
ok(switched.state.character!.xp===expected.xp,'Switch preserves combat XP');
ok(switched.state.activity?.targetId==='COPPER_VEIN','Switch changes activity');
ok(previewActivityReward(switched.state,61000).kills===0,'New activity clock resets');
const gathered=transitionActivity(startGathering(initial,'COPPER_VEIN',1000),61000,{kind:'combat',id:'MOSS_RAT'});
ok(gathered.state.skills.find(sk=>sk.skillId==='mining')!.xp===18,'Gathering XP preserved at rebalanced action time');
ok(gathered.state.inventory.stacks.some(s=>s.itemId==='COPPER_ORE'&&s.quantity===2),'Gathered items preserved');
const snapshot=JSON.stringify(combat);
let rejected=false;
try{transitionActivity(combat,61000,{kind:'gathering',id:'invalid'})}catch{rejected=true}
ok(rejected,'Invalid transition rejects');
ok(JSON.stringify(combat)===snapshot,'Invalid switch leaves input untouched');
for(const item of expected.items){
  const before=initial.inventory.stacks.find(s=>s.itemId===item.itemId)?.quantity??0;
  const after=stopped.state.inventory.stacks.find(s=>s.itemId===item.itemId)?.quantity??0;
  ok(after===before+item.quantity,'Stop preserves loot');
}
const capped=transitionActivity(combat,30*3600*1000);
ok(capped.reward.elapsedSeconds===24*3600,'Transition respects offline cap');
ok(!recipeAvailability(initial,'SMELT_COPPER_INGOT').ready,'Missing materials disables recipe');
const supplied={...initial,bank:{...initial.bank,stacks:[{itemId:'COPPER_ORE',quantity:10}]}};
ok(recipeAvailability(supplied,'SMELT_COPPER_INGOT').ready,'Bank-only materials work');
ok(recipeAvailability(supplied,'SMELT_COPPER_INGOT').inputs[0].bank===10,'Bank breakdown');
ok(craftRecipe(supplied,'SMELT_COPPER_INGOT').inventory.stacks.some(s=>s.itemId==='COPPER_INGOT'),'Craft availability matches operation');
ok(!recipeAvailability({...supplied,character:{...supplied.character!,gold:0}},'SMELT_COPPER_INGOT').ready,'Gold gate');
ok(!recipeAvailability({...supplied,inventory:{stacks:[],capacity:0},bank:{stacks:[{itemId:'COPPER_ORE',quantity:20}],capacity:1}},'SMELT_COPPER_INGOT').ready,'Output storage gate');
ok(nextRegionUnlock(1)?.minLevel===5,'Next region sorted by level');
ok(nextRegionUnlock(25)===undefined,'All regions unlocked');
ok(regionEncounters(initial,'Greenfields',' MOSS ',true).length===1,'Search trims and ignores case');
ok(regionEncounters(initial,'Greenfields','impossible',false).length===0,'Empty search results');
const boss=MONSTERS.find(m=>m.boss)!;
ok(!encounterUnlocked(initial,boss),'Boss level gate');
const veteran={...initial,character:{...initial.character!,level:25}};
ok(!encounterUnlocked(veteran,boss),'Boss quest gate');
ok(encounterUnlocked({...veteran,quests:veteran.quests.map(q=>q.questId==='QST_014'?{...q,status:'active'}:q)},boss),'Boss accessible without idle-monster unlock ID');
console.log('PASS: activity settlement, no duplicate claim, bank-aware recipes and world navigation');
