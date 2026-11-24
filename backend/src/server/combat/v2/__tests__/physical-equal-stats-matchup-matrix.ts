/**
 * HIDDEN physical matchup smoke matrix, not a production DPS/CP verdict.
 * Every class/spec is given identical synthetic attack/defense/HP and the
 * same RNG seed, against each source-pinned boss. Real class skills and final
 * CP coefficients are deliberately NOT claimed to be balanced by this test.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatantDefinition,CombatInput,CombatStats} from '../../types';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {v2PinnedPhysicalSubtypeReview} from '../../../equipment/equipment-crafting-v2-physical-types-review';
import {
 issueEnemyV2EngineAuthority,ENEMY_V2_ENGINE_RULESET,
} from '../enemy-engine-authority';
import {
 issueAuthoredEnemyPhysicalResistancesV2,
 REVIEW_BOSS_PHYSICAL_RESISTANCE_V2,
} from '../enemy-physical-resistance-authority';
import {
 issueFrozenForgePhysicalAuthorityV2,
 calculatePhysicalSubtypeV2,
} from '../physical-damage-engine-authority';
const classes=Object.keys(CLASS_NAMES_V2) as (keyof typeof CLASS_NAMES_V2)[];
const bossIds=Object.keys(REVIEW_BOSS_PHYSICAL_RESISTANCE_V2) as (keyof typeof REVIEW_BOSS_PHYSICAL_RESISTANCE_V2)[];
assert.equal(classes.length,9);
assert.equal(bossIds.length,6);
const stats:CombatStats={
 maxHp:20000,attackPower:800,healingPower:150,defense:300,
 accuracy:10000,evasion:0,critChance:0,critMultiplier:1.5,haste:0,
};
const enemyStats:CombatStats={
 maxHp:1000000,attackPower:0,healingPower:0,defense:300,
 accuracy:0,evasion:0,critChance:0,critMultiplier:1.5,haste:0,
};
const neutral={slashing:0,piercing:0,blunt:0};
const mark=(id:string)=>['BOSS_EXP_ROOT','BOSS_EXP_BELL'].includes(id)
 ?'enemy-v2:boss-profile:asterfall-1':'enemy-v2:boss-profile:regional-1';
const sorted=(xs:readonly string[])=>[...xs].sort().join(',');
let scenarios=0,typed=0,neutralRuns=0,positive=0,negative=0;
let lowest=Infinity,highest=-Infinity,maxVsGeneric=0;
const typeCounts:Record<string,number>={slashing:0,piercing:0,blunt:0};
for(const classId of classes){
 const specs=SPECIALIZATIONS_V2.filter(s=>s.classId===classId);
 assert.equal(specs.length,2,'exactly two source-authored specs per class');
 for(const spec of specs)for(const tier of [1,2,3,4] as const){
  const pieceId='EQ2_WEAPON_T'+tier+'_'+classId;
  const piece=V2_SERVER_PIECES.find(p=>p.id===pieceId);
  assert.ok(piece&&piece.slot==='weapon'&&piece.classRestriction===classId,
   'real pinned T1–T4 class weapon required');
  const profile=v2PinnedPhysicalSubtypeReview(pieceId);
  assert.ok(profile?.profile,'every pinned class armament has a source profile');
  for(const id of bossIds){
   const player:CombatantDefinition={
    id:'QA_'+classId+'_'+spec.id.slice(-20)+'_T'+tier,
    classId:CLASS_NAMES_V2[classId],name:'QA Equal-Stats',team:'players',role:'damage',
    level:40,stats:{...stats},basicAttackMs:1200,basicAttackCoeff:1,
    abilities:[],tags:['combat-v2','combat-v2-gear-base-resolved'],
    combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[classId],specializationId:spec.id},
   };
   const enemy:CombatantDefinition={
    id,name:id,team:'enemies',role:'enemy',boss:true,level:40,
    stats:{...enemyStats},basicAttackMs:9999999,basicAttackCoeff:0,
    abilities:[],tags:['enemy-v2:kit:v1',mark(id)],
   };
   const input:CombatInput={
    seed:'EQ2_EQUAL_STATS_PHYSICAL_REPLAY',
    players:[player],enemies:[enemy],maxDurationMs:2600,tickMs:100,
   };
   const token=issueEnemyV2EngineAuthority({
    source:'server-persisted-v2',version:2,
    ruleset:ENEMY_V2_ENGINE_RULESET,mode:'solo',
    encounterId:'QA_'+id,revision:1,seed:input.seed,
    playerIds:[player.id],enemyIds:[enemy.id],bossIds:[enemy.id],
   },input,()=>true /* QA fixture ONLY; never attach to runtime */);
   const resistance=issueAuthoredEnemyPhysicalResistancesV2(input,token);
   const evidence=[{actorId:player.id,receiptDigest:'a'.repeat(64),
    items:[{instanceId:'QA_'+pieceId,pieceId}]}];
   const plain=issueFrozenForgePhysicalAuthorityV2(input,evidence);
   const typedToken=issueFrozenForgePhysicalAuthorityV2(input,evidence,resistance);
   const basic=simulateCombat(input,token,undefined,undefined,plain);
   const counter=simulateCombat(input,token,undefined,undefined,typedToken);
   const repeat=simulateCombat(input,token,undefined,undefined,typedToken);
   assert.deepEqual(counter.events,repeat.events,'same seed and scope must replay exactly');
   assert.deepEqual(counter.events.filter(e=>e.type==='miss'),
    basic.events.filter(e=>e.type==='miss'),'resistance cannot alter hit RNG');
   const a=basic.players[0].damageDone,b=counter.players[0].damageDone;
   assert.ok(a>0&&b>0,'normalized attacks must hit');
   const ratio=b/a;
   // Source boss profiles are 6–10% candidates. No single physical build may
   // gain an arbitrarily large advantage even at the same input stat budget.
   assert.ok(ratio>=.89&&ratio<=1.11,'provisional counterplay magnitude bounded');
   const expected=profile.profile.weights.length?
    calculatePhysicalSubtypeV2(100,profile.profile.weights,REVIEW_BOSS_PHYSICAL_RESISTANCE_V2[id]).multiplier:1;
   if(profile.profile.mode==='physical_staff_strike_only'){
    assert.equal(b,a,'staff casts are not implicit Blunt melee');
    assert.ok(!counter.events.some(e=>e.physicalSubtypes?.length));
    neutralRuns++;
   }else if(profile.profile.mode==='spell_source'){
    assert.equal(b,a,'wand BASIC cannot borrow a physical subtype');
    assert.ok(!counter.events.some(e=>e.physicalSubtypes?.length));
    neutralRuns++;
   }else{
    assert.ok(Math.abs(ratio-expected)<.002,
     'source-pinned enemy resistance applied once to physical budget');
    assert.ok(counter.events.some(e=>e.physicalSubtypes?.length));
    typed++;
    for(const w of profile.profile.weights)typeCounts[w.type]++;
   }
   if(ratio>1.0001)positive++;
   if(ratio<.9999)negative++;
   lowest=Math.min(lowest,ratio);highest=Math.max(highest,ratio);
   maxVsGeneric=Math.max(maxVsGeneric,Math.abs(ratio-1));
   scenarios++;
  }
 }
}
assert.equal(scenarios,9*2*4*6);
assert.equal(typed,7*2*4*6);
assert.equal(neutralRuns,2*2*4*6);
assert.ok(positive>0&&negative>0,'counterplay must favor more than one strategy');
assert.ok(maxVsGeneric<=.11,'no single class should have an unavoidable boss hard counter');
assert.ok(sorted(Object.keys(typeCounts))==='blunt,piercing,slashing');
console.log('PASS normalized Equal-Stats Combat V2 subtype matrix:',JSON.stringify({
 scenarios,classes:classes.length,specializations:18,tiers:4,bosses:6,
 typed,neutralRuns,positive,negative,
 minRatio:Number(lowest.toFixed(4)),maxRatio:Number(highest.toFixed(4)),
 note:'Synthetic equal stats, NOT canonical equal CP; real Skills/Companions/sets still pending',
}));
