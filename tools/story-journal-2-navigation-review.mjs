/** Hidden navigation presentation only. No start, claim, travel or switch commands.
 * Access/assignment facts must come from future authoritative adapters, not this model.
 */
import {resolveStoryObjective,resolveGatheringSources} from './story-journal-2-review.mjs';
export const JOURNAL_TABS=['story','quests','challenges','records'];
const priority={ready:0,active:1,available:2,locked:3,claimed:4};
const validText=v=>typeof v==='string'&&v.length>0;
const targetKey=d=>d.monsterId??d.routeId??d.gatheringId;
const action=(label,destination,detail,extra={})=>({label,destination,detail,...extra,authorizesAccess:false,authorizesReward:false});
const unavailable=detail=>action('View requirements',null,detail);
function safeDestination(d,context,questId,tab){
 if(!d||d.status!=='destination')return null;
 const {status,authorizesAccess,...rest}=d;
 return {...rest,returnTo:{screen:'Journal',tab,questId,accountId:context.accountId,characterId:context.characterId}};
}
function routeAction(d,context,nav) {
 const facts=context.scouting;
 if(!facts||facts.accountId!==context.accountId||facts.characterId!==context.characterId||!Array.isArray(facts.assignments))return unavailable('Scouting status unavailable. Refresh Exploration.');
 const own=facts.assignments.filter(a=>a.accountId===context.accountId&&a.characterId===context.characterId&&a.routeId===d.routeId&&a.kind==='discovery'&&['running','ready'].includes(a.status));
 if(own.length>1)return unavailable('Scouting assignments need refreshing.');
 if(own.length===1){
  const a=own[0];
  return action(a.status==='ready'?'View report':'View scouting',{...nav,section:'Reports',assignmentId:a.id},a.status==='ready'?'Your report is ready to collect.':'Your scout is exploring. Continue your current activity.');
 }
 const occupied=facts.assignments.find(a=>a.accountId===context.accountId&&a.usesTrainingSlot===true&&['running','ready'].includes(a.status));
 if(occupied)return action('View scouting',{...nav,section:'Reports'},occupied.characterId===context.characterId?'Finish your existing assignment first.':'Another character is using the shared scouting slot.');
 const eligibility=facts.routeEligibility?.[d.routeId];
 if(eligibility?.status==='blocked')return action('View requirements',nav,eligibility.reason??'Complete the route requirements first.');
 if(eligibility?.status!=='available')return unavailable('Route requirements are not yet verified.');
 return action('Choose scout',nav,'Use a free guide or an eligible idle companion.');
}
function activityAction(d,context,nav){
 const key=targetKey(d);
 if(!key)return action(d.screen==='Inventory'?'Open equipment':'Open world',nav,'Review your character progression.');
 const access=context.access?.[key];
 if(!access||!['allowed','blocked'].includes(access.status))return unavailable('Activity access is not yet verified.');
 if(access.status==='blocked')return action('View requirements',nav,access.reason??'Complete the activity requirements first.');
 return action(d.gatheringId?'Find gathering spot':d.monsterId?'Find encounter':'Open activity',nav,'Open the activity. Starting it or travelling requires your confirmation.');
}
function objectiveAction(quest,o,context,catalog,tab){
 if(o.kind==='gather'){
  const sources=resolveGatheringSources({resourceId:o.targetId,skillId:o.skillId},catalog);
  if(!sources.length)return unavailable('No released gathering source found.');
  const available=sources.filter(d=>context.access?.[targetKey(d)]?.status==='allowed');
  const current=available.find(d=>d.zoneId===context.currentZoneId&&(!d.areaId||d.areaId===context.currentAreaId));
  if(current||available.length===1){
   const d=current??available[0];return activityAction(d,context,safeDestination(d,context,quest.id,tab));
  }
  if(available.length>1)return action('Choose gathering spot',null,'Select an available source.',{choices:available.map(d=>safeDestination(d,context,quest.id,tab))});
  const blocked=sources.filter(d=>context.access?.[targetKey(d)]?.status==='blocked');
  if(blocked.length===1&&sources.length===1)return activityAction(blocked[0],context,safeDestination(blocked[0],context,quest.id,tab));
  return action('View requirements',null,'No source has verified access yet.',{choices:blocked.map(d=>({...safeDestination(d,context,quest.id,tab),reason:context.access[targetKey(d)].reason??'Locked'}))});
 }
 const d=resolveStoryObjective(quest,o,catalog),nav=safeDestination(d,context,quest.id,tab);
 if(!nav)return unavailable(d.reason==='regional_story_review_required'?'This objective location is under review.':'Objective location unavailable.');
 return o.kind==='map'?routeAction(d,context,nav):activityAction(d,context,nav);
}
function row(q,p,context,catalog,tab){
 const objectives=q.objectives??[q.objective],progress=p.objectives??[p.objective];
 const next=objectives.find((o,i)=>!progress[i]?.complete);
 let primary;
 if(p.status==='claimed')primary=action('View completed quest',null,'Already completed. No repeat reward.');
 else if(p.status==='locked')primary=action('View prerequisite',null,'Complete the preceding story quest.',{prerequisiteId:p.missingPrerequisites?.[0]});
 else if(p.status==='ready')primary=action('Review rewards',null,'Objectives completed. Claiming requires the authoritative quest service.');
 else if(p.status==='available')primary=action('View quest',null,'Review objectives before accepting.');
 else if(p.status==='active'&&next)primary=objectiveAction(q,next,context,catalog,tab);
 else primary=unavailable('Quest progress unavailable.');
 return {id:q.id,title:q.title,zoneId:q.narrativeZoneId,status:p.status,tab,objectiveCount:objectives.length,completeCount:progress.filter(x=>x?.complete).length,objectives:progress,primary};
}
export function journalNavigationReview({book,side,storyProgress,sideProgress,catalog,context,preferences={}}){
 const base={released:false,authorizesAccess:false,authorizesReward:false};
 if(!validText(context?.accountId)||!validText(context?.characterId)||storyProgress?.status!=='review'||sideProgress?.status!=='review')return {...base,status:'unavailable'};
 const join=(defs,rows,tab)=>defs.flatMap(q=>{const p=rows.find(x=>x.id===q.id);return p?[row(q,p,context,catalog,tab)]:[]});
 const story=join(book.quests,storyProgress.quests,'story'),quests=join(side.quests,sideProgress.quests,'quests');
 const saved=preferences.accountId===context.accountId&&preferences.characterId===context.characterId?preferences:{};
 const tab=JOURNAL_TABS.includes(saved.tab)?saved.tab:'story';
 const all=[...story,...quests];
 const pinned=all.find(q=>q.id===saved.pinnedQuestId&&['active','available','ready'].includes(q.status));
 const featured=story.find(q=>q.status==='ready')??story.find(q=>q.status==='active')??story.find(q=>q.status==='available');
 const filter=['current','all','completed','locked'].includes(saved.filter)?saved.filter:'current';
 const query=typeof saved.query==='string'?saved.query.trim().toLowerCase().slice(0,120):'';
 const visible=(tab==='story'?story:tab==='quests'?quests:[]).filter(q=>(filter==='all'||(filter==='current'&&['ready','active','available'].includes(q.status))||(filter==='completed'&&q.status==='claimed')||(filter==='locked'&&q.status==='locked'))&&(!query||q.title.toLowerCase().includes(query))).sort((a,b)=>priority[a.status]-priority[b.status]);
 return {...base,status:'review',tab,filter,pinned,featured,visible,storyComplete:story.filter(q=>q.status==='claimed').length,storyTotal:story.length,readyCount:all.filter(q=>q.status==='ready').length,tabs:JOURNAL_TABS};
}
export function journalReturnReview(returnTo,context,availableIds){
 if(returnTo?.screen!=='Journal'||returnTo.accountId!==context?.accountId||returnTo.characterId!==context?.characterId||!JOURNAL_TABS.includes(returnTo.tab)||!availableIds.includes(returnTo.questId))return {screen:'Journal',tab:'story'};
 return {screen:'Journal',tab:returnTo.tab,questId:returnTo.questId};
}
