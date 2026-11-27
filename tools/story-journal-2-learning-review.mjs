/** Hidden review-only read models. No rewards, persistence or game commands. */
const nonempty=v=>typeof v==='string'&&v.length>0;
const scoped=(s,e)=>!!s&&!!e&&nonempty(e.accountId)&&nonempty(e.characterId)&&s.accountId===e.accountId&&s.characterId===e.characterId;
const flags={released:false,authorizesAccess:false,authorizesReward:false};
const validLevel=n=>Number.isSafeInteger(n)&&n>=1;
export function professionPathsReview(catalogue,snapshot,expected,regionId){
 if(catalogue?.released!==false||!scoped(snapshot,expected)||!Array.isArray(catalogue.paths))return {...flags,status:'unavailable'};
 const paths=catalogue.paths.flatMap(p=>{
  const region=p.regions.find(r=>r.regionId===regionId);
  if(!region||p.released!==false||p.rewardPolicy!=='none')return [];
  const evidence=p.scope==='account'?snapshot.accountSkills?.[p.skillId]:snapshot.characterSkills?.[p.skillId];
  const level=evidence?.level, known=validLevel(level);
  const access=snapshot.activityAccess?.[p.skillId];
  const accessKnown=access&&['allowed','blocked'].includes(access.status);
  return [{id:p.id,skillId:p.skillId,title:p.title,scope:p.scope,level:known?level:null,
   milestones:p.milestones.map(m=>({...m,complete:known&&level>=m.skillLevel})),
   hint:p.steps[known&&level>=2?1:0],
   primary:accessKnown?{label:access.status==='allowed'?'Open skill':'View requirements',destination:{screen:'Skills',skillId:p.skillId},...(access.status==='blocked'?{reason:access.reason??'Requirements not met.'}:{})}:{label:'View skill',destination:null},
   referenceTargetId:region.referenceTargetId??null,...flags}];
 });
 return {...flags,status:'review',paths};
}
/** A single contextual tip. The tutorial is never a mandatory objective. 
 * A trusted host supplies observed usage and quest facts; missing facts suppress guidance. */
export function onboardingTipReview(guide,snapshot,expected){
 if(guide?.released!==false||!scoped(snapshot,expected)||!Array.isArray(guide.steps)||!snapshot.questStates||!Array.isArray(snapshot.accountSeen)||!Array.isArray(snapshot.characterSeen)||!Array.isArray(snapshot.dismissed))return null;
 if(snapshot.modalOpen||snapshot.activityChanging||snapshot.storyRewardReady||snapshot.inDungeon||snapshot.inBossFight||snapshot.suppressTutorials)return null;
 const completed=new Set([...snapshot.accountSeen,...snapshot.characterSeen,...snapshot.dismissed]);
 // Already-used systems should not repeat on another character. Collection and report prompts are event-specific.
 const used=new Set(Array.isArray(snapshot.usedSystems)?snapshot.usedSystems:[]);
 for(const t of guide.steps)if(!['collection','scouting-report'].includes(t.system)&&used.has(t.system))completed.add(t.id);
 const bySystem=s=>guide.steps.find(t=>t.system===s&&!completed.has(t.id));
 const quest=t=>snapshot.questStates[t.legacyQuestId];
 const stepEligible=t=>t&&t.released===false&&t.optional===true&&t.body.trim().split(/\s+/).length<=guide.policy.maxBodyWords;
 const activity=snapshot.activity;
 let tip;
 if(activity?.kind==='combat'&&activity.targetId==='MOSS_RAT'&&activity.rewardReady===true&&quest(bySystem('collection')??{})==='active')tip=bySystem('collection');
 if(!tip&&activity?.rewardReady===true)return null;
 if(!tip){
  const report=bySystem('scouting-report');
  if(report&&quest(report)==='active'&&snapshot.ironwoodReportReady===true)tip=report;
 }
 if(!tip){
  for(const t of guide.steps){
   if(completed.has(t.id))continue;
   const state=quest(t);
   if(t.system==='companions'){if(state==='claimed'&&snapshot.companionAccess===true)tip=t;}
   else if(t.system==='collection'){continue;}
   else if(t.system==='scouting-report'){if(state==='active'&&snapshot.ironwoodReportReady===true)tip=t;}
   else if(t.system==='scouting'){if(state==='active'&&snapshot.scoutingAvailable===true)tip=t;}
   else if(t.system==='combat'){if(state==='active'&&snapshot.canStartHunt===true&&!activity)tip=t;}
   else if(t.system==='gathering'){if(state==='active'&&snapshot.gatheringAccess===true)tip=t;}
   else if(t.system==='equipment'){if(state==='active'&&snapshot.equipmentAccess===true)tip=t;}
   else if(t.system==='abilities'){if(state==='active'&&snapshot.abilitiesAccess===true)tip=t;}
   else if(t.system==='tier-transition'){if(state==='active'&&snapshot.tier2Access===true)tip=t;}
   if(tip)break;
  }
 }
 if(!stepEligible(tip))return null;
 return {...flags,id:tip.id,title:tip.title,body:tip.body,action:tip.action,system:tip.system,dismissible:true,opensAutomatically:false};
}
export function regionalSelectorReview(regions,context,preferences={}){
 if(!nonempty(context?.accountId)||!nonempty(context?.characterId)||!Array.isArray(regions))return {...flags,status:'unavailable',regions:[]};
 const allowed=new Set(['ASTERFALL','SUNSCAR','FROSTMARCH']);
 const seen=new Set(),rows=[];
 for(const r of regions){
  if(!allowed.has(r.regionId)||seen.has(r.regionId))continue;
  seen.add(r.regionId);
  if(r.accountId!==context.accountId||r.characterId!==context.characterId)continue;
  if(!Number.isSafeInteger(r.completed)||!Number.isSafeInteger(r.total)||r.completed<0||r.total<1||r.completed>r.total)continue;
  const accessible=r.storyAccess===true;
  rows.push({regionId:r.regionId,completed:r.completed,total:r.total,status:!accessible?'locked':r.completed===r.total&&r.finaleVerified===true?'completed':'available',selectable:true,canOpenStory:accessible});
 }
 const saved=scoped(preferences,context)?preferences.regionId:undefined;
 const selected=rows.find(r=>r.regionId===saved)??rows.find(r=>r.regionId===context.currentRegionId&&r.canOpenStory)??rows.find(r=>r.canOpenStory&&r.status!=='completed')??rows.find(r=>r.canOpenStory)??rows[0];
 return {...flags,status:'review',regions:rows,selectedRegionId:selected?.regionId??null};
}
