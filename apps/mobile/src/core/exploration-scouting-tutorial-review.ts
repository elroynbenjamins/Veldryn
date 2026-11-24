/** Hidden review copy and read-only guidance; never registered in live navigation.
 * The tutorial is a projection of authoritative evidence, not a progression command. */
import {firstSessionTutorialStep,type FirstSessionTutorialHost,type FirstSessionTutorialStep} from './first-session-tutorial';
import {COMPANION_TOUR_STEPS} from './companion-tutorial';
import {SCOUT_ROUTES,scoutingAvailability,scoutingPrerequisiteMet,type ScoutState,type ScoutReceipt} from './exploration-scouting-review';

export const SCOUT_TUTORIAL_RELEASED=false as const;
export const SCOUT_TUTORIAL_VERSION=2;
export const SCOUT_GUIDE_IDS=['scouting2_intro','scouting2_dispatch','scouting2_wait','scouting2_claim','scouting2_practice','scouting2_next','scouting2_owned','scouting2_returning'] as const;
export type ScoutGuideId=typeof SCOUT_GUIDE_IDS[number];
export type ScoutGuideStep={id:ScoutGuideId;title:string;body:string;hint:string;actionLabel:string;destination:'Skills';beacon:string;routeId?:string};
const step=(id:ScoutGuideId,title:string,body:string,hint:string,actionLabel:string,beacon:string,routeId?:string):ScoutGuideStep=>({id,title,body,hint,actionLabel,destination:'Skills',beacon,routeId});
export function normalizeScoutingGuideAcknowledgements(value:unknown):ScoutGuideId[]{
 return Array.isArray(value)?[...new Set(value.filter((id):id is ScoutGuideId=>typeof id==='string'&&(SCOUT_GUIDE_IDS as readonly string[]).includes(id)))]:[];
}
export function scoutingGuide(input:{state:ScoutState;receipts:readonly ScoutReceipt[];now:number;ownedCompanionCount:number;acknowledged?:readonly ScoutGuideId[];returningPlayer?:boolean}):ScoutGuideStep|undefined{
 const {state,receipts,now,ownedCompanionCount}=input,seen=new Set(input.acknowledged??[]);
 if(!state.accountId||!state.characterId)return;
 const active=receipts.find(r=>r.accountId===state.accountId&&r.characterId===state.characterId&&r.status==='active');
 const ownKnown=state.discoveredRouteIds;
 if(active){
  if(now>=active.endsAt)return step('scouting2_claim','Your scout has returned','Collect the scouting report to earn Exploration experience and record any discovery.','Open the completed assignment.','Collect report','scouting-claim',active.routeId);
  return step('scouting2_wait','Your scout is out exploring','Scouting continues while you gather, craft, fight or leave the screen.','Come back when the timer finishes.','View scouting','scouting-active',active.routeId);
 }
 if(receipts.some(r=>r.accountId===state.accountId&&r.status==='active'))return; // Another character owns the account slot; no duplicate dispatch hint.
 if(input.returningPlayer&&(ownKnown.length>0||(state.retainedPrerequisiteRouteIds?.length??0)>0)&&!seen.has('scouting2_returning'))return step('scouting2_returning','Exploration has changed','Your mapped routes and Exploration XP are preserved. Companion Expeditions are moving into Scouting.','Review existing discoveries; old assignments retain their original claims.','Open Exploration','scouting-overview');
 if(ownKnown.length===0&&!(state.retainedPrerequisiteRouteIds?.length)&&!seen.has('scouting2_intro'))return step('scouting2_intro','Meet your first scout','Scouting finds routes while your character continues other activities. A free local guide is available for basic discovery and practice.','Open Skills and select Exploration.','Open Exploration','scouting-overview');
 const next=SCOUT_ROUTES.find(r=>r.released&&!scoutingPrerequisiteMet(state,r.legacyId)&&scoutingAvailability(state,r,'route')==='available');
 if(next)return step(ownKnown.length===0?'scouting2_dispatch':'scouting2_next',ownKnown.length===0?'Send your first scout':'Discover the next route','Choose a spare companion or the free guide. Route discoveries are guaranteed.','Review the time and dispatch your scout.','Choose scout','scouting-dispatch',next.id);
 const practice=SCOUT_ROUTES.filter(r=>r.released&&scoutingAvailability(state,r,'practice')==='available').sort((a,b)=>b.xp/b.seconds-a.xp/a.seconds)[0];
 const future=SCOUT_ROUTES.some(r=>r.released&&!scoutingPrerequisiteMet(state,r.legacyId));
 if(future&&practice)return step('scouting2_practice','Train Exploration','Repeat a mapped route to earn Exploration XP. The free guide can train even before companions unlock.','Choose a short practice mission to reach the next requirement.','Start practice','scouting-practice',practice.id);
 if(ownedCompanionCount>0&&!seen.has('scouting2_owned'))return step('scouting2_owned','Send your own companions','Idle companions can scout faster and later take longer surveys. Equipped or busy companions cannot be assigned.','Compare team bonuses before dispatch.','Choose companions','scouting-team');
 return;
}
/** Preserve existing quest status and claims. Only replace obsolete presentation
 * for A Hound's Trail; do not make the tutorial itself complete QST_003. */
export function firstSessionScoutingReview(host:FirstSessionTutorialHost,scout:{state:ScoutState;receipts:readonly ScoutReceipt[];now:number;ownedCompanionCount:number;acknowledged?:readonly ScoutGuideId[]},legacyCompleted:readonly string[]=[]):FirstSessionTutorialStep|undefined{
 const original=firstSessionTutorialStep(host,legacyCompleted);
 const q=host.quests.find(r=>r.questId==='QST_003');
 // Other early quests, claims, and combat progression retain their existing path.
 if(!host.character||q?.status!=='active'||host.quests.some(r=>['QST_001','QST_002'].includes(r.questId)&&r.status!=='claimed'))return original;
 // A discovered Ironwood route is not a quest grant: let authoritative quest
 // refresh resolve eligibility. Never force a returning player to scout again.
 if(scout.state.discoveredRouteIds.includes('SCOUT_IRONWOOD'))return original?.id==='ironwood_prepare'?original:undefined;
 const guide=scoutingGuide(scout);
 if(!guide)return undefined;
 return {id:guide.id==='scouting2_claim'||guide.id==='scouting2_wait'?'ironwood_scout_collect':'ironwood_scout',questId:'QST_003',eyebrow:'COMPANION SCOUTING',title:guide.title,body:guide.body,hint:guide.hint,actionLabel:guide.actionLabel,destination:'Skills',highlightPrimary:'Skills',highlightBeacon:guide.beacon};
}
export const SCOUTING_STORY_COPY={questId:'QST_003',description:'Send a scout to trace Ironwood paths and discover the Ironwood Wolf encounter.',story:'The wardens have found wolf tracks. Send a local guide or spare companion ahead to map the trail. Collect the report to reveal the route; travel and combat still have their own requirements.',objectiveRouteId:'SCOUT_IRONWOOD'} as const;
export const SCOUTING_COMPANION_TOUR=COMPANION_TOUR_STEPS.map(s=>s.section==='Expeditions'?{...s,section:'Scouting' as const,title:'Send companions scouting',body:'Exploration and Expeditions now share a scouting board. Assign idle companions to routes and surveys while your character trains.',hint:'Open Skills → Exploration. Review availability, duration and rewards before dispatching; collect reports there.',action:'Open Exploration'}:s.section==='Sanctuary'?{...s,body:'Build facilities for daily XP, weekly Essence and scouting capacity. Housing improves individual companions.'}:s);
export const SCOUTING_GAME_GUIDE={title:'Exploration & Companion Scouting',destination:'Skills',steps:['Open Skills → Exploration and choose a released route.','Send a local guide or idle companion; your character may continue other activities.','Collect the report to earn Exploration XP and record discoveries.','Train on mapped routes and select longer surveys when your companion roster is ready.','Discoveries do not bypass separate travel, profession or combat access requirements.']} as const;
