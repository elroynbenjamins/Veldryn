/**
 * REVIEW ONLY — synthetic trait eligibility / proc envelope, NOT Combat 2.0.
 *
 * No combat sources are imported; the external canonical Combat 2.0 branch is
 * referenced by a pinned review contract, not cloned into this economy branch.
 * Deliberately does not simulate class skills, gems, boss mechanics, shields,
 * DoT refresh, gear quality, or server RNG. No gameplay decisions allowed.
 */
import {seededRng} from './eq2-drop-risk-v2.mjs';
import {previewBleedEventStream,previewDirectDamage} from './eq2-signature-combat-preview-v1.mjs';
import {previewHeartwoodRetort,previewOasisAfterglow} from './eq2-signature-tank-support-preview-v1.mjs';

const fail=s=>{throw Error('eq2_signature_synthetic_matrix:'+s)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const q=(arr,p)=>{
 if(!arr.length)fail('empty_metric');
 const sorted=[...arr].sort((a,b)=>a-b);
 return Number(sorted[Math.ceil(p*sorted.length)-1].toFixed(5));
};
const average=arr=>Number((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(5));
export function validateSyntheticFixture({contract,signature}){
 if(contract?.status!=='REVIEW_ONLY_NO_RUNTIME'||signature?.status!=='REVIEW_ONLY_NO_RUNTIME'
  ||contract.noImplementationAuthorized!==true||!signature.release
  ||Object.values(signature.release).some(enabled=>enabled!==false))fail('review_gate');
 const c=contract.rolesAndSpecializations;
 if(!Array.isArray(c)||c.length!==9||new Set(c.map(x=>x.classId)).size!==9)fail('nine_classes');
 const allSpecs=c.flatMap(x=>x.specializations.map(s=>x.classId+':'+s));
 if(allSpecs.length!==18||new Set(allSpecs).size!==18)fail('eighteen_specs');
 for(const c of contract.rolesAndSpecializations){
  if(!['tank','damage','support'].includes(c.role)
    ||!finite(c.illustrativePhysicalHitFraction)
    ||c.illustrativePhysicalHitFraction<0||c.illustrativePhysicalHitFraction>1)fail('class_data');
 }
 const f=contract.fixtureProfile;
 if(f.label!=='pure-synthetic-preview-not-authoritative-combat-calibration'
   ||!Number.isInteger(f.durationSecondsByKind.boss)||f.durationSecondsByKind.boss<120
   ||Object.keys(f.hitsPerSecondByProfile).length!==3)fail('fixture_policy');
 const pieces=signature.items;
 if(pieces.length!==6||new Set(pieces.map(x=>x.id)).size!==6)fail('signature_pieces');
 if(contract.crossSystemRules.physicalBleedHexPotencyMultiplier!==1
   ||contract.crossSystemRules.physicalBleedElementalWardMultiplier!==1
   ||contract.crossSystemRules.maximumPersistentSignatureMitigation!==.03
   ||contract.crossSystemRules.physicalBleedBossCoefficientMultiplier!==.5)fail('interoperability_caps');
 return {classes:c.length,specs:allSpecs.length};
}
function directHits({seed,rate,duration,physicalFraction,hitChance,damage}){
 const rng=seededRng(seed),events=[];
 let action=0;
 for(let t=0;t<duration;t+=1/rate){
   // One authored ability event key per use, not ability ID. Do not invent
   // a proc for misses; no exact class skill distribution is claimed.
   action++;
   if(rng()>=hitChance||rng()>=physicalFraction)continue;
   events.push({atSeconds:Number(t.toFixed(5)),actionId:'qa-use-'+action,
    targetId:'qa-foe',kind:'direct_physical',damage,
    isSkill:action%3===0,isBoss:false});
 }
 return events;
}
function enemyHits({duration,kind}){
 const base=kind==='boss'?240:kind==='elite'?180:110;
 const out=[];
 for(let t=0,index=0;t<duration;t+=2.5,index++){
   const cycle=index%12;
   const sourceKind=cycle===10?'enemy_dot':cycle===11?'environment':'enemy_direct';
   const damageKind=cycle===8?'true':cycle===6?'magical':'physical';
   out.push({atSeconds:Number(t.toFixed(5)),sourceKind,damageKind,
    creditedHpDamage:base});
 }
 return out;
}
export function evaluateSignatureSyntheticMatrix({contract,signature,seed=20261121}){
 validateSyntheticFixture({contract,signature});
 if(!Number.isSafeInteger(seed)||seed<1)fail('seed');
 const f=contract.fixtureProfile;
 const result=[];
 const traitById=new Map(signature.items.map(x=>[x.traitId,x.trait]));
 for(const actor of contract.rolesAndSpecializations){
  for(const [index,spec] of actor.specializations.entries()){
   for(const tier of [2,3,4]){
    const offence=traitById.get(tier===2?'riverthorn_cut':tier===3?'scorpionstrike_bleed':'riftfang_bleed');
    if(!offence)fail('offence_trait');
    for(const kind of ['normal','elite','boss']){
     const duration=f.durationSecondsByKind[kind];
     for(const [profile,rate] of Object.entries(f.hitsPerSecondByProfile)){
      const ordinal=result.length+1;
      const actualPhysicalRatio=actor.illustrativePhysicalHitFraction*(index===0?.95:1.05);
      const direct=directHits({seed:seed+ordinal*3,rate,duration,
        physicalFraction:Math.min(1,actualPhysicalRatio),
        hitChance:f.accuracyOnAllProfiles,
        damage:f.baseDamageOnCreditedDirectHit*f.profileQualityMultiplier[profile]});
      const bleed=previewBleedEventStream({events:direct.map(e=>({...e,isBoss:kind==='boss'})),
        trait:offence,seed:seed+ordinal*17});
      const eligibleDirect=direct.filter(e=>offence.trigger!=='direct_physical_skill_hit'||e.isSkill===true);
      const eligibleDamage=eligibleDirect.reduce((a,e)=>a+e.damage,0);
      const possibleBleed=bleed.totalPotentialBleed;
      const ratio=eligibleDamage?possibleBleed/eligibleDamage:0;
      const incoming=enemyHits({duration,kind});
      const regularTotal=incoming.reduce((a,e)=>a+e.creditedHpDamage,0);
      const eligibleIncoming=incoming.filter(e=>e.sourceKind==='enemy_direct'&&e.damageKind!=='true')
        .reduce((a,e)=>a+e.creditedHpDamage,0);
      const glassfinSaved=incoming.reduce((a,e)=>a+
        (e.creditedHpDamage-previewDirectDamage({amount:e.creditedHpDamage,
          sourceKind:e.sourceKind,damageKind:e.damageKind,hasGlassfinGuard:true}).after),0);
      const heartwood=previewHeartwoodRetort({events:incoming,
        trait:traitById.get('heartwood_retort'),maxHp:1000});
      const supportEvents=[];
      if(actor.role==='support'){
        for(let now=0,n=0;now<duration;now+=22,n++)
         supportEvents.push({atSeconds:now,sourceId:'QA_'+actor.classId,
          targetId:'QA_ALLY_TANK',targetMaxHp:5000,creditedEffectiveAmount:200,
          abilityUseId:'support-'+n,isDirect:true,isAlly:true,kind:n%3===0?'shield':'heal'});
      }
      const oasis=previewOasisAfterglow({events:supportEvents,trait:traitById.get('oasis_afterglow')});
      result.push({classId:actor.classId,specialization:spec,role:actor.role,tier,kind,profile,
        durationSeconds:duration,qualifyingDirectHits:eligibleDirect.length,
        sourceDirectDamage:Number(eligibleDamage.toFixed(3)),
        potentialBleedDamage:possibleBleed,
        potentialBleedShare: Number(ratio.toFixed(5)),
        potentialBleedProcs:bleed.procs,
        eligibleDirectIncomingDamage:eligibleIncoming,
        totalIncomingDamage:regularTotal,
        glassfinDamagePrevented:Number(glassfinSaved.toFixed(5)),
        glassfinPercentAllIncoming:Number((100*glassfinSaved/regularTotal).toFixed(5)),
        heartwoodDamagePrevented:heartwood.totalDamagePrevented,
        heartwoodActivations:heartwood.activationCount,
        oasisPotentialShield:oasis.totalPotentialShield,
        oasisShieldProcs:oasis.procs});
     }
    }
   }
  }
 }
 if(result.length!==486||new Set(result.map(x=>
   [x.classId,x.specialization,x.tier,x.kind,x.profile].join(':'))).size!==486)fail('matrix_coverage');
 const summaries=[];
 for(const tier of [2,3,4])for(const kind of ['normal','elite','boss']){
  const rows=result.filter(x=>x.tier===tier&&x.kind===kind);
  const trait=traitById.get(tier===2?'riverthorn_cut':tier===3?'scorpionstrike_bleed':'riftfang_bleed');
  summaries.push({tier,kind,cases:rows.length,
    baseChance:trait.chance,bleedShareOfHit:trait.physicalBleedShareOfHit,
    theoreticalLongRunUncooledFractionUpperBound:Number((
      trait.chance*trait.physicalBleedShareOfHit*(kind==='boss'?.5:1)).toFixed(5)),
    syntheticQualifyingHits:rows.reduce((a,x)=>a+x.qualifyingDirectHits,0),
    averagePotentialBleedFractionOfEligibleDamage:average(rows.map(x=>x.potentialBleedShare)),
    p90PotentialBleedFractionOfEligibleDamage:q(rows.map(x=>x.potentialBleedShare),.9),
    maximumPotentialBleedFractionOfEligibleDamage:q(rows.map(x=>x.potentialBleedShare),1),
    averageGlassfinPercentOfAllIncoming:average(rows.map(x=>x.glassfinPercentAllIncoming)),
    maximumGlassfinPercentOfAllIncoming:q(rows.map(x=>x.glassfinPercentAllIncoming),1),
    averageHeartwoodDamagePrevented:average(rows.map(x=>x.heartwoodDamagePrevented)),
    totalOasisPotentialShield:rows.reduce((a,x)=>a+x.oasisPotentialShield,0)
  });
 }
 return {status:'REVIEW_ONLY_NO_RUNTIME',rows:result,summaries,
  coverage:{classes:9,specializations:18,tiers:[2,3,4],
   enemyKinds:['normal','elite','boss'],paceProfiles:['slow','baseline','fast'],
   syntheticScenarios:486,realCombatSimulations:0},
  interpretation:'Hypothetical normalized event cadence and enemy damage traces; potential Bleed assumes every proc tick will complete and does not model enemy immunities, target refresh, hit resists, guardian threat or gear ownership.'};
}
