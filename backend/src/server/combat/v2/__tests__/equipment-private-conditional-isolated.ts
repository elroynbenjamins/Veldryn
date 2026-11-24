/** Minimal adapter boundary fixtures, not minted equipment or combat balance. */
import type {CombatantDefinition} from '../../types';
import {runPrivateConditionalBoundaries} from './equipment-private-conditional-boundaries';
const stats={maxHp:1000,attackPower:100,healingPower:100,defense:100,accuracy:1000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
const boss:CombatantDefinition={id:'QA_BOUNDARY_ENEMY',name:'QA boundary enemy',team:'enemies',role:'enemy',level:20,boss:true,stats,basicAttackMs:2000,basicAttackCoeff:1,abilities:[]};
const ravager:CombatantDefinition={...boss,id:'QA_EQ2_RAVAGER_BOUNDARY',name:'QA Ravager',boss:false,team:'players',role:'damage',classId:'RAVAGER',
 combatV2:{version:2,resource:'fury',specializationId:'qa-ravager'}};
const ironwarden:CombatantDefinition={...boss,id:'QA_EQ2_IRONWARDEN_BOUNDARY',name:'QA Ironwarden',boss:false,team:'players',role:'tank',classId:'IRONWARDEN',
 combatV2:{version:2,resource:'guard',specializationId:'qa-ironwarden'}};
runPrivateConditionalBoundaries(ravager,ironwarden,boss);
