/** Consolidated hidden review path: authored books -> compact state -> Journal view.
 * Older event-list projections remain regression oracles only. No live imports or writes. */
import {validateStoryBook} from './story-journal-2-review.mjs';
import {projectCompactQuestReview,activateQuestStateReview,prepareCompactQuestClaimReview} from './story-journal-2-compact-state-review.mjs';
import {journalNavigationReview} from './story-journal-2-navigation-review.mjs';
const regions=['ASTERFALL','SUNSCAR','FROSTMARCH'];
const flags={released:false,persisted:false,authorizesReward:false,authorizesAccess:false};
const reject=reason=>({...flags,status:'unavailable',reason});
export function compileJournalCatalogueReview(books,sides){
 if(!Array.isArray(books)||!Array.isArray(sides)||books.length!==3||sides.length!==3)throw Error('invalid_regions');
 const quests=[],ids=new Set(),pendingFinales=[],regionBooks=[];
 for(const regionId of regions){
  const b=books.find(b=>b.regionId===regionId),s=sides.find(s=>s.regionId===regionId);
  validateStoryBook(b);
  if(!s||s.released!==false||!Array.isArray(s.quests)||!Array.isArray(s.lore))throw Error('invalid_side_catalogue');
  if(b.finale){
   if(b.finale.bindingStatus!=='pending_authoritative_solo_boss_id'||b.finale.released!==false||ids.has(b.finale.id)||b.quests.some(q=>q.id===b.finale.id))throw Error('invalid_pending_finale');
   ids.add(b.finale.id);pendingFinales.push({regionId,id:b.finale.id});
  }
  for(const q of b.quests){
   if(ids.has(q.id))throw Error('duplicate_quest');ids.add(q.id);
   quests.push({...q,scope:'character',kind:'story'});
  }
  for(const q of s.quests){
   if(ids.has(q.id)||q.released!==false||q.rewardPolicy!=='unapproved'||q.regionId!==regionId||!b.zones.some(z=>z.zoneId===q.narrativeZoneId)||q.scope!==(q.objective.kind==='map'?'account':'character')||!Array.isArray(q.prerequisites)||q.prerequisites.length)throw Error('invalid_side_quest');
   ids.add(q.id);quests.push({...q,kind:'side',objectives:[{...q.objective,id:q.objective.id??'1'}]});
  }
  regionBooks.push({regionId,entryRequirement:b.entryRequirement??null,finaleId:b.finale?.id??b.quests.at(-1).id});
 }
 // Pending boss placeholders are never executable definitions.
 return {...flags,version:'story-journal-catalogue-review-v1',quests,pendingFinales,regionBooks};
}
function scopedFacts(state,expected,facts){
 return facts?.accountId===expected?.accountId&&facts?.characterId===expected?.characterId&&facts?.revision===state?.revision;
}
function hasEntry(catalogue,state,expected,facts,regionId){
 if(!scopedFacts(state,expected,facts))return false;
 if(regionId==='ASTERFALL')return true;
 const b=catalogue.regionBooks.find(b=>b.regionId===regionId),entry=b?.entryRequirement,e=facts.bookAccess?.[regionId];
 if(!entry||!e||e.previousFinale!==entry.previousFinale||e.characterAccess!==true||e.accountId!==expected.accountId||e.characterId!==expected.characterId||e.revision!==state.revision)return false;
 // A placeholder cannot be promoted by an optimistic access boolean.
 if(catalogue.pendingFinales.some(p=>p.id===entry.previousFinale))return false;
 const c=state.characters.find(c=>c.characterId===expected.characterId);
 return !!c&&(c.quests.some(q=>q.questId===entry.previousFinale&&q.status==='claimed')||
   (entry.previousBook==='ASTERFALL'&&c.migrationLane==='legacy_completed'&&catalogue.quests.filter(q=>q.regionId==='ASTERFALL'&&q.kind==='story').every(q=>facts.claimedLegacyIds?.includes(q.legacyQuestId))));
}
export function journalCompactProgressReview({book,side,catalogue,state,expected,facts}){
 const projected=projectCompactQuestReview({state,catalogue,expected,facts});
 if(projected.status!=='review')return reject(projected.reason);
 const c=state.characters.find(c=>c.characterId===expected.characterId),entry=hasEntry(catalogue,state,expected,facts,book.regionId);
 if(book.regionId==='ASTERFALL'&&c.migrationLane==='legacy_continuation')return reject('legacy_continuation_use_existing_journal');
 const prior=new Map(projected.rows.map(r=>[r.id,r]));
 const legacyComplete=book.regionId==='ASTERFALL'&&c.migrationLane==='legacy_completed';
 if(legacyComplete&&!book.quests.every(q=>facts.claimedLegacyIds?.includes(q.legacyQuestId)))return reject('unverified_legacy_completion');
 const claimed=new Set(book.quests.filter(q=>legacyComplete||prior.get(q.id)?.status==='claimed').map(q=>q.id));
 const objective=o=>{const n=o.kind==='map'?Number(facts.actualAccountMaps.includes(o.targetId)&&(o.mapScope!=='character'||facts.characterDiscoveredRoutes.includes(o.targetId))):o.kind==='boss'?Number(facts.soloBossVictories.includes(o.targetId)):o.kind==='level'?facts.level:o.kind==='equipped'?facts.equippedCount:0;return {id:o.id??'1',kind:o.kind,targetId:o.targetId,required:o.required,progress:Math.min(n,o.required),complete:n>=o.required};};
 const story=book.quests.map(q=>{
  const missing=q.prerequisites.filter(p=>!claimed.has(p)),p=prior.get(q.id);
  return {id:q.id,objectives:legacyComplete?q.objectives.map(o=>({...objective(o),progress:o.required,complete:true})):p?.objectives??q.objectives.map(objective),status:claimed.has(q.id)?'claimed':!entry||missing.length?'locked':p?.status??'available',missingPrerequisites:missing,migrated:legacyComplete};
 });
 const optional=side.quests.map(q=>{
  const p=prior.get(q.id),o=p?.objectives[0]??objective(q.objective);
  // Profession paths need their own eligibility and do not inherit combat story gates.
  return {id:q.id,objective:o,status:q.scope==='account'&&o.complete?'claimed':p?.status??'available'};
 });
 const lore=side.lore.filter(l=>facts.actualAccountMaps.includes(l.routeId)).map(l=>({id:l.id,title:l.title,text:l.text}));
 const finale=book.finale?{id:book.finale.id,status:'unavailable',reason:'solo_boss_binding_pending'}:undefined;
 return {...flags,status:'review',accountId:expected.accountId,characterId:expected.characterId,sequence:state.revision,storyProgress:{status:'review',quests:story,...(finale?{finale}:{})},sideProgress:{status:'review',quests:optional,lore},entry};
}
export function journalCompactViewReview(input){
 if(input.context?.accountId!==input.expected?.accountId||input.context?.characterId!==input.expected?.characterId)return reject('foreign_navigation_context');
 const p=journalCompactProgressReview(input);if(p.status!=='review')return p;
 return journalNavigationReview({...input,storyProgress:p.storyProgress,sideProgress:p.sideProgress});
}
export function activateCatalogueQuestReview(input){
 const q=input.catalogue?.quests.find(q=>q.id===input.questId);
 if(!q||q.kind==='story'&&!hasEntry(input.catalogue,input.state,input.expected,input.facts,q.regionId))return reject('regional_entry_not_verified');
 return activateQuestStateReview(input);
}
export function claimCatalogueQuestReview(input){
 const q=input.catalogue?.quests.find(q=>q.id===input.questId);
 if(!q||q.kind==='story'&&!hasEntry(input.catalogue,input.state,input.expected,input.facts,q.regionId))return reject('regional_entry_not_verified');
 return prepareCompactQuestClaimReview(input);
}
