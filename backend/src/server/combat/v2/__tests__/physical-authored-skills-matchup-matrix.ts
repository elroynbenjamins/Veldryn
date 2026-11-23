/**
 * HIDDEN Combat 2.0: real server-compiled Skills / specialization interaction
 * with source-pinned physical subtype weapon proposals and authored boss
 * resistance snapshots. No final CP, no live companion bridge, no real DB.
 *
 * This is PAIRWISE within the same compiled class/spec/skill/gear fixture.
 * It cannot establish cross-class equal CP or live encounter win rates.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatInput,CombatantDefinition,CombatStats} from '../../types';
import {
 CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2,SKILLS_V2,
} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from '../skill-effects';
import {
 issueEnemyV2EngineAuthority,ENEMY_V2_ENGINE_RULESET,
} from '../enemy-engine-authority';
import {
 issueAuthoredEnemyPhysicalResistancesV2,REVIEW_BOSS_PHYSICAL_RESISTANCE_V2,
} from '../enemy-physical-resistance-authority';
import {issueFrozenForgePhysicalAuthorityV2} from '../physical-damage-engine-authority';
import {v2ServerPiece} from '../../../equipment/equipment-crafting-v2-manifest';
import {v2PinnedPhysicalSubtypeReview} from '../../../equipment/equipment-crafting-v2-physical-types-review';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const bossIds=Object.keys(REVIEW_BOSS_PHYSICAL_RESISTANCE_V2) as (keyof typeof REVIEW_BOSS_PHYSICAL_RESISTANCE_V2)[];
const stats:CombatStats={maxHp:50000,attackPower:1500,healingPower:1100,
 defense:350,accuracy:5000,evasion:0,critChance:.05,critMultiplier:1.6,haste:0};
const enemyStats:CombatStats={maxHp:1e9,attackPower:0,healingPower:0,defense:600,
 accuracy:0,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
const mark=(id:string)=>id==='BOSS_EXP_ROOT'||id==='BOSS_EXP_BELL'
 ?'enemy-v2:boss-profile:asterfall-1':'enemy-v2:boss-profile:regional-1';
const digest='a'.repeat(64);
let scenarios=0,compiledSkills=0,casts=0,physicalHitEvents=0;
let matches=0,unchanged=0,improved=0,reduced=0;
let bluntEvents=0,slashEvents=0,pierceEvents=0;
const expectedSkills=new Set<string>();
const report:Record<string,{scenarios:number;physical:number;skillCasts:number}>={};
for(const classId of classes){
 const all=SKILL_IDENTITIES_V2.filter(x=>x.classId===classId);
 const specs=SPECIALIZATIONS_V2.filter(x=>x.classId===classId);
 assert.equal(all.length,6,'all six real class Skills 2.0 identities required');
 assert.equal(specs.length,2,'both source-authoritative specialization identities required');
 for(const spec of specs){
  const key=classId+'|'+spec.id;
  report[key]={scenarios:0,physical:0,skillCasts:0};
  for(let loadoutIndex=0;loadoutIndex<2;loadoutIndex++){
   const selected=all.slice(loadoutIndex*3,loadoutIndex*3+3);
   const original=launchPlayer(CLASS_NAMES_V2[classId],50);
   const base:CombatantDefinition={
    ...original,id:'QA_AUTHORED_SKILLS_'+classId,
    stats:{...stats},abilities:original.abilities.map(a=>({
     ...a,effects:a.effects.map(e=>({...e})),
    })),
   };
   const build:VerifiedSkillBuildV2={
    actor:base,
    verified:{classId,level:50,ownedInstanceIds:new Set<string>()},
    selected:{specializationId:spec.id,equipment:{},
     activeSkills:selected.map((skill)=>({
      skillId:skill.id,
      variantId:skill.variants[loadoutIndex].id,
     })),talentRanks:{},signaturePassiveIds:[],capstoneId:spec.capstoneId},
    ownedItemsById:{},setsById:{},
   };
   const oldActor=JSON.stringify(base);
   const compiled=compileServerSkillBuildV2(true,build);
   assert.equal(JSON.stringify(base),oldActor,'skill compiler must not mutate source actor');
   assert.deepEqual(compiled.abilities.map(a=>a.name),selected.map(s=>s.name));
   assert.ok(compiled.abilities.every(a=>a.id.endsWith(':v2:'+loadoutIndex)));
   for(const a of compiled.abilities)expectedSkills.add(classId+'|'+a.name);
   assert.equal(compiled.combatV2?.specializationId,spec.id);
   assert.equal(compiled.combatV2?.capstoneId,spec.capstoneId);
   const player:CombatantDefinition={...compiled,
    tags:[...(compiled.tags??[]),'combat-v2-gear-base-resolved'],
   };
   // The QA token uses a fake digest to exercise an otherwise source-bound
   // validator. Real deployments MUST use the full verified frozen Forge
   // claim/custody compiler and cannot use this synthetic shortcut.
   const pieceId='EQ2_WEAPON_T4_'+classId;
   assert.ok(v2ServerPiece(pieceId)?.classRestriction===classId);
   assert.ok(v2PinnedPhysicalSubtypeReview(pieceId)?.profile);
   const equipment=[{actorId:player.id,receiptDigest:digest,
    items:[{instanceId:'QA_SYNTHETIC_'+classId,pieceId}]}];
   compiledSkills+=selected.length;
   for(const bossId of bossIds){
    const enemy:CombatantDefinition={
     id:bossId,name:'QA '+bossId,team:'enemies',role:'enemy',level:50,
     boss:true,stats:{...enemyStats},basicAttackMs:9999999,
     basicAttackCoeff:0,abilities:[],
     tags:['enemy-v2:kit:v1',mark(bossId)],
    };
    const input:CombatInput={
     seed:'QA_COMPILED_SKILLS_'+classId+'_'+spec.id+'_'+loadoutIndex+'_'+bossId,
     players:[player],enemies:[enemy],maxDurationMs:9000,tickMs:100,
    };
    const ea=issueEnemyV2EngineAuthority({
     source:'server-persisted-v2',version:2,ruleset:ENEMY_V2_ENGINE_RULESET,
     mode:'solo',encounterId:'QA_SKILL_'+bossId,revision:1,
     seed:input.seed,playerIds:[player.id],enemyIds:[enemy.id],
     bossIds:[enemy.id],
    },input,()=>true /* QA fixture only: not persisted, not a service endpoint */);
    const er=issueAuthoredEnemyPhysicalResistancesV2(input,ea);
    const neutral=issueFrozenForgePhysicalAuthorityV2(input,equipment);
    const counter=issueFrozenForgePhysicalAuthorityV2(input,equipment,er);
    const noTyped=simulateCombat(input,ea,undefined,undefined,neutral);
    const typed=simulateCombat(input,ea,undefined,undefined,counter);
    assert.deepEqual(typed.events,
      simulateCombat(input,ea,undefined,undefined,counter).events,
      'actual server skill variants + typed encounter must replay deterministically');
    const a=noTyped.players[0].damageDone,b=typed.players[0].damageDone;
    assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>=0);
    if(a>0){
     // A skill's nonphysical damage, shields and healing all remain outside
     // Blunt/Slash/Pierce scaling. No win-rate or class-CP target here.
     assert.ok(b/a>=.87&&b/a<=1.13,
      'boss subtype candidate must not create a runaway skill total');
    }
    assert.deepEqual(noTyped.events.filter(e=>e.type==='miss'),
      typed.events.filter(e=>e.type==='miss'),
      'subtype effect must not consume another hit-RNG or reroll accuracy');
    const rawSkillEvents=typed.events.filter(e=>
      e.actorId===player.id&&e.abilityId?.includes(':v2:'));
    const hits=typed.events.filter(e=>e.type==='damage'&&
      e.actorId===player.id&&e.physicalSubtypes?.length);
    assert.ok(typed.events.every(e=>!e.physicalSubtypes||
     e.type==='damage'&&e.actorId===player.id),
     'no physical subtype event on companion, DoT, shield, magic or enemy effects');
    if(v2PinnedPhysicalSubtypeReview(pieceId)?.profile?.mode==='spell_source'||
       v2PinnedPhysicalSubtypeReview(pieceId)?.profile?.mode==='physical_staff_strike_only'){
     assert.equal(hits.length,0,
      'magic wands and caster staves must not silently acquire weapon subtypes');
    }
    if(Math.abs(a-b)<.00001)unchanged++;
    else if(b>a)improved++;
    else reduced++;
    casts+=rawSkillEvents.length;
    physicalHitEvents+=hits.length;
    report[key].scenarios++;
    report[key].physical+=hits.length;
    report[key].skillCasts+=rawSkillEvents.length;
    for(const hit of hits){
     for(const w of hit.physicalSubtypes??[]){
      if(w.type==='blunt')bluntEvents++;
      if(w.type==='piercing')pierceEvents++;
      if(w.type==='slashing')slashEvents++;
     }
    }
    scenarios++;matches++;
   }
  }
 }
}
assert.equal(scenarios,9*2*2*6);
assert.equal(matches,216);
assert.equal(compiledSkills,9*2*2*3);
assert.equal(expectedSkills.size,54);
assert.ok(casts>0,'compiled skills must actually execute in Combat 2.0');
assert.ok(physicalHitEvents>0,'non-caster source weapons must actually apply types');
assert.ok(bluntEvents>0&&slashEvents>0&&pierceEvents>0,
 'all three types must appear in actual compiled Skills 2.0 battles');
assert.ok(reduced>0&&improved>0,'counterplay must be bidirectional');
assert.ok(Object.values(report).every(x=>x.scenarios===12),
 'every spec must have 12 authored-skill/boss scenarios');
console.log('PASS signed 2.0 compiled Skills physical encounter matrix',JSON.stringify({
 scenarios,classes:9,specializations:18,loadouts:2,bosses:6,
 sourceSkillIds:expectedSkills.size,compiledSkills,casts,physicalHitEvents,
 slashEvents,pierceEvents,bluntEvents,improved,reduced,unchanged,
 scope:'paired same compiled actor; synthetic stats/receipts; not equal approved CP or real companion integration',
}));
