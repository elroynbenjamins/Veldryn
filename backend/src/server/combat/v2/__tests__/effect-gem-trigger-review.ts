/** Private matched trigger boundary QA using actual reviewed copy groups. */
import {strict as assert} from 'node:assert';
import {reviewPredatorHitV2,reviewGuardianBarrierV2,reviewUnyieldingDamageV2,reviewSustenanceKillV2,
 type EffectTriggerReviewGroupV2,type UnyieldingReviewStateV2,type GuardianReductionReviewV2} from '../effect-gem-trigger-review';
import type {CombatantDefinition,CombatantState} from '../../types';
import {gemOutgoingDamageMultiplierV1,gemOnShieldAppliedV1,gemEffectiveDefenseV1,
 gemOnDamageTakenV1,gemOnKillV1} from '../../gem-effects-v1';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const fixture=(actor:CombatantDefinition,g?:EffectTriggerReviewGroupV2):CombatantState=>({
 definition:{...actor,effectGems:g?[{familyId:g.familyId,copies:g.copies,resonance:g.resonance,totalValue:g.totalValue}]:[]},
 hp:actor.stats.maxHp,shield:0,alive:true,downed:false,threat:{},cooldownReadyAt:{},nextBasicAt:0,
 periodic:[],modifiers:[],damageDone:0,healingDone:0,damageTaken:0,interrupts:0,triggeredPhases:[],
});
export function runEffectTriggerBoundaryReviewV2(actor:CombatantDefinition,g:EffectTriggerReviewGroupV2){
 const value=g.totalValue,r=g.resonance;
 const original=JSON.stringify(g);
 const source=fixture(actor,g),target=fixture({...actor,id:'QA_EFFECT_TARGET',team:'enemies',boss:false,tags:['champion']});
 let assertions=0,legacyGap=false;
 switch(g.familyId){
  case 'effect_predator':{
   const champ={id:'champion',boss:false,tags:['champion']};
   const elite={id:'elite',boss:false,tags:['elite']};
   const boss={id:'boss',boss:true,tags:[]};
   const normal={id:'normal',boss:false,tags:[]};
   close(reviewPredatorHitV2(g,champ,0,[],false).bonus,r>=2?value:0);
   close(reviewPredatorHitV2(g,normal,0,[],true).bonus,0);
   close(reviewPredatorHitV2(g,boss,0,[],false).bonus,value);
   const miss=reviewPredatorHitV2(g,elite,100,[],false);
   assert.equal(miss.windows.length,0);
   const first=reviewPredatorHitV2(g,elite,200,[],true);
   close(first.bonus,value);
   assert.equal(first.windows.length,r===3?1:0);
   close(reviewPredatorHitV2(g,elite,201,first.windows,true).bonus,value*(r===3?1.25:1));
   close(reviewPredatorHitV2(g,boss,201,first.windows,false).bonus,value);
   const expired=reviewPredatorHitV2(g,elite,8200,first.windows,true);
   close(expired.bonus,value);assert.equal(expired.windows.length,first.windows.length);
   const historical=gemOutgoingDamageMultiplierV1(source,target,0,'BASIC',false)-1;
   close(historical,value);legacyGap=r===1;assertions=10;break;
  }
  case 'effect_guardians_gift':{
   let entries:GuardianReductionReviewV2[]=[];
   for(let i=0;i<20;i++)entries=reviewGuardianBarrierV2(g,'caster','ally',i*100,100,entries);
   assert.equal(entries.length,r===3?2:1);
   close(entries.find(e=>e.recipientId==='ally')!.value,value);
   if(r===3)close(entries.find(e=>e.recipientId==='caster')!.value,value*.5);
   const zero=reviewGuardianBarrierV2(g,'caster','other',2000,0,entries);assert.deepEqual(zero,entries);
   const self=reviewGuardianBarrierV2(g,'caster','caster',2000,100,entries);assert.deepEqual(self,entries);
   const second=reviewGuardianBarrierV2(g,'other','ally',2000,100,entries);
   assert.equal(second.filter(e=>e.recipientId==='ally').length,2);
   assert.equal(reviewGuardianBarrierV2(g,'caster','ally',10000,0,second).length,0);
   for(let i=0;i<20;i++)gemOnShieldAppliedV1(i*100,source,target);
   const historical=target.modifiers.filter(m=>m.tag==='gem:damage_reduction'&&m.expiresAt>1900);
   assert.equal(historical.length,20);legacyGap=true;assertions=8;break;
  }
  case 'effect_unyielding':{
   let state:UnyieldingReviewStateV2={expiries:[],readyAt:0};
   const armor=1000,ward=.2,cap=r>=2?5:4;
   const hit=reviewUnyieldingDamageV2(g,0,100,state,armor,ward);
   close(hit.armor,armor*(1+value));close(hit.ward,ward*(1+value));
   state=hit.state;
   assert.equal(reviewUnyieldingDamageV2(g,100,100,state,armor,ward).state.expiries.length,1);
   assert.equal(reviewUnyieldingDamageV2(g,750,0,state,armor,ward).state.expiries.length,1);
   for(let i=1;i<=8;i++)state=reviewUnyieldingDamageV2(g,i*750,100,state,armor,ward).state;
   assert.ok(state.expiries.length<=cap);
   const end=reviewUnyieldingDamageV2(g,20000,0,state,armor,ward);
   close(end.armor,armor);close(end.ward,ward);
   gemOnDamageTakenV1(0,source,100);
   close(gemEffectiveDefenseV1(source,0),actor.stats.defense*(1+value));
   legacyGap=true;assertions=8;break;
  }
  case 'effect_sustenance':{
   const max=1000;
   const initial=reviewSustenanceKillV2(g,0,0,max,500,0,false);
   close(initial.heal,max*value);close(initial.shield,0);
   const elite=reviewSustenanceKillV2(g,0,0,max,500,0,true);
   close(elite.heal,max*value*(r>=2?3:1));
   close(reviewSustenanceKillV2(g,100,elite.readyAt,max,elite.hp,0,true).heal,0);
   const full=reviewSustenanceKillV2(g,0,0,max,max,0,true);
   close(full.barrier,r===3?Math.min(max*.02,max*value*3*.25):0);
   const shielded=reviewSustenanceKillV2(g,0,0,max,max,100,true);
   close(shielded.shield,100);close(shielded.barrier,0);
   source.shield=actor.stats.maxHp*.1;target.definition.tags=['elite'];
   gemOnKillV1(0,source,target);
   close(source.shield,actor.stats.maxHp*(r===3?.02:.1));
   legacyGap=r===3;assertions=8;break;
  }
  default:return null;
 }
 assert.equal(JSON.stringify(g),original);
 return {family:g.familyId,resonance:r,assertions,legacyGap,releaseEnabled:false as const};
}
