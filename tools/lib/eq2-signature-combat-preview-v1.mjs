/**
 * REVIEW ONLY. Synthetic Combat 2.0 signature trait feasibility preview.
 * NOT imported by the combat engine, no network/SQL/item or dungeon access.
 * Uses reproducible xorshift samples for tests; NOT server-secure entropy.
 */
import {seededRng} from './eq2-drop-risk-v2.mjs';
const fail=message=>{throw Error('eq2_signature_preview_rejected:'+message)};
export function inspectSignatureLoadout(equippedIds,definitions){
 if(!Array.isArray(equippedIds)||!Array.isArray(definitions))fail('invalid_loadout');
 const byId=new Map(definitions.map(x=>[x.id,x]));
 if(byId.size!==definitions.length)fail('duplicate_catalog');
 const active=[],seen=new Set(),families=new Set();
 for(const itemId of equippedIds){
  if(seen.has(itemId))fail('duplicate_equipped_copy');
  seen.add(itemId);
  const item=byId.get(itemId);
  if(!item)fail('untrusted_item');
  if(families.has(item.trait.family))fail('signature_family_conflict');
  if(active.length===2)fail('signature_trait_count_cap');
  families.add(item.trait.family);
  active.push({id:item.traitId,family:item.trait.family});
 }
 return Object.freeze({activeTraits:active,count:active.length,simulationOnly:true});
}
export function previewDirectDamage({amount,sourceKind,damageKind,hasGlassfinGuard=false}){
 if(!Number.isFinite(amount)||amount<0)fail('bad_damage');
 if(!['enemy_direct','enemy_dot','environment'].includes(sourceKind))fail('source_kind');
 if(!['physical','magical','true'].includes(damageKind))fail('damage_kind');
 const mitigates=hasGlassfinGuard===true&&sourceKind==='enemy_direct'&&damageKind!=='true';
 return {before:amount,after:Number((amount*(mitigates?0.97:1)).toFixed(4)),
   damageReductionApplied:mitigates?0.03:0,simulationOnly:true};
}
export function previewBleedEventStream({events,trait,seed=20261121}){
 if(!Array.isArray(events)||!trait||trait.family!=='offensive'
    ||!Number.isFinite(trait.chance)||trait.chance<=0||trait.chance>0.10
    ||!Number.isFinite(trait.physicalBleedShareOfHit)||trait.physicalBleedShareOfHit<=0||trait.physicalBleedShareOfHit>0.24
    ||!Number.isInteger(trait.cooldownSeconds)||trait.cooldownSeconds<10
    ||trait.durationSeconds!==4)fail('trait_policy');
 if(!Number.isSafeInteger(seed)||seed<0)fail('rng_seed');
 const random=seededRng(seed);
 let last=-Infinity,nextReady=0,rolls=0,procs=0,totalEstimatedBleed=0;
 const seenActions=new Set(),procEvents=[];
 for(const event of events){
  if(!event||!Number.isFinite(event.atSeconds)||event.atSeconds<last
    ||!Number.isFinite(event.damage)||event.damage<0)fail('malformed_hit');
  last=event.atSeconds;
  if(typeof event.actionId!=='string'||!event.actionId||typeof event.targetId!=='string'||!event.targetId)fail('unverified_identity_shape');
  // DoT, reflective and pet-proc hits never receive their own proc roll.
  if(event.kind!=='direct_physical'||event.isProc===true||event.damage===0)continue;
  if(trait.trigger==='direct_physical_skill_hit'&&event.isSkill!==true)continue;
  // A multi-hit ability gets only one roll, even across multiple targets.
  if(seenActions.has(event.actionId))continue;
  seenActions.add(event.actionId);
  if(event.atSeconds<nextReady)continue;
  rolls++;
  if(random()>=trait.chance)continue;
  procs++;
  const bossModifier=event.isBoss===true?0.5:1;
  const amount=Number((event.damage*trait.physicalBleedShareOfHit*bossModifier).toFixed(4));
  totalEstimatedBleed+=amount;
  nextReady=event.atSeconds+trait.cooldownSeconds;
  procEvents.push({atSeconds:event.atSeconds,targetId:event.targetId,overSeconds:4,totalPhysicalBleed:amount});
 }
 return {rolls,procs,totalPotentialBleed:Number(totalEstimatedBleed.toFixed(4)),
  nextReadyAtSeconds:nextReady,procEvents,simulationOnly:true,
  limitation:'This does not settle ticks, immunities, or overlapping target bleed refreshes. Actual Combat 2.0 status resolver required.'};
}
