/**
 * Read-only regional combat preparation test.
 *
 * Reuses the *exact* class/set/Forge/gem/enchant/companion test fixtures from
 * regional-gear-cp-benchmark-entry.ts, then calls the real mobile ordinary-hunt
 * sustain projector and Fallen Knight story boss simulator.
 *
 * This is a deterministic CURRENT-CONTENT baseline, not a proposed rebalanced
 * enemy simulation. It does not mutate production, release locks, or save files.
 */
import {CLASS_IDS,PATHS,SCENARIOS,STAGES,makeCharacter} from './regional-gear-cp-benchmark-entry';
import {combatSustainProjection,effectiveStats,previewFallenKnightBattle} from '../apps/mobile/src/core/game';
import {MONSTERS} from '../apps/mobile/src/content/monsters';
import {characterXpForNextLevel} from '../apps/mobile/src/core/progression';
import {V33_EQUIPMENT_RECIPES} from '../apps/mobile/src/content/equipment-recipes-v33';

const SELECTED=['mixed_7_of_10_common_q40','full_common_q50_plain',
  'representative_common_q50','invested_uncommon_q60','well_prepared_rare_q70'] as const;
const ENCOUNTERS=[
 {region:'Asterfall',tier:'T2',level:25,monster:'OATHGLASS_REVENANT',food:'ROASTED_CROWN_CARP'},
 {region:'Sunscar',tier:'T3',level:26,monster:'SUNSCAR_SCORPION',food:'GRILLED_OASIS_CARP'},
 {region:'Sunscar',tier:'T3',level:37,monster:'GLASS_DUNE_STRIDER',food:'GRILLED_OASIS_CARP'},
 {region:'Sunscar',tier:'T4',level:38,monster:'MIRAGE_SHADE',food:'GRILLED_OASIS_CARP'},
 {region:'Sunscar',tier:'T4',level:50,monster:'ROYAL_SANDGUARD',food:'GRILLED_OASIS_CARP'},
 {region:'Frostmarch',tier:'T5',level:51,monster:'FROSTWOLF',food:'FROSTED_ICEFIN'},
 {region:'Frostmarch',tier:'T5',level:62,monster:'RIME_STALKER',food:'FROSTED_ICEFIN'},
 {region:'Frostmarch',tier:'T6',level:63,monster:'CHOIR_HUNTER',food:'FROSTED_ICEFIN'},
 {region:'Frostmarch',tier:'T6',level:75,monster:'WYRMSPINE_GUARDIAN',food:'FROSTED_ICEFIN'},
] as const;
function assert(value:unknown,message:string):asserts value {
 if(!value)throw new Error('regional_combat_sim: '+message);
}
const rounded=(value:number,digits=2)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const percentile=(values:number[],frac:number)=>{
 const sorted=[...values].sort((a,b)=>a-b),v=(sorted.length-1)*frac;
 return sorted[Math.floor(v)]+(sorted[Math.ceil(v)]-sorted[Math.floor(v)])*(v-Math.floor(v));
};
const mean=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
const get=(id:string)=>SCENARIOS.find(row=>row.id===id)!;
const simHunts:Record<string,unknown>[]=[];
for(const e of ENCOUNTERS){
 const stage=STAGES.find(s=>s.tier===e.tier&&s.level===e.level);
 assert(stage,'missing stage '+e.tier+'/'+e.level);
 const monster=MONSTERS.find(m=>m.id===e.monster);
 assert(monster&&(monster.zone===e.region||(e.region==='Asterfall'&&monster.zone==="King's Road"))&&!monster.boss,'missing encounter '+e.monster);
 for(const scenarioId of SELECTED){
  const scenario=get(scenarioId),rows:ReturnType<typeof combatSustainProjection>[]=[];
  for(const cls of CLASS_IDS)for(const path of PATHS){
   let state=makeCharacter(cls,path,stage,scenario);
   state={...state,character:{...state.character!,currentHp:effectiveStats(state).hp,equippedFoodId:e.food}};
   const p=combatSustainProjection(state,e.monster);
   assert(p&&p.killCycleSeconds>0&&p.killsPerHour>0&&p.xpPerHour>=0,
    'invalid sustain result for '+e.monster+' / '+cls+' / '+path);
   rows.push(p);
  }
  const proj=rows.filter((x):x is NonNullable<typeof x>=>Boolean(x));
  const foodFinite=proj.map(x=>x.foodPerHour).filter(Number.isFinite);
  const hoursPerLevel=proj.map(x=>x.xpPerHour>0?characterXpForNextLevel(e.level)/x.xpPerHour:Infinity);
  simHunts.push({
   region:e.region,actualZone:monster.zone,tier:e.tier,characterLevel:e.level,monsterId:e.monster,
   authoredMonsterLevel:monster.level,actualMonsterUnlockLevel:monster.unlockLevel,
   scenario:scenarioId,loadouts:proj.length,
   cpNotUsedAsProxy:true,
   killsPerHourMean:rounded(mean(proj.map(x=>x.killsPerHour))),
   killsPerHourP10:rounded(percentile(proj.map(x=>x.killsPerHour),.10)),
   killsPerHourP90:rounded(percentile(proj.map(x=>x.killsPerHour),.90)),
   foodPerHourMean:foodFinite.length===proj.length?rounded(mean(foodFinite)):null,
   unsustainableFoodSnapshots:proj.length-foodFinite.length,
   netHpLossPerHourMean:rounded(mean(proj.map(x=>x.netHpLossPerHour))),
   damagePerKillMean:rounded(mean(proj.map(x=>x.damagePerKill))),
   xpPerHourMean:rounded(mean(proj.map(x=>x.xpPerHour))),
   hypotheticalHoursToNextCharacterLevelMean:hoursPerLevel.every(Number.isFinite)
     ?rounded(mean(hoursPerLevel)):null,
   foodId:e.food,
   release:e.tier==='T6'?'unreleased_what_if_gear_only':'currently_released_gear',
  });
 }
}
const bossResults:Record<string,unknown>[]=[];
const bossStage=STAGES.find(x=>x.tier==='T2'&&x.level===25)!;
const BOSS_SEEDS=12;
for(const scenarioId of SELECTED){
 for(const potionMode of ['none','five_healing_potions'] as const){
  const outcomes:{won:boolean;durationMs:number;potions:number;bossHpFraction:number}[]=[];
  let profiles=0;
  for(const cls of CLASS_IDS)for(const path of PATHS){
   const base=makeCharacter(cls,path,bossStage,get(scenarioId));
   const prepared={...base,character:{...base.character!,
      currentHp:effectiveStats(base).hp,
      equippedHealingPotionId:potionMode==='none'?undefined:'RIVERHEART_DRAUGHT',
     },
     inventory:{...base.inventory,stacks:potionMode==='none'?[]:[{itemId:'RIVERHEART_DRAUGHT',quantity:5}]},
   };
   profiles++;
   for(let seed=0;seed<BOSS_SEEDS;seed++){
    const battle=previewFallenKnightBattle(prepared,Date.UTC(2026,10,12,12,0,0)+seed*93_001,'story');
    assert(battle.foodConsumed===0,'food used in boss');
    assert(battle.potionConsumed<=5,'potion cap broken');
    outcomes.push({
     won:battle.won,durationMs:battle.durationMs,potions:battle.potionConsumed,
     bossHpFraction:battle.finalBossHp/Math.max(1,battle.bossMaxHp),
    });
   }
  }
  bossResults.push({
   bossId:'FALLEN_KNIGHT',authoringLevel:25,testedCharacterLevel:25,
   scenario:scenarioId,potionMode,distinctClassPathLoadouts:profiles,
   deterministicSeedsPerLoadout:BOSS_SEEDS,attempts:outcomes.length,
   wins:outcomes.filter(x=>x.won).length,winRate:rounded(outcomes.filter(x=>x.won).length/outcomes.length,4),
   durationSecondsMean:rounded(mean(outcomes.map(x=>x.durationMs))/1000),
   consumedPotionsMean:rounded(mean(outcomes.map(x=>x.potions))),
   remainingBossHpFractionMean:rounded(mean(outcomes.map(x=>x.bossHpFraction)),4),
   status:'current_live_boss_rules_but_synthetic_fixtures',
  });
 }
}
const recipeAudit:Record<string,unknown>[]=[];
const chapterMidpoints:Record<string,number>={T1:1,T2:13,T3:26,T4:38,T5:51,T6:63};
for(const tier of ['T1','T2','T3','T4','T5','T6']){
 for(const cls of CLASS_IDS)for(const path of PATHS){
  const recipes=V33_EQUIPMENT_RECIPES.filter(r=>r.v33EquipmentTier===tier&&r.classId===cls&&r.v33Path===path);
  assert(recipes.length===10,'expected ten recipe slots '+tier+'/'+cls+'/'+path);
  const materials=new Map<string,number>();
  for(const r of recipes)for(const input of r.inputs)materials.set(input.itemId,(materials.get(input.itemId)??0)+input.quantity);
  recipeAudit.push({
   tier,classId:cls,path,recipes:recipes.length,
   currentRegion:recipes[0].v33Region,
   proposedTierUnlock:chapterMidpoints[tier],
   actualCharacterLevelRequiredMin:Math.min(...recipes.map(r=>r.characterLevel)),
   actualCharacterLevelRequiredMax:Math.max(...recipes.map(r=>r.characterLevel)),
   craftProfession:recipes[0].skillId,
   craftSkillLevelMin:Math.min(...recipes.map(r=>r.level)),
   craftSkillLevelMax:Math.max(...recipes.map(r=>r.level)),
   fullSetCraftGold:recipes.reduce((sum,r)=>sum+r.gold,0),
   fullSetBaseCraftXp:recipes.reduce((sum,r)=>sum+r.xp,0),
   fullSetCraftSeconds:recipes.reduce((sum,r)=>sum+r.seconds,0),
   requiredMaterials:Object.fromEntries(materials.entries()),
   released:tier==='T6'?'no':'yes',
  });
 }
}
console.log(JSON.stringify({
 metadata:{
  purpose:'Read-only current live combat projection / recipe source audit',
  exactMobileEngine:true,
  encounterStates:'synthetic never drawn from player DB',
  proposedRegionRemapApplied:false,
  proposedEnemyRetuneApplied:false,
  sourceDate:'2026-11-12',
  huntLoadouts:CLASS_IDS.length*PATHS.length*SELECTED.length*ENCOUNTERS.length,
  bossAttempts:bossResults.reduce((sum,r)=>sum+Number(r.attempts),0),
 },
 hunts:simHunts,boss:bossResults,recipes:recipeAudit,
}));
