import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {prepareAsterfallBossV2} from '../../boss-v2-asterfall-prototype';
import {prepareRegionalBossV2} from '../../boss-v2-regional-prototype';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import type {AbilityDefinition,CombatInput,CombatantDefinition,CombatResult} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {PARTY_SYNCHRONIZATION_RULESET_V2,planPartySynchronizationV2} from '../party-synchronization';
import {issuePartySyncAuthorityV2,type PartySyncScopeV2} from '../party-sync-authority';
const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Asterfall Root',level:25},
 {id:'BOSS_EXP_BELL',name:'Asterfall Bell',level:25},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',level:40},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',level:40},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',level:60},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',level:60},
] as const;
const classes=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const dps=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
function action(c:ClassIdV2):AbilityDefinition{
 const role=CLASS_ROLES_V2[c];
 const effects:AbilityDefinition['effects']=[{kind:'damage',coeff:.72,
  damageType:c==='HEXWEAVER'?'shadow':c==='STONECALLER'?'nature':'physical'}];
 if(c==='HEXWEAVER')effects.push({kind:'dot',coeff:.09,damageType:'shadow',durationMs:4000,tickMs:1000});
 if(role==='tank')effects.push({kind:'shield',target:'self',coeff:.20});
 if(role==='support')effects.push({kind:'heal',target:'lowest_hp_ally',coeff:.28});
 return {id:'QA_PARTY_'+c,name:'QA '+c,cooldownMs:1100,castTimeMs:0,target:'current_target',
  priority:100,effects};
}
function player(c:ClassIdV2,i:number,level:number):CombatantDefinition{
 return {id:'P'+i+'_'+c,name:CLASS_NAMES_V2[c],classId:CLASS_NAMES_V2[c],team:'players',
  role:CLASS_ROLES_V2[c],level,stats:{maxHp:12000+level*120,attackPower:950+level*12,
   healingPower:800+level*10,defense:550+level*9,accuracy:1800+level*8,evasion:100+level*2,
   critChance:.08,critMultiplier:1.5,haste:.05},basicAttackMs:1500,basicAttackCoeff:.40,
  abilities:[action(c)],combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[c],specializationId:'QA'}};
}
function boss(row:typeof bosses[number]):CombatantDefinition{
 const raw:CombatantDefinition={id:row.id,name:row.name,team:'enemies',role:'enemy',level:row.level,boss:true,
  stats:{maxHp:150000,attackPower:100,healingPower:0,defense:120,accuracy:1600,evasion:100,
   critChance:.05,critMultiplier:1.5,haste:0},basicAttackMs:2400,basicAttackCoeff:.8,abilities:[],tags:[]};
 return row.id==='BOSS_EXP_ROOT'||row.id==='BOSS_EXP_BELL'
  ?prepareAsterfallBossV2(raw,ENEMY_V2_RULESET):prepareRegionalBossV2(raw,ENEMY_V2_RULESET);
}
const totalDamage=(r:CombatResult)=>r.players.reduce((n,p)=>n+p.damageDone,0);
let seq=0,cases=0,minRatio=Infinity,maxRatio=0,victoryChanges=0,maxLinks=0;
const byBoss:Record<string,{cases:number;min:number;max:number;victoryChanges:number}>={};
for(const t of tanks)for(const s of supports)
 for(let a=0;a<dps.length;a++)for(let b=a+1;b<dps.length;b++)for(const row of bosses){
  const ids=[t,dps[a],dps[b],s],players=ids.map((c,i)=>player(c,i,row.level));
  const input:CombatInput={seed:'SYNC_BOSS_'+seq++,players,enemies:[boss(row)],maxDurationMs:7000,tickMs:100};
  const scope:PartySyncScopeV2={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
   encounterId:'SYNC_BOSS_ENC_'+seq,partyId:'SYNC_BOSS_PARTY',revision:1,seed:input.seed,mode:'dungeon',
   members:ids.map((classId,i)=>({actorId:players[i].id,characterId:'SYNC_BOSS_CHAR_'+seq+'_'+i,classId}))};
  const plan=planPartySynchronizationV2('dungeon',scope.members);
  const token=issuePartySyncAuthorityV2(scope,input,()=>true);
  const frozen=JSON.stringify(input),base=simulateCombat(input),boosted=simulateCombat(input,undefined,undefined,token);
  assert.equal(JSON.stringify(input),frozen);
  assert.ok([...base.players,...base.enemies,...boosted.players,...boosted.enemies].every(x=>
   Number.isFinite(x.hp)&&Number.isFinite(x.damageDone)&&Number.isFinite(x.healingDone)));
  assert.ok(boosted.players.every((p,i)=>JSON.stringify(p.definition.stats)===JSON.stringify(input.players[i].stats)));
  const baseDamage=totalDamage(base),syncDamage=totalDamage(boosted);
  const ratio=baseDamage>0?syncDamage/baseDamage:1;
  assert.ok(ratio>.70&&ratio<1.50,'authored boss diagnostic outlier '+row.id+':'+ids.join(':')+':'+ratio);
  minRatio=Math.min(minRatio,ratio);maxRatio=Math.max(maxRatio,ratio);
  const changed=Number(base.victory!==boosted.victory);victoryChanges+=changed;maxLinks=Math.max(maxLinks,plan.active.length);
  const bucket=byBoss[row.id]??{cases:0,min:Infinity,max:0,victoryChanges:0};
  bucket.cases++;bucket.min=Math.min(bucket.min,ratio);bucket.max=Math.max(bucket.max,ratio);bucket.victoryChanges+=changed;
  byBoss[row.id]=bucket;cases++;
 }
assert.equal(cases,36*6);
assert.ok(Object.values(byBoss).every(x=>x.cases===36));
console.log(JSON.stringify({kind:'PARTY_SYNC_AUTHORED_BOSS_DIAGNOSTIC_NOT_EQUAL_CP',cases,
 minDamageRatio:Number(minRatio.toFixed(4)),maxDamageRatio:Number(maxRatio.toFixed(4)),
 victoryChanges,maxLinks,byBoss:Object.fromEntries(Object.entries(byBoss).map(([id,x])=>[id,{...x,
  min:Number(x.min.toFixed(4)),max:Number(x.max.toFixed(4))}]))}));
