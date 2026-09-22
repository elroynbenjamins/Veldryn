import {strict as assert} from 'node:assert';
import {buildPveSimulationTelemetry} from '../pve-simulation-telemetry';
import type {CombatResult,CombatantDefinition,CombatantState,CombatEvent} from '../types';

const stats=(maxHp:number)=>({maxHp,attackPower:100,healingPower:100,defense:100,accuracy:1000,evasion:0,critChance:0,critMultiplier:1.5,haste:0});
const player=(id:string,classId:string,role:'tank'|'damage'|'support',maxHp:number):CombatantDefinition=>({
 id,classId,name:classId,team:'players',role,level:35,stats:stats(maxHp),basicAttackMs:2500,basicAttackCoeff:.7,abilities:[],
});
const boss:CombatantDefinition={
 id:'BOSS',name:'Telemetry Boss',team:'enemies',role:'enemy',level:35,boss:true,stats:stats(5000),basicAttackMs:3000,basicAttackCoeff:.8,
 abilities:[
  {id:'FOCUS_CAST',name:'Focused Doom',cooldownMs:9000,castTimeMs:500,target:'random_enemy',priority:100,interruptible:false,effects:[{kind:'damage',flat:100}]},
  {id:'WAVE_CAST',name:'Danger Wave',cooldownMs:12000,castTimeMs:1800,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',flat:100}]},
 ],
 phases:[{id:'PHASE_50',name:'Halfway',hpPct:.5,target:'all_enemies',effects:[{kind:'damage',flat:80}]}],
};
const supportEnemy:CombatantDefinition={
 id:'ENEMY_SUPPORT',name:'Telemetry Cantor',team:'enemies',role:'enemy',level:35,stats:stats(1800),basicAttackMs:3200,basicAttackCoeff:.45,
 tags:['pve:archetype:support','pve:mechanic:sustain'],
 abilities:[
  {id:'ENEMY_MEND',name:'Enemy Mend',cooldownMs:9000,castTimeMs:700,target:'lowest_hp_ally',priority:95,effects:[{kind:'heal',flat:300}]},
  {id:'ENEMY_WARD',name:'Enemy Ward',cooldownMs:11000,castTimeMs:0,target:'lowest_hp_ally',priority:80,effects:[{kind:'shield',flat:200},{kind:'buff',tag:'damage_done',value:.05,durationMs:3000}]},
 ],
};
boss.tags=['pve:archetype:caster','pve:mechanic:focus','pve:mechanic:interrupt','pve:mechanic:aoe'];

const defs=[
 player('P_TANK','IRONWARDEN','tank',1000),
 player('P_DPS_A','WAYFINDER','damage',800),
 player('P_DPS_B','RAVAGER','damage',900),
 player('P_SUPPORT','DAWNKEEPER','support',700),
];
function state(definition:CombatantDefinition,hp:number,extra:Partial<CombatantState>={}):CombatantState{
 return {definition,hp,shield:0,alive:hp>0,downed:definition.team==='players'&&hp<=0,threat:{},cooldownReadyAt:{},nextBasicAt:0,periodic:[],modifiers:[],damageDone:0,healingDone:0,damageTaken:0,interrupts:0,triggeredPhases:[],...extra};
}
const players:CombatantState[]=[
 state(defs[0],900,{damageDone:500,damageTaken:900,interrupts:0}),
 state(defs[1],700,{damageDone:1800,damageTaken:100,interrupts:1}),
 state(defs[2],0,{alive:false,downed:true,damageDone:2200,damageTaken:900,interrupts:0}),
 state(defs[3],500,{damageDone:300,healingDone:1600,damageTaken:480,interrupts:0}),
];
const enemy=state(boss,0,{alive:false,damageTaken:4800});
const enemySupport=state(supportEnemy,0,{alive:false,healingDone:300});
const events:CombatEvent[]=[
 {atMs:0,type:'combat_start'},
 {atMs:100,type:'cast_start',actorId:'BOSS',targetId:'P_SUPPORT',abilityId:'FOCUS_CAST'},
 {atMs:600,type:'cast_complete',actorId:'BOSS',targetId:'P_SUPPORT',abilityId:'FOCUS_CAST'},
 {atMs:600,type:'damage',actorId:'BOSS',targetId:'P_SUPPORT',abilityId:'FOCUS_CAST',amount:100,absorbed:25},
 {atMs:650,type:'status_apply',actorId:'BOSS',targetId:'P_SUPPORT',abilityId:'FOCUS_CAST',statusKind:'debuff',statusTag:'damage_taken',expiresAtMs:3650},
 {atMs:700,type:'cast_start',actorId:'ENEMY_SUPPORT',targetId:'BOSS',abilityId:'ENEMY_MEND'},
 {atMs:900,type:'damage',actorId:'P_DPS_A',targetId:'BOSS',abilityId:'WF_SHOT',amount:250},
 {atMs:950,type:'heal',actorId:'P_SUPPORT',targetId:'P_TANK',abilityId:'DK_HEAL',amount:180},
 {atMs:975,type:'shield',actorId:'P_TANK',targetId:'P_TANK',abilityId:'IW_WARD',amount:120},
 {atMs:1000,type:'cast_complete',actorId:'ENEMY_SUPPORT',targetId:'BOSS',abilityId:'ENEMY_MEND'},
 {atMs:1000,type:'heal',actorId:'ENEMY_SUPPORT',targetId:'BOSS',abilityId:'ENEMY_MEND',amount:300},
 {atMs:1000,type:'cast_start',actorId:'BOSS',targetId:'P_TANK',abilityId:'WAVE_CAST'},
 {atMs:1200,type:'interrupt',actorId:'P_DPS_A',targetId:'BOSS',abilityId:'HX_NULL',interruptedAbilityId:'WAVE_CAST'},
 {atMs:1500,type:'phase',actorId:'BOSS',abilityId:'PHASE_50'},
 {atMs:1500,type:'damage',actorId:'BOSS',targetId:'P_TANK',abilityId:'PHASE_50',amount:80},
 {atMs:1600,type:'shield',actorId:'ENEMY_SUPPORT',targetId:'BOSS',abilityId:'ENEMY_WARD',amount:200},
 {atMs:1600,type:'status_apply',actorId:'ENEMY_SUPPORT',targetId:'BOSS',abilityId:'ENEMY_WARD',statusKind:'buff',statusTag:'damage_done',expiresAtMs:4600},
 {atMs:2000,type:'damage',actorId:'BOSS',targetId:'P_DPS_B',abilityId:'EXECUTE',amount:400},
 {atMs:2000,type:'down',actorId:'BOSS',targetId:'P_DPS_B',abilityId:'EXECUTE'},
 {atMs:5000,type:'combat_end',detail:'victory'},
];
const result:CombatResult={victory:true,durationMs:5000,reason:'victory',events,players,enemies:[enemy,enemySupport]};
const telemetry=buildPveSimulationTelemetry(result,'TEST_ENCOUNTER');

assert.equal(telemetry.schemaVersion,2);
assert.equal(telemetry.encounterId,'TEST_ENCOUNTER');
assert.equal(telemetry.victory,true);
assert.equal(telemetry.durationMs,5000);
assert.equal(telemetry.partyDowns,1);
assert.equal(telemetry.partySurvivors,3);
assert.equal(telemetry.partyEndHpPctAvg,.6223);
assert.equal(telemetry.firstPartyDownAtMs,2000);
assert.equal(telemetry.enemyEndHpPctAvg,0);
assert.deepEqual(telemetry.encounterArchetypes,['caster','support']);
assert.deepEqual(telemetry.encounterMechanics,['aoe','focus','interrupt','sustain']);
assert.equal(telemetry.bossId,'BOSS');
assert.equal(telemetry.bossEndHpPct,0);
assert.deepEqual(telemetry.bossCasts,[
 {abilityId:'FOCUS_CAST',started:1,completed:1,interrupted:0},
 {abilityId:'WAVE_CAST',started:1,completed:0,interrupted:1},
]);
assert.deepEqual(telemetry.enemyCasts,[
 {actorId:'BOSS',abilityId:'FOCUS_CAST',interruptible:false,started:1,completed:1,interrupted:0},
 {actorId:'BOSS',abilityId:'WAVE_CAST',interruptible:true,started:1,completed:0,interrupted:1},
 {actorId:'ENEMY_SUPPORT',abilityId:'ENEMY_MEND',interruptible:false,started:1,completed:1,interrupted:0},
]);
assert.deepEqual(telemetry.bossPhases,[{phaseId:'PHASE_50',atMs:1500}]);
assert.deepEqual(telemetry.incomingDamageByAbility,{EXECUTE:400,FOCUS_CAST:100,PHASE_50:80});
assert.deepEqual(telemetry.partyDamageByAbility,{WF_SHOT:250});
assert.deepEqual(telemetry.partyHealingByAbility,{DK_HEAL:180});
assert.deepEqual(telemetry.partyShieldingByAbility,{IW_WARD:120});
assert.deepEqual(telemetry.enemyHealingByAbility,{ENEMY_MEND:300});
assert.deepEqual(telemetry.enemyShieldingByAbility,{ENEMY_WARD:200});
assert.equal(telemetry.barrierAbsorbedByParty,25);
assert.deepEqual(telemetry.statusApplicationsToParty,{'debuff:damage_taken':1});
assert.deepEqual(telemetry.enemyStatusApplicationsToEnemies,{'buff:damage_done':1});
assert.deepEqual(telemetry.bossFocusTargets,{P_SUPPORT:1});
assert.deepEqual(telemetry.enemyFocusTargets,{P_SUPPORT:1});
assert.deepEqual(telemetry.downsByAbility,{EXECUTE:1});
assert.equal(telemetry.players.find(row=>row.id==='P_DPS_A')?.interrupts,1);
assert.equal(telemetry.players.find(row=>row.id==='P_SUPPORT')?.healing,1600);
assert.equal(telemetry.players.find(row=>row.id==='P_DPS_B')?.downed,true);

const encoded=JSON.stringify(telemetry);
for(const privateField of ['attackPower','defense','accuracy','evasion','events','cooldownReadyAt'])assert.equal(encoded.includes(privateField),false,`telemetry leaked ${privateField}`);
console.log('PASS deterministic PvE simulation telemetry contract');
