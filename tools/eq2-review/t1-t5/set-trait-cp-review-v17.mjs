import {readFileSync} from 'node:fs';
import {inspectPower} from './equipment-power-contract-review-v15.mjs';
import {profiles,basePreview} from './profile-premium-review-v16.mjs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/2-0/'+p,import.meta.url),'utf8'));
export const authoring=load('eq2-set-trait-authoring-review-v17.json');
const m=load('eq2-t1-t5-canonical-membership-reconciliation-v2.json'),a=load('eq2-universal-affix-overlap-review-v4.json'),d=load('eq2-equipment-power-review-v5.json'),p=load('eq2-innate-and-set-budget-review-v7.json');
const deny=Object.freeze({reviewOnly:true,cpApproved:false,mayMint:false,mayEquip:false,mayApply:false,mayTrade:false,mayDrop:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_effect_review_v17_'+x);};
const round=x=>Math.round(x*10000)/10000;
// Explicit future source reauthoring candidates; do NOT mutate original units or item data.
export const semanticPolicy=Object.freeze({
 attack_pct:{channel:'attack_pct',unit:'relative_percent',sourceUnit:'relative_percent',knee:2000,hard:3500,weight:1.2},
 evasion_pp:{channel:'evasion_pp',unit:'percentage_points',sourceUnit:'percentage_points',knee:800,hard:1600,weight:1.1},
 haste_pct:{channel:'haste_pp',unit:'percentage_points',sourceUnit:'relative_percent',requiresReauthor:true},
 healing_power_pct:{channel:'forge_healing_power_pct',unit:'relative_percent',sourceUnit:'relative_percent',requiresScopeApproval:true},
 crit_chance_pp:{channel:'crit_rate_pp',unit:'percentage_points',sourceUnit:'percentage_points',requiresAliasApproval:true}
});
const allChannels=new Map(a.stats.map(s=>[s.channel,s.unit]));
allChannels.set('attack_pct','relative_percent');allChannels.set('evasion_pp','percentage_points');
const weights={...d.scorePolicy.weights,attack_pct:1.2,evasion_pp:1.1};
function cap(k,n){
 if(!Number.isSafeInteger(n)||n<0||!allChannels.has(k))fail('channel');
 const s=semanticPolicy[k];
 return k==='attack_pct'||k==='evasion_pp'?n<=s.knee?n:Math.min(s.hard,s.knee+Math.floor((n-s.knee)/2)):capChannel(k,n);
}
export function innateResolution(){
 return p.entries.flatMap(x=>x.innates.map(i=>{
  const rule=semanticPolicy[i.stat],channel=i.canonicalChannel??rule?.channel;
  if(!channel||!allChannels.has(channel)||rule&&rule.sourceUnit!==i.unit)fail('innate_source');
  const unit=allChannels.get(channel);
  if(i.unit!==unit&&!rule?.requiresReauthor)fail('unit');
  return {itemId:x.itemId,sourceStat:i.stat,sourceUnit:i.unit,sourceCentipercent:i.centipercent,
   candidateChannel:channel,candidateUnit:unit,candidateCentipercent:i.centipercent,
   status:i.canonicalChannel?'EXACT_SHARED_SOURCE_CHANNEL':'PROPOSED_EXPLICIT_SEMANTIC_CHANGE',
   requiresReauthor:!!rule?.requiresReauthor,requiresScopeApproval:!!rule?.requiresScopeApproval,...deny};
 }));
}
export function validateAuthoring(){
 const source=new Map(p.sets.map(x=>[x.setId,x])),traits=new Map(p.entries.filter(x=>x.trait).map(x=>[x.itemId,x.trait])),sets=new Map(m.sets.map(x=>[x.setId,x]));
 if(authoring.sets.length!==95||new Set(authoring.sets.map(s=>s.setId)).size!==95)fail('set_count');
 let typed=0,preserved=0;
 for(const s of authoring.sets){
  const old=sets.get(s.setId);
  if(!old||JSON.stringify(old.memberIds)!==JSON.stringify(s.memberIds)||JSON.stringify(old.reconciliation.thresholds)!==JSON.stringify(s.milestones.map(x=>x.pieces)))fail('membership');
  for(const e of s.milestones){
   if(e.sourceEffect){
    const prior=source.get(s.setId)?.bonuses.find(b=>b.pieces===e.pieces);
    if(!prior||JSON.stringify(prior)!==JSON.stringify(e.sourceEffect)||!e.requiresTypedEventAndUnitReview)fail('source_changed');
    preserved++;continue;
   }
   typed++;
   if(!Number.isFinite(e.value)||e.value<=0||e.pieces>s.memberIds.length)fail('value');
   if(e.kind==='permanent_stat'&&allChannels.get(e.channel)!==e.unit)fail('passive_unit');
   if(e.kind==='conditional'&&(!e.trigger||!e.effect||!e.target||e.internalCooldownSeconds<=0||e.durationSeconds<0||e.durationSeconds>e.internalCooldownSeconds||e.charges&&e.charges!==1))fail('conditional');
  }
 }
 if(authoring.traits.length!==27||new Set(authoring.traits.map(t=>t.itemId)).size!==27)fail('traits');
 for(const t of authoring.traits){
  if(JSON.stringify(traits.get(t.itemId))!==JSON.stringify(t.sourceTrait)||t.sourceTrait.cd!==t.internalCooldownSeconds||!t.perOwnerCooldown||!t.sharedTraitFamily)fail('trait_source');
 }
 return {sets:authoring.sets.length,milestones:typed+preserved,typed,preserved,traits:authoring.traits.length,...deny};
}
// Pure illustrative set reachability; membership is not a custody or equip receipt.
export function reachedMilestones(pieceIds){
 const all=new Set(profiles().map(x=>x.itemId));
 if(new Set(pieceIds).size!==pieceIds.length||pieceIds.some(id=>!all.has(id)))fail('invalid_piece_identity');
 const selected=new Set(pieceIds);
 return authoring.sets.flatMap(s=>{
  const count=s.memberIds.filter(id=>selected.has(id)).length;
  return s.milestones.filter(e=>e.pieces<=count).map(e=>({setId:s.setId,...e,...deny}));
 });
}
// Candidate static index includes only exact or explicitly modeled proposed permanent channels.
// Conditional effects require measured marginal encounter outcomes; never price duration alone as damage.
export function permanentCandidate({classId,tier,grade='rare',quality=50,pieceIds=null,includeProposedSemantics=false}){
 const f=inspectPower({classId,tier,grade,quality});
 const raw=new Map(f.channels.map(x=>[x.channel,x.rawCentipercent]));
 const l=d.loadouts.find(x=>x.classId===classId&&x.tier===tier),byId=new Map(profiles().map(x=>[x.itemId,x]));
 const chosen=pieceIds??l.itemIds,original=l.itemIds.map(id=>byId.get(id));
 if(!Array.isArray(chosen)||chosen.length!==original.length||new Set(chosen).size!==chosen.length)fail('fixture_slots');
 const selected=chosen.map(id=>byId.get(id));
 if(selected.some(x=>!x||x.tier!==tier||(x.classId&&x.classId!==classId))||new Set(selected.map(x=>x.slot)).size!==selected.length)fail('fixture_items');
 let base=f.base;
 for(const x of selected){const prior=original.find(z=>z.slot===x.slot);if(!prior||x.slot==='weapon'&&x.hands!==prior.hands)fail('fixture_hands');base+=basePreview(x,grade,quality).base-basePreview(prior,grade,quality).base;}
 const reached=reachedMilestones(chosen),unpriced=[];
 for(const i of innateResolution().filter(x=>chosen.includes(x.itemId))){if(i.status!=='EXACT_SHARED_SOURCE_CHANNEL'&&!includeProposedSemantics){unpriced.push(i.itemId+':'+i.sourceStat);continue;}raw.set(i.candidateChannel,(raw.get(i.candidateChannel)??0)+i.candidateCentipercent);}
 for(const e of reached){
  if(e.kind==='permanent_stat'){
   if((e.channel==='attack_pct'||e.channel==='evasion_pp')&&!includeProposedSemantics){unpriced.push(e.setId+':'+e.pieces);continue;}
   raw.set(e.channel,(raw.get(e.channel)??0)+Math.round(e.value*100));
  }else unpriced.push(e.setId+':'+e.pieces);
 }
 const channels=[...raw].map(([channel,value])=>({channel,rawCentipercent:value,effectiveCentipercent:cap(channel,value)}));
 const partial=round(base*(1+channels.reduce((n,c)=>n+c.effectiveCentipercent/10000*weights[c.channel],0)));
 return {classId,tier,base:round(base),baseline:f.partialPower,partialPermanentIndex:partial,channels,reachedCount:reached.length,
  unpricedEffects:unpriced,unpricedDomains:['conditional_sets','signature_traits','gems','skills','companions','class_progression','temporary_effects','actual_item_custody'],completePlayerCp:null,...deny};
}
// Proposed experiment matrix, not engine results. Real matched source receipts required.
export function combatExperimentPlan(){
 const bosses=['BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR','BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'];
 const rows=[];
 for(const classId of Object.keys(d.classes))for(const specializationIndex of [0,1])for(const bossId of bosses)
 for(const strategy of ['generic','targeted','alternative'])for(const gearVariant of ['baseline','set_candidate','trait_candidate'])
 rows.push({classId,specializationIndex,bossId,strategy,gearVariant,requiresVerifiedSource:true,holdSeedAndBaseStatsConstant:true,sourceReceiptRequired:true,
   metrics:['victory','duration_ms','damage','damage_taken','healing','shield_absorbed','interrupts','effect_activations','overheal','survival'],executed:false,...deny});
 return rows;
}
export function summary(){
 const v=validateAuthoring(),innates=innateResolution(),plan=combatExperimentPlan();
 return {...v,innates:innates.length,semanticChanges:innates.filter(x=>x.status==='PROPOSED_EXPLICIT_SEMANTIC_CHANGE').length,
  explicitHasteReauthor:innates.filter(x=>x.requiresReauthor).length,plannedEncounters:plan.length,executedNewEncounters:0,completePlayerCp:null,...deny};
}
