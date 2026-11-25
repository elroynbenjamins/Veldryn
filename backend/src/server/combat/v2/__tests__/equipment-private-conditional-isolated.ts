/** Minimal adapter boundary fixtures, not minted equipment or combat balance. */
import {strict as assert} from 'node:assert';
import {issueEq2PrivateHitQaV22} from '../equipment-private-hit-qa-v22';
import type {CombatantDefinition} from '../../types';
import {runPrivateConditionalBoundaries,runPrivateSupportBoundaries} from './equipment-private-conditional-boundaries';
const stats={maxHp:1000,attackPower:100,healingPower:100,defense:100,accuracy:1000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
const boss:CombatantDefinition={id:'QA_BOUNDARY_ENEMY',name:'QA boundary enemy',team:'enemies',role:'enemy',level:20,boss:true,stats,basicAttackMs:2000,basicAttackCoeff:1,abilities:[]};
const ravager:CombatantDefinition={...boss,id:'QA_EQ2_RAVAGER_BOUNDARY',name:'QA Ravager',boss:false,team:'players',role:'damage',classId:'RAVAGER',
 combatV2:{version:2,resource:'fury',specializationId:'qa-ravager'}};
const ironwarden:CombatantDefinition={...boss,id:'QA_EQ2_IRONWARDEN_BOUNDARY',name:'QA Ironwarden',boss:false,team:'players',role:'tank',classId:'IRONWARDEN',
 combatV2:{version:2,resource:'guard',specializationId:'qa-ironwarden'}};
runPrivateConditionalBoundaries(ravager,ironwarden,boss);

const healer:CombatantDefinition={...ironwarden,id:'QA_EQ2_DAWNKEEPER_BOUNDARY',classId:'DAWNKEEPER',role:'support',name:'QA Dawnkeeper',
 combatV2:{version:2,resource:'radiance',specializationId:'qa-dawnkeeper'}};
const stonecaller:CombatantDefinition={...ironwarden,id:'QA_EQ2_STONECALLER_BOUNDARY',classId:'STONECALLER',role:'support',name:'QA Stonecaller',
 stats:{...stats,maxHp:1400},combatV2:{version:2,resource:'resonance',specializationId:'qa-stonecaller'}};
runPrivateSupportBoundaries(healer,stonecaller,ironwarden,{...ravager,stats:{...ravager.stats,maxHp:1200}},boss);

// Exercise the real launch-player display-name identity without relaxing scope.
runPrivateSupportBoundaries({...healer,classId:'Dawnkeeper'},
 {...stonecaller,classId:'Stonecaller'},ironwarden,ravager,boss);
for(const classId of ['Stonecaller','dawnkeeper','IRONWARDEN',undefined]){
 const wrong={...healer,classId};
 assert.throws(()=>issueEq2PrivateHitQaV22({seed:'QA_V28_WRONG_CLASS',players:[wrong],enemies:[boss]},
  wrong.id,['eq2_t4_brightweave:4'],()=>true),/fixture_scope/);
}
