import {CLASSES} from '../src/content/classes';
import {MONSTERS} from '../src/content/monsters';
import {QUESTS} from '../src/content/quests';
import {V1_BALANCE_TARGETS,ASTERFALL_PRODUCTIVE_HOUR_BUDGET} from '../src/content/asterfall';
import {claimActivity, createCharacter, effectiveStats, newGame, previewActivityReward, startCombat, stopActivity, regionalReadiness, fallenKnightWinChance} from '../src/core/game';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}

function addFood(state:any,itemId='IRONWOOD_STEW',qty=99999){
  state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks.filter((s:any)=>s.itemId!==itemId),{itemId,quantity:qty}]},character:{...state.character,equippedFoodId:itemId}};
  return state;
}
function simulateTo25(classId:any){
  let now=1_000_000;let state=addFood(createCharacter(newGame(now),classId,'BalanceBot'));let elapsed=0;const step=30*60;
  while(state.character.level<25 && elapsed<120*3600){
    const available=MONSTERS.filter(m=>!m.boss && m.unlockLevel<=state.character.level);
    const target=available.sort((a,b)=>b.level-a.level)[0];
    if(!state.activity || state.activity.targetId!==target.id){state=stopActivity(state);state=startCombat(state,target.id,now);}
    now+=step*1000;elapsed+=step;state=claimActivity(state,now).state;
  }
  return {hours:elapsed/3600,level:state.character.level,power:effectiveStats(state).power};
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
ok(maxHours<=V1_BALANCE_TARGETS.targetLevel25ProductiveCombatHours.max+15,`Combat leveling too slow: ${maxHours.toFixed(1)}h`);

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
