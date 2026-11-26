/** Private matched trigger boundary QA using actual reviewed copy groups. */
import {strict as assert} from 'node:assert';
import {reviewPredatorHitV2,reviewGuardianBarrierV2,reviewUnyieldingDamageV2,reviewSustenanceKillV2,
 reviewAegisBarrierV2,reviewMercyBarrierV2,reviewGemBarrierAbsorptionV2,reviewGemBarrierExpiryV2,reviewGemBarrierRemoveV2,
 reviewOpportunistApplicationV2,reviewOpportunistHitV2,reviewBulwarkTriggerV2,
 emptyEffectStackReviewV2,reviewEffectStackTransitionV2,type EffectStackReviewEventV2,
 reviewExecutionDamageV2,reviewOpeningStrikeV2,reviewRuinDamageV2,emptyRetaliationReviewV2,reviewRetaliationTakenV2,reviewRetaliationHitV2,
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
  case 'effect_momentum':case 'effect_critical_surge':case 'effect_flow':case 'effect_shared_resolve':{
   const family=g.familyId;
   const cap=family==='effect_momentum'?(r>=2?6:5):family==='effect_shared_resolve'?(r===3?3:2):(r>=2?4:3);
   const kind:EffectStackReviewEventV2['kind']=family==='effect_flow'?'ability':family==='effect_shared_resolve'?'ally_support':'direct_hit';
   const event=(now:number,actionSequence:number,overrides:Partial<EffectStackReviewEventV2>={}):EffectStackReviewEventV2=>
    ({now,actionSequence,kind,eligible:true,successful:true,critical:true,abilityId:'a'+actionSequence,...overrides});
   const empty=emptyEffectStackReviewV2();
   const miss=reviewEffectStackTransitionV2(g,empty,event(0,0,{successful:false}));
   assert.equal(miss.stacks,0);
   const excluded=reviewEffectStackTransitionV2(g,miss.state,event(0,0,{eligible:false}));
   assert.equal(excluded.stacks,0);
   const first=reviewEffectStackTransitionV2(g,excluded.state,event(0,0));
   assert.equal(first.stacks,family==='effect_flow'?0:1);
   const duplicate=reviewEffectStackTransitionV2(g,first.state,event(1,0));
   assert.deepEqual(duplicate.state.expiries,first.state.expiries);
   assert.equal(duplicate.triggered,false);
   const sameOrEarly=reviewEffectStackTransitionV2(g,duplicate.state,event(100,1,
    family==='effect_flow'?{abilityId:'a0'}:family==='effect_shared_resolve'?{eligible:false}:{}));
   assert.deepEqual(sameOrEarly.state.expiries,first.state.expiries);
   let state=sameOrEarly.state;
   for(let i=2;i<=cap+2;i++){
    const step=reviewEffectStackTransitionV2(g,state,event(i*750,i));
    state=step.state;assert.ok(step.stacks<=cap);close(step.bonus,step.stacks*value);
   }
   assert.equal(state.expiries.length,cap);
   const snapshot=JSON.stringify(state);
   const tick=reviewEffectStackTransitionV2(g,state,event(state.lastAt,999,{kind:'tick'}));
   assert.deepEqual(tick.state,state);
   assert.equal(JSON.stringify(state),snapshot);
   const firstExpiry=Math.min(...state.expiries);
   const decay=reviewEffectStackTransitionV2(g,state,event(firstExpiry,999,{kind:'tick'}));
   if((family==='effect_momentum'||family==='effect_flow')&&r===3)assert.equal(decay.stacks,cap-1);
   else if(family==='effect_momentum'||family==='effect_flow')assert.equal(decay.stacks,0);
   else assert.ok(decay.stacks<cap);
   const end=reviewEffectStackTransitionV2(g,decay.state,event(Math.max(...state.expiries),999,{kind:'tick'}));
   assert.equal(end.stacks,0);close(end.bonus,0);
   assert.throws(()=>reviewEffectStackTransitionV2(g,state,event(state.lastAt-1,999)),/stack_input/);
   assert.throws(()=>reviewEffectStackTransitionV2(g,{...state,expiries:Array(cap+1).fill(state.lastAt+100)},event(state.lastAt,999)),/stack_cap/);
   if(family==='effect_flow'){
    const a=reviewEffectStackTransitionV2(g,empty,event(0,0,{abilityId:'A'}));
    const b=reviewEffectStackTransitionV2(g,a.state,event(100,1,{abilityId:'B'}));
    const c=reviewEffectStackTransitionV2(g,b.state,event(200,2,{abilityId:'B'}));
    assert.equal(b.stacks,1);assert.deepEqual(c.state.expiries,b.state.expiries);
   }
   if(family==='effect_critical_surge'){
    const noCrit=reviewEffectStackTransitionV2(g,empty,event(0,0,{critical:false}));
    assert.equal(noCrit.stacks,0);
    const atCap={...empty,expiries:Array.from({length:cap},(_,i)=>2000+i*100)};
    const refreshed=reviewEffectStackTransitionV2(g,atCap,event(1000,1));
    assert.equal(refreshed.stacks,cap);
    assert.equal(refreshed.state.expiries.includes(6000),r===3);
    assert.equal(refreshed.state.expiries.includes(2000),r!==3);
   }
   if(family==='effect_shared_resolve'){
    const one=reviewEffectStackTransitionV2(g,empty,event(0,0));
    const repeat=reviewEffectStackTransitionV2(g,one.state,event(0,0));
    assert.equal(repeat.stacks,1);
    const second=reviewEffectStackTransitionV2(g,repeat.state,event(0,1));
    assert.equal(second.stacks,2);
   }
   // Flow and multi-target stack identity differ from the old helpers;
   // these are design review flags, not a claim of live regression.
   legacyGap=family==='effect_flow'||family==='effect_shared_resolve'||family==='effect_momentum';
   assertions=16+2*(cap+1)+(family==='effect_flow'?2:family==='effect_critical_surge'?4:family==='effect_shared_resolve'?2:0);break;
  }
  case 'effect_execution':{
   const max=1000,threshold=r>=2?350:300;
   close(reviewExecutionDamageV2(g,threshold,max,true).bonus,0);
   close(reviewExecutionDamageV2(g,threshold-1,max,true).bonus,value);
   close(reviewExecutionDamageV2(g,150,max,true).bonus,value);
   close(reviewExecutionDamageV2(g,149,max,true).bonus,value*(r===3?1.25:1));
   close(reviewExecutionDamageV2(g,0,max,true).bonus,0);
   close(reviewExecutionDamageV2(g,100,max,false).bonus,0);
   assert.throws(()=>reviewExecutionDamageV2(g,1001,max,true),/execution_input/);
   assert.throws(()=>reviewExecutionDamageV2(g,0,0,true),/execution_input/);
   assertions=8;break;
  }
  case 'effect_opening_strike':{
   const duration=r>=2?10000:8000;
   const first=reviewOpeningStrikeV2(g,0,null,false,true);
   close(first.bonus,value);assert.equal(first.state.expiresAt,duration);
   const before=reviewOpeningStrikeV2(g,duration-1,first.state,false,true);
   close(before.bonus,value);
   const at=reviewOpeningStrikeV2(g,duration,before.state,false,true);
   close(at.bonus,0);
   const phase=reviewOpeningStrikeV2(g,duration+100,at.state,true,true);
   close(phase.bonus,r===3?value:0);assert.equal(phase.refreshed,r===3);
   const again=reviewOpeningStrikeV2(g,duration+200,phase.state,true,true);
   assert.equal(again.state.expiresAt,phase.state.expiresAt);assert.equal(again.refreshed,false);
   close(reviewOpeningStrikeV2(g,duration+300,again.state,false,false).bonus,0);
   const overlapping=reviewOpeningStrikeV2(g,100,first.state,true,true);
   close(overlapping.bonus,value);assert.equal(overlapping.state.expiresAt,duration+(r===3?100:0));
   assertions=11;break;
  }
  case 'effect_ruin':{
   const base={sourceId:'self',targetId:'enemy',effectId:'mark1',category:'mark',isMark:true,
    eligible:true,appliedAt:0,expiresAt:10000};
   const hit=(rows:typeof base[],now=100,eligible=true)=>reviewRuinDamageV2(g,'self','enemy',now,eligible,rows);
   close(hit([]).bonus,0);
   close(hit([base]).bonus,value*(r===3?2:1));
   close(hit([base,{...base,effectId:'duplicate'}]).bonus,value*(r===3?2:1));
   close(hit([base,{...base,sourceId:'other'}]).bonus,value*(r===3?2:1));
   close(hit([base,{...base,targetId:'other'}]).bonus,value*(r===3?2:1));
   close(hit([base,{...base,category:'unqualified',eligible:false}]).bonus,value*(r===3?2:1));
   close(hit([base],4000).bonus,value);
   close(hit([base],10000).bonus,0);
   const full=[base,{...base,effectId:'slow',category:'slow',isMark:false},{...base,effectId:'weak',category:'weak',isMark:false}];
   close(hit(full).bonus,value*(r>=2?3:2));
   close(hit(full,100,false).bonus,0);
   const falseMark={...base,category:'marked_name',isMark:false};
   close(hit([falseMark]).bonus,value);
   assertions=11;break;
  }
  case 'effect_retaliation':{
   const empty=emptyRetaliationReviewV2(),max=1000,threshold=r>=2?100:120;
   const take=(now:number,hpDamage:number,state=empty,eligible=true,alive=true)=>
    reviewRetaliationTakenV2(g,now,state,max,hpDamage,eligible,alive);
   const hit=(now:number,state:typeof empty,eligible=true,successful=true,hp=500,alive=true)=>
    reviewRetaliationHitV2(g,now,state,max,hp,eligible,successful,alive);
   assert.equal(take(0,threshold-1).armed,false);
   assert.equal(take(0,threshold,empty,false).armed,false);
   assert.equal(take(0,threshold,empty,true,false).armed,false);
   const armed=take(0,threshold);
   assert.equal(armed.armed,true);assert.equal(armed.state.readyUntil,8000);
   assert.equal(take(100,threshold,armed.state).armed,false);
   assert.equal(hit(100,armed.state,false).consumed,false);
   assert.equal(hit(100,armed.state,true,false).consumed,false);
   assert.equal(hit(8000,armed.state).consumed,false);
   const consumed=hit(200,armed.state);
   close(consumed.bonus,value);close(consumed.heal,r===3?10:0);
   assert.equal(consumed.mayTriggerEffects,false);
   close(hit(201,consumed.state).bonus,0);
   const armedAgain=take(8000,threshold,consumed.state);
   const second=hit(8100,armedAgain.state);
   close(second.bonus,value);close(second.heal,0);
   const third=take(16000,threshold,second.state);
   close(hit(16001,third.state,true,true,999).heal,r===3?1:0);
   assertions=16;break;
  }
  default:return null;
 }
 assert.equal(JSON.stringify(g),original);
 return {family:g.familyId,resonance:r,assertions,legacyGap,releaseEnabled:false as const};
}
