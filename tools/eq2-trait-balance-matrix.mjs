/**
 * OFFLINE envelope of a few trait pairings; NOT 28 engine implementations.
 * Source roles and enemy tags reflect the isolated Combat/Enemies 2.0 drafts.
 * These are synthetic comparison fixtures, not class balance or win-rate QA.
 */
import {fileURLToPath} from 'node:url';
import {
 loadReviewContract,validateSampleRolls,directHitReview,retaliationReview,
 swordDanceReview,echoingStrikeReview,healingEchoReview,
} from './eq2-trait-event-model.mjs';

export const CLASS_ROLES={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
};
export const ENEMY_TAGS=['guardian','bruiser','assassin','swarm','caster','hexer','executioner','support'];
export const ENCOUNTER_KINDS=['normal','elite','boss'];
const ENEMY_FACTORS={
 guardian:{out:.8,in:1.04,period:3000},
 bruiser:{out:1,in:1.22,period:3000},
 assassin:{out:.92,in:1.10,period:2000},
 swarm:{out:1,in:.83,period:2000},
 caster:{out:.96,in:1.09,period:3000},
 hexer:{out:.94,in:1.14,period:3000},
 executioner:{out:1,in:1.27,period:3000},
 support:{out:.88,in:.88,period:3000},
};
const PROFILES={
 tank:['baseline','reflect_only','reflect_plus_riposte'],
 damage:['baseline','basic_plus_sword_dance','ability_plus_echo'],
 support:['baseline','heal_plus_echo','heal_plus_echo_bloom'],
};
const round=n=>Math.round(n*1e6)/1e6;
const findTrait=(contract,id)=>contract.traits.find(x=>x.id===id);
const maxSlots=2;
/** Two legal same-type rolls are used as review examples, not assigned to actual player items. */
export function sampleBonus(contract,tier,id){
 const affix=contract.affixes.find(a=>a.id===id);
 if(!affix)throw Error('eq2_qa_unknown_bonus');
 const items=affix.eligibleSlots.slice(0,maxSlots).map((slot,i)=>({
  instanceId:'QA_'+id+'_'+slot+'_'+i,slot,
  rolls:[{id,percent:round((affix.tiers['T'+tier][0]+affix.tiers['T'+tier][1])/2)}],
 }));
 return validateSampleRolls(contract,tier,items)[id];
}
export function simulateReferenceEncounter(contract,{classId,specIndex,tier,enemyTag,kind,seconds,profile}){
 const role=CLASS_ROLES[classId],enemy=ENEMY_FACTORS[enemyTag];
 if(!role||!enemy||![0,1].includes(specIndex)||![1,2,3,4].includes(tier)||
  !ENCOUNTER_KINDS.includes(kind)||![20,60].includes(seconds)||
  !PROFILES[role].includes(profile))throw Error('eq2_qa_unsupported_matrix_case');
 const enemyMaxHp=tier*40000*(kind==='boss'?12:kind==='elite'?2:1);
 const playerMaxHp=tier*15000*(role==='tank'?1.2:role==='support'?.94:1);
 const roleDps=role==='damage'?1.2:role==='support'?.78:1;
 const baseBasic=tier*100*roleDps*enemy.out;
 const baseSkill=tier*220*roleDps*enemy.out*(specIndex===0?.96:1.04);
 const baseHeal=tier*300;
 const attackPower=tier*160*roleDps;
 const basic=profile==='basic_plus_sword_dance'?sampleBonus(contract,tier,'basic_attack_damage_pct'):0;
 const ability=profile==='ability_plus_echo'?sampleBonus(contract,tier,'ability_damage_pct'):0;
 const reflected=profile.startsWith('reflect')?sampleBonus(contract,tier,'reflect_damage_pct'):0;
 const sword=findTrait(contract,'sword_dance'),echo=findTrait(contract,'echoing_strike'),
  mending=findTrait(contract,'mending_echo'),bloom=findTrait(contract,'restorative_bloom');
 let swordState={hits:0,targetId:null,lastProcMs:null};
 let lastEcho=null,lastHealEcho=null,lastBloom=null;
 let retaliationState={history:[],lastRiposteMs:null,lastEventMs:-1};
 let basicTotal=0,skillTotal=0,traitTotal=0,reflectedTotal=0,healTotal=0,procs=0;
 let incoming=0,disallowedReflections=0;
 for(let t=1000;t<=seconds*1000;t+=1000){
  if(t%2000===0){
   const hit=directHitReview({origin:'player_direct_basic',damage:baseBasic,basicBonus:basic,abilityBonus:ability});
   basicTotal+=hit;
   if(profile==='basic_plus_sword_dance'){
    const result=swordDanceReview(sword,{origin:'player_direct_basic',hit:true,
     targetId:'QA_ENEMY',timestampMs:t,damage:hit},swordState);
    swordState=result.next;traitTotal+=result.bonus;
    if(result.bonus>0)procs++;
   }
  }
  if(t%9000===0){
   const hit=directHitReview({origin:'player_direct_class_skill',damage:baseSkill,basicBonus:basic,abilityBonus:ability});
   skillTotal+=hit;
   if(profile==='ability_plus_echo'){
    const result=echoingStrikeReview(echo,{origin:'player_direct_class_skill',
     hit:true,timestampMs:t,damage:hit,attackPower},lastEcho);
    lastEcho=result.lastProcMs;traitTotal+=result.bonus;
    if(result.bonus>0)procs++;
   }
  }
  if(t%enemy.period===0){
   const scripted=kind==='boss'&&t%18000===0;
   const raw=tier*120*enemy.in*(kind==='boss'?1.4:kind==='elite'?1.2:1);
   const shield=t%12000===0?raw*.45:0;
   const hpLost=Math.max(0,raw-shield);
   incoming+=hpLost;
   const result=retaliationReview(contract,{
    timestampMs:t,targetId:'QA_ENEMY',
    source:scripted?'boss_phase_telegraph':'enemy_direct_hit_post_shield_hp_loss',
    defenderMaxHp:playerMaxHp,defenderHpAfter:playerMaxHp-hpLost,
    targetMaxHp:enemyMaxHp,actualHpLost:hpLost,regionalBoss:kind==='boss',
    reflectPercent:reflected,thornboundActive:profile==='reflect_plus_riposte',
   },retaliationState);
   retaliationState=result.next;reflectedTotal+=result.amount;
   if(scripted){if(result.amount!==0)throw Error('eq2_qa_boss_phase_retaliation_leak');disallowedReflections++;}
   if(result.fromTrait>0)procs++;
  }
  if(role==='support'&&t%8000===0){
   healTotal+=baseHeal;
   const event={origin:'player_direct_class_heal',timestampMs:t,effectiveHeal:baseHeal,
    otherAllyMissingHp:tier*800};
   if(profile!=='baseline'){
    const result=healingEchoReview(mending,event,lastHealEcho);
    lastHealEcho=result.lastProcMs;healTotal+=result.bonus;
    if(result.bonus>0)procs++;
   }
   if(profile==='heal_plus_echo_bloom'){
    const result=healingEchoReview(bloom,event,lastBloom);
    lastBloom=result.lastProcMs;healTotal+=result.bonus;
    if(result.bonus>0)procs++;
   }
  }
 }
 return {
  classId,role,specIndex,tier,enemyTag,kind,seconds,profile,
  basic:round(basicTotal),skill:round(skillTotal),trait:round(traitTotal),
  reflect:round(reflectedTotal),healing:round(healTotal),incoming:round(incoming),
  totalDamage:round(basicTotal+skillTotal+traitTotal+reflectedTotal),
  enemyMaxHp,playerMaxHp,procs,disallowedReflections,
 };
}
export function runReferenceMatrix(contract=loadReviewContract()){
 const rows=[];
 for(const classId of Object.keys(CLASS_ROLES))
 for(const specIndex of [0,1])
 for(const tier of [1,2,3,4])
 for(const enemyTag of ENEMY_TAGS)
 for(const kind of ENCOUNTER_KINDS)
 for(const seconds of [20,60])
 for(const profile of PROFILES[CLASS_ROLES[classId]]){
  rows.push(simulateReferenceEncounter(contract,{classId,specIndex,tier,enemyTag,kind,seconds,profile}));
 }
 const long=rows.filter(r=>r.seconds===60);
 const summary={};
 for(const role of ['tank','damage','support']){
  summary[role]={};
  for(const profile of PROFILES[role]){
   const sample=long.filter(r=>r.role===role&&r.profile===profile);
   summary[role][profile]={
    scenarios:sample.length,
    avgBasic:round(sample.reduce((n,r)=>n+r.basic,0)/sample.length),
    avgSkill:round(sample.reduce((n,r)=>n+r.skill,0)/sample.length),
    avgTrait:round(sample.reduce((n,r)=>n+r.trait,0)/sample.length),
    avgReflected:round(sample.reduce((n,r)=>n+r.reflect,0)/sample.length),
    avgHealing:round(sample.reduce((n,r)=>n+r.healing,0)/sample.length),
    maxProcs:Math.max(...sample.map(r=>r.procs)),
   };
  }
 }
 return {
  name:'eq2-review-synthetic-damage-reflection-healing-envelope',
  approvedForProduction:false,usesActualCombatEngine:false,usesPlayerTelemetry:false,
  contractVersion:contract.contractVersion,
  count:rows.length,
  classes:Object.keys(CLASS_ROLES).length,specsPerClass:2,tiers:4,
  enemyTags:ENEMY_TAGS.length,encounterKinds:ENCOUNTER_KINDS.length,
  simulatedHorizonsSeconds:[20,60],summary,rows,
 };
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const {rows,...summary}=runReferenceMatrix();
 console.log(JSON.stringify(summary,null,2));
}
