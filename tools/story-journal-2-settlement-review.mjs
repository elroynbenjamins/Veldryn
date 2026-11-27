/** Review-only reward pacing. No minting, payouts, economy changes or final approved amounts. */
const flags={released:false,authorizesReward:false};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function rewardPacingReview(book,legacyRewards){
 if(book?.released!==false||!Array.isArray(book.quests)||!Array.isArray(legacyRewards))return {...flags,status:'unavailable'};
 const old=legacyRewards.map(r=>r.gold);
 if(legacyRewards.length!==15||new Set(legacyRewards.map(r=>r.id)).size!==15||old.some(n=>!integer(n)||n===0))return {...flags,status:'unavailable'};
 const budget=old.reduce((a,b)=>a+b,0);
 if(!integer(budget))return {...flags,status:'unavailable'};
 // Preserve the full legacy Asterfall gold envelope, but smooth it by NEW story order.
 // Only applicable to fresh V2 journeys; historical entitlements keep original quest identities.
 if(book.regionId!=='ASTERFALL')return {...flags,status:'unavailable',reason:'regional_economy_unapproved'};
 const sorted=[...old].sort((a,b)=>a-b);
 if(book.quests.length!==sorted.length||new Set(book.quests.map(q=>q.id)).size!==sorted.length)return {...flags,status:'unavailable'};
 const rows=book.quests.map((q,i)=>({questId:q.id,legacyQuestId:q.legacyQuestId,candidateGold:sorted[i],materialPolicy:'canonical_source_review',titleId:q.legacyQuestId==='QST_015'?'oathbreaker':null,...flags}));
 return {...flags,status:'review',legacyBudget:budget,candidateBudget:rows.reduce((n,r)=>n+r.candidateGold,0),rows};
}
/** Asterfall cutover model. In-flight legacy story stays on its original rules until
 * completion; do not silently remap partially earned objectives or reorder rewards.
 * A real server transaction must persist the chosen lane before admitting V2 claims. */
export function legacyStoryMigrationReview(book,snapshot,expected){
 const deny=reason=>({...flags,status:'unavailable',reason,authorizesAccess:false});
 if(book?.regionId!=='ASTERFALL'||book.released!==false||!snapshot||!expected||
   typeof expected.accountId!=='string'||!expected.accountId||typeof expected.characterId!=='string'||!expected.characterId||
   snapshot.accountId!==expected.accountId||snapshot.characterId!==expected.characterId||
   !Array.isArray(snapshot.legacyQuests)||typeof snapshot.legacyStateComplete!=='boolean'||snapshot.legacyStateComplete!==true)return deny('unverified_legacy_state');
 const ids=book.quests.map(q=>q.legacyQuestId);
 if(ids.length!==15||new Set(ids).size!==15)return deny('invalid_mapping');
 const byId=new Map();
 for(const q of snapshot.legacyQuests){
  if(!ids.includes(q.id)||byId.has(q.id)||!['locked','active','complete','claimed'].includes(q.status)||!integer(q.progress))return deny('invalid_legacy_quest');
  byId.set(q.id,q);
 }
 if(byId.size!==ids.length)return deny('missing_legacy_rows');
 const rows=ids.map(id=>byId.get(id));
 const claimed=rows.filter(q=>q.status==='claimed');
 const pending=rows.filter(q=>q.status==='complete');
 const started=rows.some(q=>q.status==='claimed'||q.status==='complete'||q.progress>0)||snapshot.legacyJourneyStarted===true;
 const allClaimed=claimed.length===ids.length;
 const lane=allClaimed?'legacy_completed':started?'legacy_continuation':'fresh_v2_candidate';
 // Never grant new rewards or new access from this projection, including old completed rows.
 return {...flags,status:'review',lane,authorizesAccess:false,legacyClaimIds:pending.map(q=>q.id),preservedRows:rows.map(q=>({...q})),
  mappedClaimedStoryIds:book.quests.filter(q=>byId.get(q.legacyQuestId).status==='claimed').map(q=>q.id),
  blocksV2AsterfallClaims:lane!=='fresh_v2_candidate',requiresAtomicLaneRecord:true,
  preservesExistingTitle:true,preservesExistingDiscovery:true};
}
export function pinnedQuestTrackerReview(model,context,expected){
 const hidden=()=>({...flags,status:'hidden'});
 if(!model||model.status!=='review'||model.accountId!==expected?.accountId||model.characterId!==expected?.characterId||!context||!expected||context.accountId!==expected.accountId||context.characterId!==expected.characterId||!expected.accountId||!expected.characterId)return hidden();
 if(!['Home','World','Skills','Inventory','Character'].includes(context.screen)||context.modalOpen||context.inDungeon||context.inBossFight||context.tutorialVisible||context.activityControlsObscured)return hidden();
 const pinned=model.pinned;
 if(!pinned||!['active','ready'].includes(pinned.status))return hidden();
 const next=pinned.objectives?.find(o=>!o.complete);
 if(pinned.status==='active'&&!next)return hidden();
 return {...flags,status:'visible',questId:pinned.id,title:pinned.title,objective:pinned.status==='ready'?null:next,
   label:pinned.status==='ready'?'Reward ready':'View quest',
   destination:{screen:'Journal',tab:pinned.tab,questId:pinned.id,accountId:expected.accountId,characterId:expected.characterId},
   authorizesAccess:false};
}
