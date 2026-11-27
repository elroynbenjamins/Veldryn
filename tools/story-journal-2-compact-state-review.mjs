/** Hidden bounded quest-state projection. Storage port is deliberately not registered.
 * Account revision is serialized by the existing gameplay writer. No raw event
 * history in this state; durable gameplay request receipts remain the replay fence.
 */
const flags={released:false,persisted:false,authorizesReward:false,authorizesAccess:false};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const natural=x=>Number.isSafeInteger(x)&&x>=0;
const reject=reason=>({...flags,status:'rejected',reason});
const own=(x,k)=>Object.hasOwn(x,k);
const supported=new Set(['kill','gather']);
function definitions(catalogue){
 if(!catalogue||catalogue.released!==false||!id(catalogue.version)||!Array.isArray(catalogue.quests))throw Error('invalid_catalogue');
 const out=new Map();
 for(const q of catalogue.quests){
  if(!id(q.id)||out.has(q.id)||!['character','account'].includes(q.scope)||!Array.isArray(q.objectives)||!q.objectives.length||!Array.isArray(q.prerequisites)||q.released!==false)throw Error('invalid_quest');
  const seen=new Set();
  for(const o of q.objectives){
   if(!id(o.id)||seen.has(o.id)||!id(o.targetId)||!natural(o.required)||o.required===0||!['kill','gather','map','boss','level','equipped'].includes(o.kind)||o.kind==='gather'&&!id(o.skillId))throw Error('invalid_objective');
   seen.add(o.id);
  }
  out.set(q.id,q);
 }
 for(const q of out.values())for(const p of q.prerequisites)if(!out.has(p)||p===q.id)throw Error('invalid_prerequisite');
 return out;
}
function validateState(state,defs,catalogue,expected){
 if(!state||!expected||!id(expected.accountId)||state.accountId!==expected.accountId||state.catalogueVersion!==catalogue.version||!natural(state.revision)||!Array.isArray(state.characters))throw Error('invalid_state');
 const seen=new Set();
 for(const c of state.characters){
  if(!id(c.characterId)||seen.has(c.characterId)||!['legacy_continuation','legacy_completed','fresh_v2_candidate'].includes(c.migrationLane)||!Array.isArray(c.quests))throw Error('invalid_character');
  seen.add(c.characterId);
  const quests=new Set();
  for(const row of c.quests){
   const def=defs.get(row.questId);
   if(!def||def.scope!=='character'||quests.has(row.questId)||!natural(row.activatedRevision)||row.activatedRevision>state.revision||!['active','claimed'].includes(row.status)||!row.counters||typeof row.counters!=='object'||Array.isArray(row.counters))throw Error('invalid_quest_state');
   quests.add(row.questId);
   const counters=def.objectives.filter(o=>supported.has(o.kind));
   if(Object.keys(row.counters).length!==counters.length||counters.some(o=>!own(row.counters,o.id)||!natural(row.counters[o.id])||row.counters[o.id]>o.required))throw Error('invalid_counter');
  }
 }
}
function nextState(state,characterId,quests,revision){return {...state,revision,characters:state.characters.map(c=>c.characterId===characterId?{...c,quests}:c)};}
/** Accept an objective only from the locked account, never from client progress. */
export function activateQuestStateReview({state,catalogue,expected,questId,expectedRevision,verifiedEligibility}){
 try{
  const defs=definitions(catalogue);validateState(state,defs,catalogue,expected);
  if(state.revision!==expectedRevision||!natural(state.revision+1))return reject('stale_revision');
  const c=state.characters.find(c=>c.characterId===expected.characterId),q=defs.get(questId);
  if(!c||!q||q.scope!=='character'||q.pendingBinding)return reject('unavailable_quest');
  if(q.regionId==='ASTERFALL'&&q.kind==='story'&&c.migrationLane!=='fresh_v2_candidate')return reject('legacy_lane');
  if(c.quests.some(r=>r.questId===questId))return reject('already_activated');
  if(q.prerequisites.some(p=>!c.quests.some(r=>r.questId===p&&r.status==='claimed')))return reject('prerequisite');
  if(verifiedEligibility?.accountId!==expected.accountId||verifiedEligibility?.characterId!==expected.characterId||verifiedEligibility?.questId!==questId||verifiedEligibility?.revision!==state.revision||verifiedEligibility?.allowed!==true)return reject('unverified_eligibility');
  const revision=state.revision+1,row={questId,status:'active',activatedRevision:revision,counters:Object.fromEntries(q.objectives.filter(o=>supported.has(o.kind)).map(o=>[o.id,0]))};
  return {...flags,status:'proposed',state:nextState(state,c.characterId,[...c.quests,row],revision)};
 }catch(e){return reject(e.message);}
}
/** Consume an already verified account-commit proposal. Bounded counters per objective. */
export function applyQuestEvidenceReview({state,catalogue,expected,commit}){
 try{
  const defs=definitions(catalogue);validateState(state,defs,catalogue,expected);
  if(commit?.accountId!==expected.accountId||commit.previousRevision!==state.revision||commit.committedRevision!==state.revision+1||!natural(commit.committedRevision)||!id(commit.requestId)||!id(commit.sourceCharacterId)||!Array.isArray(commit.events))return reject('invalid_or_stale_commit');
  const c=state.characters.find(c=>c.characterId===commit.sourceCharacterId);
  if(!c&&commit.events.length)return reject('unknown_source_character');
  for(const [i,e] of commit.events.entries()){
   if(e.accountId!==expected.accountId||e.characterId!==commit.sourceCharacterId||e.sequence!==commit.committedRevision||e.receiptId!==commit.requestId+':'+i||e.status!=='settled'||!supported.has(e.kind)||!id(e.targetId)||!natural(e.quantity)||e.quantity===0||e.kind==='gather'&&!id(e.skillId))return reject('invalid_evidence');
  }
  if(!c)return {...flags,status:'proposed',state:{...state,revision:commit.committedRevision}};
  const quests=c.quests.map(row=>{
   if(row.status!=='active'||row.activatedRevision>=commit.committedRevision)return row;
   const def=defs.get(row.questId),counters={...row.counters};
   for(const o of def.objectives.filter(o=>supported.has(o.kind))){
    for(const e of commit.events)if(e.kind===o.kind&&e.targetId===o.targetId&&(e.kind!=='gather'||e.skillId===o.skillId))counters[o.id]+=Math.min(o.required-counters[o.id],e.quantity);
   }
   return {...row,counters};
  });
  return {...flags,status:'proposed',state:nextState(state,c.characterId,quests,commit.committedRevision)};
 }catch(e){return reject(e.message);}
}
/** Render current settled counters; verified map/boss/level/equip facts stay in owner snapshots. */
export function compactQuestCountersReview({state,catalogue,expected}){
 try{
  const defs=definitions(catalogue);validateState(state,defs,catalogue,expected);
  const c=state.characters.find(c=>c.characterId===expected.characterId);
  if(!c)return reject('unknown_character');
  return {...flags,status:'review',accountId:expected.accountId,characterId:expected.characterId,sequence:state.revision,rows:c.quests.map(r=>({...r,counters:{...r.counters}}))};
 }catch(e){return reject(e.message);}
}

/** Verified fact objectives are supplied by their authoritative owners at the same
 * locked account revision. Retained access cannot be substituted for discovery. */
export function projectCompactQuestReview({state,catalogue,expected,facts}){
 try{
  const defs=definitions(catalogue);validateState(state,defs,catalogue,expected);
  const c=state.characters.find(c=>c.characterId===expected.characterId);
  if(!c||facts?.accountId!==expected.accountId||facts?.characterId!==expected.characterId||facts?.revision!==state.revision||!natural(facts.level)||!natural(facts.equippedCount)||!['actualAccountMaps','characterDiscoveredRoutes','soloBossVictories'].every(k=>Array.isArray(facts[k])&&facts[k].every(id)))return reject('unverified_facts');
  const rows=c.quests.map(row=>{
   const def=defs.get(row.questId);
   const objectives=def.objectives.map(o=>{
    let n=0;
    if(supported.has(o.kind))n=row.counters[o.id];
    else if(o.kind==='map')n=facts.actualAccountMaps.includes(o.targetId)&&(o.mapScope!=='character'||facts.characterDiscoveredRoutes.includes(o.targetId))?1:0;
    else if(o.kind==='boss')n=facts.soloBossVictories.includes(o.targetId)?1:0;
    else if(o.kind==='level')n=facts.level;
    else if(o.kind==='equipped')n=facts.equippedCount;
    return {id:o.id,kind:o.kind,targetId:o.targetId,required:o.required,progress:Math.min(n,o.required),complete:n>=o.required};
   });
   return {id:row.questId,status:row.status==='claimed'?'claimed':objectives.every(o=>o.complete)?'ready':'active',objectives};
  });
  return {...flags,status:'review',accountId:expected.accountId,characterId:expected.characterId,sequence:state.revision,rows};
 }catch(e){return reject(e.message);}
}
/** A state/entitlement proposal only. The caller must commit it with the reward
 * bundle, wallet/inventory and existing account request receipt in one transaction. */
export function prepareCompactQuestClaimReview({state,catalogue,expected,facts,questId,expectedRevision,policy}){
 const projection=projectCompactQuestReview({state,catalogue,expected,facts});
 if(projection.status!=='review')return projection;
 if(expectedRevision!==state.revision||!natural(state.revision+1))return reject('stale_revision');
 const c=state.characters.find(c=>c.characterId===expected.characterId),q=catalogue.quests.find(q=>q.id===questId);
 if(!q||q.pendingBinding||q.scope!=='character')return reject('unavailable_quest');
 if(q.regionId==='ASTERFALL'&&q.kind==='story'&&c.migrationLane!=='fresh_v2_candidate')return reject('legacy_lane');
 const row=projection.rows.find(r=>r.id===questId);
 if(row?.status==='claimed')return reject('already_claimed');
 if(row?.status!=='ready'||q.prerequisites.some(p=>!c.quests.some(r=>r.questId===p&&r.status==='claimed')))return reject('not_ready');
 if(policy?.mode!=='synthetic_review'||policy.released!==false||!id(policy.version)||!Array.isArray(policy.rewards))return reject('reward_policy_unavailable');
 const matches=policy.rewards.filter(r=>r.questId===questId);
 if(matches.length!==1||!natural(matches[0].gold))return reject('reward_policy_unavailable');
 const revision=state.revision+1,proposed=nextState(state,c.characterId,c.quests.map(r=>r.questId===questId?{...r,status:'claimed'}:r),revision);
 return {...flags,status:'proposed',state:proposed,entitlement:{accountId:expected.accountId,characterId:expected.characterId,questId,policyVersion:policy.version,revision},candidateGold:matches[0].gold};
}
