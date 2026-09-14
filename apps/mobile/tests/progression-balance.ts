import {CLASSES} from '../src/content/classes';
import {MONSTERS} from '../src/content/monsters';
import {QUESTS} from '../src/content/quests';
import {V1_BALANCE_TARGETS,ASTERFALL_PRODUCTIVE_HOUR_BUDGET} from '../src/content/asterfall';
import {claimActivity, createCharacter, craftRecipe, depositAllMaterials, equipItem, equipNoviceSet, effectiveStats, newGame, previewActivityReward, startCombat, stopActivity, travelToRegion, regionalReadiness, fallenKnightWinChance, withdrawFromBank} from '../src/core/game';
import {WORLD_ZONES} from '../src/content/world-map';
import {noviceSetFor,noviceRecipeId,noviceItemId} from '../src/content/novice-sets';
import {itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {totalXpAtLevel} from '../src/core/progression';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}

function addFood(state:any,itemId='IRONWOOD_STEW',qty=99999){
  state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks.filter((s:any)=>s.itemId!==itemId),{itemId,quantity:qty}]},character:{...state.character,equippedFoodId:itemId}};
  return state;
}
function simulateTo25(classId:any){
  let now=1_000_000;let state=addFood(createCharacter(newGame(now),classId,'BalanceBot'));let elapsed=0;const step=30*60;let regionalPrepared=false;
  // The productive-combat budget excludes the separately budgeted skilling preparation.
  // Model the current full novice set and equip earned upgrades instead of fighting naked to 25.
  state.bank.stacks=[{itemId:'COPPER_ORE',quantity:500},{itemId:'GREENWOOD_LOG',quantity:500},{itemId:'MOSS_FIBER',quantity:500}];
  while(state.character.level<25 && elapsed<360*3600){
    if(state.inventory.stacks.some((stack:any)=>itemDef(stack.itemId).type==='material'))state=depositAllMaterials(state);
    for(const slot of noviceSetFor(classId).slots){if(!state.character.craftedNoviceItemIds?.includes(noviceItemId(classId,slot))){try{state=craftRecipe(state,noviceRecipeId(classId,slot));}catch{ /* Wait for the next level/gold milestone. */ }}}
    if(noviceSetFor(classId).slots.every(slot=>state.character.craftedNoviceItemIds?.includes(noviceItemId(classId,slot)))){const withSet=equipNoviceSet(state);if(effectiveStats(withSet).power>effectiveStats(state).power)state=withSet;}
    // Loot sent to the Bank when bags fill remains available for actual equipment upgrades.
    for(const stack of [...state.inventory.stacks,...state.bank.stacks]){if(itemDef(stack.itemId).type==='gear'){try{const carried=state.inventory.stacks.some((s:any)=>s.itemId===stack.itemId)?state:withdrawFromBank(state,stack.itemId,1);const equipped=equipItem(carried,stack.itemId);if(effectiveStats(equipped).power>effectiveStats(state).power)state=equipped;}catch{ /* Ownership and class restrictions remain enforced. */ }}}
    if(!regionalPrepared&&state.character.level>=15){
      // The budget separately includes 57.6h smithing and 43.2h gear preparation.
      // Compare the prepared regional outfit as a whole: greedy single-item swaps
      // can reject every upgrade because the first swap removes the novice set bonus.
      const weapon=['WAYFINDER'].includes(classId)?'IRONWOOD_LONGBOW':['DAWNKEEPER','HEXWEAVER','STONECALLER'].includes(classId)?'IRONWOOD_STAFF':classId==='RAVAGER'?'IRONWOOD_GREATAXE':classId==='KNIFE_DANCER'?'IRONWOOD_DAGGERS':'ASTER_IRON_BLADE';
      const equipment=[weapon,'ASTER_IRON_HELM','ASTER_IRON_CHEST','ASTER_IRON_LEGS','ASTER_IRON_BOOTS','ASTER_IRON_GLOVES'];
      const recipes=equipment.map(id=>RECIPES.find(recipe=>recipe.output.itemId===id)!);
      if(state.character.gold>=recipes.reduce((sum,recipe)=>sum+recipe.gold,0)){
        let prepared=structuredClone(state);prepared.skills=prepared.skills.map((skill:any)=>skill.skillId==='smithing'?{...skill,level:15,xp:Math.max(skill.xp,totalXpAtLevel(15))}:skill);
        for(const recipe of recipes){
          // Materials represent the separate skilling budget; combat XP, Gold,
          // character levels and recipe costs still come from the actual engine.
          for(const input of recipe.inputs){const existing=prepared.bank.stacks.find((s:any)=>s.itemId===input.itemId);if(existing)existing.quantity+=input.quantity;else prepared.bank.stacks.push({...input});}
          prepared=craftRecipe(prepared,recipe.id,now);
          if(!prepared.inventory.stacks.some((s:any)=>s.itemId===recipe.output.itemId))prepared=withdrawFromBank(prepared,recipe.output.itemId,1);
          prepared=equipItem(prepared,recipe.output.itemId);
        }
        if(effectiveStats(prepared).power>effectiveStats(state).power){state=prepared;regionalPrepared=true;}
      }
    }
    const available=MONSTERS.filter(m=>!m.boss && m.unlockLevel<=state.character.level);
    // Productive combat chooses sustainable XP yield; the highest-level enemy may be inefficient.
    const target=available.map(monster=>{const located=travelToRegion(stopActivity(state),WORLD_ZONES.find(zone=>zone.name===monster.zone)!.id,now).state;return {monster,xp:previewActivityReward(startCombat(located,monster.id,now),now+step*1000).xp};}).sort((a,b)=>b.xp-a.xp)[0].monster;
    if(!state.activity || state.activity.targetId!==target.id){state=stopActivity(state);state=travelToRegion(state,WORLD_ZONES.find(zone=>zone.name===target.zone)!.id,now).state;state=startCombat(state,target.id,now);}
    now+=step*1000;elapsed+=step;state=claimActivity(state,now).state;
  }
  return {hours:elapsed/3600,level:state.character.level,power:effectiveStats(state).power,regionalPrepared};
}

ok(CLASSES.length===9,'V1 must expose 9 classes');
ok(MONSTERS.filter(m=>!m.boss).length===22,'Asterfall must contain 22 non-boss canonical monsters');
ok(QUESTS.length===15,'Asterfall must contain 15 canonical main quests');

const firstMinute=CLASSES.map(c=>{const t0=2_000_000;let s=addFood(createCharacter(newGame(t0),c.id,'Tester'));s=startCombat(s,'MOSS_RAT',t0);const r=previewActivityReward(s,t0+60_000);return {classId:c.id,kills:r.kills,power:effectiveStats(s).power};});
const kills=firstMinute.map(x=>x.kills);const spread=(Math.max(...kills)-Math.min(...kills))/Math.max(1,Math.max(...kills))*100;
ok(spread<=V1_BALANCE_TARGETS.targetClassKillSpeedSpreadPct+10,`Starter class kill spread too high: ${spread.toFixed(1)}%`);

const sims=CLASSES.map(c=>({classId:c.id,...simulateTo25(c.id)}));
for(const s of sims)ok(s.level>=25,`${s.classId} failed to reach level 25`);
const minHours=Math.min(...sims.map(s=>s.hours)),maxHours=Math.max(...sims.map(s=>s.hours));
ok(minHours>=V1_BALANCE_TARGETS.targetLevel25ProductiveCombatHours.min,`Combat leveling still too fast: ${minHours.toFixed(1)}h`);
ok(maxHours<=V1_BALANCE_TARGETS.targetLevel25ProductiveCombatHours.max+30,`Combat leveling too slow: ${maxHours.toFixed(1)}h`);

const profiles=[
 {name:'New / Inefficient',offline:7.5,active:.35,eff:.68},
 {name:'Casual',offline:10,active:.55,eff:.78},
 {name:'Normal',offline:12,active:.8,eff:.88},
 {name:'Active',offline:16,active:1.4,eff:.94},
 {name:'Optimizer',offline:20,active:1.8,eff:.985},
];
function profileDays(p:any){return ASTERFALL_PRODUCTIVE_HOUR_BUDGET.total/((p.offline+p.active)*p.eff);}
const playerProfiles=profiles.map(p=>({...p,medianModelDays:Number(profileDays(p).toFixed(2))}));

let bossState=addFood(createCharacter(newGame(5_000_000),'IRONWARDEN','BossBot'), 'IRONWOOD_STEW', 20);
bossState.character.level=25;
bossState.quests=bossState.quests.map((q:any)=>q.questId==='QST_014'?{...q,status:'active'}:q);
bossState.skills=bossState.skills.map((s:any)=>({...s,level:s.skillId==='smithing'?18:s.skillId==='mining'?15:s.skillId==='fishing'?14:s.skillId==='cooking'?16:s.level}));
bossState.character.equipment={weapon:'ASTER_IRON_BLADE',offhand:'IRONWOOD_GUARD',helmet:'ASTER_IRON_HELM',chest:'ASTER_IRON_CHEST',legs:'ASTER_IRON_LEGS',cape:'OATHGLASS_CAPE'};
const rr=regionalReadiness(bossState);
ok(rr.total>=80,'Prepared boss build should reach recommended readiness');
ok(fallenKnightWinChance(bossState)>=.55,'Prepared boss build should have intended first-clear chance');

console.log(JSON.stringify({
 status:'PASS',classCount:CLASSES.length,asterfallMonsterCount:22,questCount:QUESTS.length,
 starterKillSpreadPct:Number(spread.toFixed(1)),firstMinute,level25Simulation:sims,
 level25ProductiveCombatTarget:V1_BALANCE_TARGETS.targetLevel25ProductiveCombatHours,
 playerProfiles,preparedBossReadiness:rr,preparedBossWinChance:fallenKnightWinChance(bossState)
},null,2));
