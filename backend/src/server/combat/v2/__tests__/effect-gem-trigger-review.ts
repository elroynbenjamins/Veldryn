/** Private matched trigger boundary QA using actual reviewed copy groups. */
import {strict as assert} from 'node:assert';
import {reviewPredatorHitV2,reviewGuardianBarrierV2,reviewUnyieldingDamageV2,reviewSustenanceKillV2,
 reviewAegisBarrierV2,reviewMercyBarrierV2,reviewGemBarrierAbsorptionV2,reviewGemBarrierExpiryV2,reviewGemBarrierRemoveV2,
 reviewOpportunistApplicationV2,reviewOpportunistHitV2,reviewBulwarkTriggerV2,
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
  case 'effect_aegis':{
   const input={id:'a',casterId:'caster',recipientId:'ally',now:0,authoredAmount:100,
    baseCapacity:1000,durationMs:6000,externalShield:0,rows:[],authored:true};
   const grant=reviewAegisBarrierV2(g,input);
   close(grant.granted,100*(1+value));close(grant.cap,1000*(r===3?1.05:1));
   assert.equal(reviewAegisBarrierV2(g,{...input,authored:false}).granted,0);
   const full=reviewAegisBarrierV2(g,{...input,externalShield:2000});
   assert.equal(full.granted,0);assert.equal(full.rows.length,0);
   const other=reviewAegisBarrierV2(g,{...input,id:'b',recipientId:'other',rows:grant.rows});
   const absorbed=reviewGemBarrierAbsorptionV2(other.rows,'ally',100,20);
   close(absorbed.absorbed,20);close(absorbed.rows.find(x=>x.id==='b')!.remaining,grant.granted);
   assert.equal(reviewGemBarrierExpiryV2(absorbed.rows,5999).heals.length,0);
   const expired=reviewGemBarrierExpiryV2(absorbed.rows,6000);
   assert.equal(expired.rows.length,0);assert.equal(expired.heals.length,r>=2?2:0);
   if(r>=2){close(expired.heals.find(h=>h.barrierId==='a')!.amount,(grant.granted-20)*.05);
    assert.ok(expired.heals.every(h=>!h.mayTriggerEffects));}
   assert.equal(reviewGemBarrierExpiryV2(expired.rows,7000).heals.length,0);
   const consumed=reviewGemBarrierAbsorptionV2(grant.rows,'ally',100,1000);
   assert.equal(reviewGemBarrierExpiryV2(consumed.rows,6000).heals.length,0);
   assert.equal(reviewGemBarrierRemoveV2(grant.rows,'a').heals.length,0);
   legacyGap=r>=2;assertions=15;break;
  }
  case 'effect_mercy':{
   const input={id:'m',casterId:'caster',recipientId:'ally',now:0,attempted:1000,actual:500,
    maxHp:1000,externalShield:0,rows:[],authoredDirect:true};
   const grant=reviewMercyBarrierV2(g,input);
   close(grant.granted,Math.min(500*value,r>=2?40:30));
   assert.equal(grant.expiresAt,r===3?10000:8000);
   assert.equal(reviewMercyBarrierV2(g,{...input,actual:1000}).granted,0);
   assert.equal(reviewMercyBarrierV2(g,{...input,authoredDirect:false}).granted,0);
   assert.equal(reviewMercyBarrierV2(g,{...input,externalShield:100}).granted,0);
   const second=reviewMercyBarrierV2(g,{...input,id:'m2',now:100,rows:grant.rows});
   assert.ok(second.granted+grant.granted<=(r>=2?40:30)+1e-8);
   assert.equal(reviewGemBarrierExpiryV2(second.rows,20000).heals.length,0);
   assert.equal(reviewGemBarrierExpiryV2(second.rows,20000).rows.length,0);
   legacyGap=true;assertions=9;break;
  }
  case 'effect_opportunist':{
   const app=(caster:string,targetId:string,effect:string,now:number,fresh:boolean,rows:ReturnType<typeof reviewOpportunistApplicationV2>)=>
    reviewOpportunistApplicationV2(g,caster,targetId,effect,now,fresh,rows);
   const first=app('caster','ally','mark',0,true,[]);
   assert.equal(first[0].cooldownUntil,r>=2?3000:4000);
   assert.deepEqual(app('caster','ally','mark',100,false,first),first);
   assert.deepEqual(app('caster','ally','another',100,true,first),first);
   const other=app('other','ally','mark2',100,true,first);
   const hit=(rows:typeof other,eligible:boolean,success:boolean,crit:boolean,effect:string|null,expiry:number,now=200)=>
    reviewOpportunistHitV2(g,'caster','ally',now,eligible,success,crit,effect,expiry,rows);
   assert.equal(hit(other,false,true,true,'mark',3000).bonus,0);
   assert.equal(hit(other,true,false,true,'mark',3000).bonus,0);
   const got=hit(other,true,true,true,'mark',3000);
   close(got.bonus,value);assert.equal(got.extension,r===3?1000:0);
   assert.equal(got.effectExpiry,3000+(r===3?1000:0));
   assert.equal(got.windows.find(w=>w.casterId==='other')!.consumed,false);
   assert.equal(hit(got.windows,true,true,true,'mark',4000).bonus,0);
   assert.equal(hit(other,true,true,true,'different',3000).extension,0);
   assert.equal(hit(other,true,true,true,'mark',200).extension,0);
   assert.equal(hit(other,true,true,false,'mark',3000).extension,0);
   assert.equal(hit(other,true,true,true,'mark',5000,4000).bonus,0);
   legacyGap=r===3;assertions=14;break;
  }
  case 'effect_bulwark':{
   const duration=r>=2?5000:4000;
   assert.equal(reviewBulwarkTriggerV2(g,0,0,'other').reduction,0);
   const first=reviewBulwarkTriggerV2(g,0,0,'successful_block');
   close(first.reduction,value);assert.equal(first.expiresAt,duration);
   const second=reviewBulwarkTriggerV2(g,100,first.expiresAt,'successful_block');
   assert.equal(second.expiresAt,duration+(r===3?100:0));
   const defense=reviewBulwarkTriggerV2(g,200,second.expiresAt,'defensive_ability');
   assert.equal(defense.expiresAt,200+duration);
   assert.equal(reviewBulwarkTriggerV2(g,300,defense.expiresAt,'other').expiresAt,defense.expiresAt);
   assert.equal(reviewBulwarkTriggerV2(g,200+duration,defense.expiresAt,'other').reduction,0);
   legacyGap=true;assertions=7;break;
  }
  default:return null;
 }
 assert.equal(JSON.stringify(g),original);
 return {family:g.familyId,resonance:r,assertions,legacyGap,releaseEnabled:false as const};
}
