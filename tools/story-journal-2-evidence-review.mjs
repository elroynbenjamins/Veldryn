/** Non-authorizing reference projection. Inputs are synthetic trusted-port fixtures,
 * NOT client parameters or verified production records. No rewards or persistence. */
import {validateStoryBook} from './story-journal-2-review.mjs';
const string = v => typeof v === 'string' && v.length>0;
const natural = v => Number.isSafeInteger(v) && v>=0;
const unique = xs => Array.isArray(xs) && xs.every(string) && new Set(xs).size===xs.length;
const denied = reason => ({status:'unavailable',reason,released:false,authorizesReward:false,authorizesAccess:false});
function context(s,expected) {
  if (!s || !expected || !string(expected.accountId)||!string(expected.characterId)||
      s.accountId!==expected.accountId||s.characterId!==expected.characterId||
      !natural(s.sequence)||!natural(s.level)||!natural(s.equippedCount)||
      !unique(s.actualAccountMaps)||!unique(s.retainedCharacterRoutes)||!unique(s.soloBossVictories)||
      !unique(s.claimedLegacyIds)||!unique(s.claimedStoryIds)||!s.activationSequences||
      !Array.isArray(s.events)) return false;
  return true;
}
function checkedEvents(s) {
  const dedup=new Map();
  for (const e of s.events) {
    if (!e || e.accountId!==s.accountId || e.characterId!==s.characterId) continue;
    if (e.status!=='settled') continue;
    if (!string(e.receiptId)||!natural(e.sequence)||e.sequence>s.sequence||!string(e.targetId)||
        !['kill','gather'].includes(e.kind)||!natural(e.quantity)||e.quantity===0) throw Error('invalid_settlement');
    if(e.kind==='gather'&&!string(e.skillId))throw Error('invalid_gather_skill');
    const fingerprint=JSON.stringify([e.sequence,e.kind,e.targetId,e.quantity,e.skillId??null]);
    const old=dedup.get(e.receiptId);
    if(old && old.fingerprint!==fingerprint)throw Error('conflicting_receipt');
    if(!old)dedup.set(e.receiptId,{fingerprint,event:e});
  }
  return [...dedup.values()].map(x=>x.event);
}
function count(events,activation,o) {
  if (!natural(activation)) return 0;
  let total=0;
  for (const e of events) if(e.sequence>activation&&e.kind===o.kind&&e.targetId===o.targetId&&(o.kind!=='gather'||e.skillId===o.skillId)) {
    total=Math.min(o.required,total+Math.min(o.required,e.quantity));
  }
  return total;
}
function objective(s,events,activation,o) {
  let n=0;
  switch(o.kind){
    case 'kill':case 'gather':n=count(events,activation,o);break;
    case 'map':n=s.actualAccountMaps.includes(o.targetId)&&(o.mapScope!=='character'||(unique(s.characterDiscoveredRoutes)&&s.characterDiscoveredRoutes.includes(o.targetId)))?1:0;break;
    case 'boss':n=s.soloBossVictories.includes(o.targetId)?1:0;break;
    case 'equipped':n=s.equippedCount;break;
    case 'level':n=s.level;break;
    default:throw Error('unknown_objective');
  }
  return {id:o.id??'1',kind:o.kind,targetId:o.targetId,progress:Math.min(o.required,n),required:o.required,complete:n>=o.required};
}
export function projectStoryReview(book,s,expected) {
  try {
    validateStoryBook(book);
    if (!context(s,expected)) return denied('missing_or_foreign_snapshot');
    if(book.entryRequirement){
      const entry=s.bookAccess?.[book.regionId];
      if(!entry||entry.accountId!==s.accountId||entry.characterId!==s.characterId||entry.previousFinale!==book.entryRequirement.previousFinale||entry.previousFinaleClaimed!==true||entry.characterAccess!==true)return denied('regional_entry_not_verified');
    }
    const events=checkedEvents(s);
    const claimed=new Set(book.quests.filter(q=>(q.legacyQuestId!==undefined&&s.claimedLegacyIds.includes(q.legacyQuestId))||s.claimedStoryIds.includes(q.id)).map(q=>q.id));
    const quests=book.quests.map(q=>{
      const migrated=q.legacyQuestId!==undefined&&s.claimedLegacyIds.includes(q.legacyQuestId);
      const activation=Object.hasOwn(s.activationSequences,q.id)?s.activationSequences[q.id]:undefined;
      if(activation!==undefined&&(!natural(activation)||activation>s.sequence))throw Error('invalid_activation');
      const progress=q.objectives.map(o=>objective(s,events,activation,o));
      const missing=q.prerequisites.filter(key=>!claimed.has(key));
      const status=claimed.has(q.id)?'claimed':missing.length?'locked':activation===undefined?'available':progress.every(x=>x.complete)?'ready':'active';
      return {id:q.id,legacyQuestId:q.legacyQuestId,status,migrated,missingPrerequisites:missing,objectives:progress,authorizesReward:false};
    });
    const finale=book.finale?{id:book.finale.id,status:'unavailable',reason:'solo_boss_binding_pending',authorizesReward:false}:undefined;
    return {status:'review',quests,...(finale?{finale}:{}),released:false,authorizesReward:false,authorizesAccess:false};
  } catch(e){return denied(e.message);}
}
export function projectSideReview(content,s,expected) {
  try{
    if(content?.released!==false||!context(s,expected))return denied('missing_or_foreign_snapshot');
    const events=checkedEvents(s);
    const ids=new Set();
    const quests=content.quests.map(q=>{
      if(q.released!==false||q.rewardPolicy!=='unapproved'||ids.has(q.id)||!string(q.id)||!natural(q.objective.required)||q.objective.required===0||!['kill','gather','map'].includes(q.objective.kind))throw Error('invalid_side_quest');
      ids.add(q.id);
      if(q.scope!==(q.objective.kind==='map'?'account':'character'))throw Error('wrong_scope');
      const activation=Object.hasOwn(s.activationSequences,q.id)?s.activationSequences[q.id]:undefined;
      if(activation!==undefined&&(!natural(activation)||activation>s.sequence))throw Error('invalid_activation');
      const progress=objective(s,events,activation,q.objective);
      const evidenceOnly=q.scope==='account'&&q.objective.kind==='map';
      const claimed=!evidenceOnly&&s.claimedStoryIds.includes(q.id);
      return {id:q.id,scope:q.scope,status:claimed||evidenceOnly&&progress.complete?'claimed':activation===undefined?'available':progress.complete?'ready':'active',...(evidenceOnly?{completionMode:'evidence_only'}:{}),objective:progress,authorizesReward:false};
    });
    const lore=content.lore.filter(l=>l.released===false&&l.rewardPolicy==='none'&&s.actualAccountMaps.includes(l.routeId)).map(l=>({id:l.id,title:l.title,text:l.text}));
    return {status:'review',quests,lore,released:false,authorizesReward:false,authorizesAccess:false};
  }catch(e){return denied(e.message);}
}
