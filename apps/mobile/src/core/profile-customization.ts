import {LIVE_EVENT_CATALOG,type EventReward,type LiveEventDef} from '../content/live-events';
import type {GameState} from './types';
import {PROFILE_TITLES,profileTitleUnlocked} from './profile-unlocks';
import {JOURNAL_TITLES_V42} from './adventurers-journal-v42';

export type ProfileCustomizationDestination='Events'|'Guild'|'Character'|'Collections';
export type ProfileRewardKind='background'|'border'|'title';
export type ProfilePreviewAudience='public'|'guild'|'self';
export type ProfilePreviewVisibility='public'|'guild'|'private';

export function profileAudienceCanView(visibility:ProfilePreviewVisibility,audience:ProfilePreviewAudience){
 if(audience==='self')return true;
 if(visibility==='public')return true;
 return visibility==='guild'&&audience==='guild';
}

export interface ProfileRewardSource{
 kind:ProfileRewardKind;
 id:string;
 name:string;
 label:string;
 detail:string;
 destination:ProfileCustomizationDestination;
 actionLabel:string;
 eventId?:string;
}

export interface ProfileUnlockNotice{
 kind:ProfileRewardKind;
 id:string;
 name:string;
 source?:ProfileRewardSource;
}

function humanize(id:string){
 return id.replace(/^(bg_|frame_|title_)/,'').replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

function milestoneSource(event:LiveEventDef,reward:EventReward,points:number):ProfileRewardSource{
 return {
  kind:reward.kind as ProfileRewardKind,id:reward.id,name:reward.name,
  label:event.name,
  detail:`${points.toLocaleString()} ${event.progressionName}`,
  destination:'Events',actionLabel:'Open Event',eventId:event.id,
 };
}
function shopSource(event:LiveEventDef,reward:EventReward,currency:'common'|'prestige',cost:number):ProfileRewardSource{
 const currencyName=currency==='common'?event.currencyName:event.prestigeCurrencyName;
 return {
  kind:reward.kind as ProfileRewardKind,id:reward.id,name:reward.name,
  label:`${event.name} · ${currency==='common'?'Event Shop':'Prestige Shop'}`,
  detail:`${cost.toLocaleString()} ${currencyName}`,
  destination:'Events',actionLabel:'Open Event',eventId:event.id,
 };
}
function communitySource(event:LiveEventDef,reward:EventReward,percent:number):ProfileRewardSource{
 return {
  kind:reward.kind as ProfileRewardKind,id:reward.id,name:reward.name,
  label:`${event.name} · Community reward`,
  detail:`Community milestone ${percent}%`,
  destination:'Events',actionLabel:'Open Event',eventId:event.id,
 };
}
function discoverySource(event:LiveEventDef,reward:EventReward,name:string):ProfileRewardSource{
 return {
  kind:reward.kind as ProfileRewardKind,id:reward.id,name:reward.name,
  label:`${event.name} · Discovery`,
  detail:name,
  destination:'Events',actionLabel:'Open Event',eventId:event.id,
 };
}

function eventProfileRewardSource(state:GameState,kind:ProfileRewardKind,id:string):ProfileRewardSource|undefined{
 const classId=state.character?.classId??'IRONWARDEN';
 for(const event of LIVE_EVENT_CATALOG){
  for(const entry of event.milestones(classId)){
   if(entry.reward.kind===kind&&entry.reward.id===id)return milestoneSource(event,entry.reward,entry.points);
  }
  for(const entry of event.shop){
   if(entry.reward.kind===kind&&entry.reward.id===id)return shopSource(event,entry.reward,entry.currency,entry.cost);
  }
  for(const entry of event.communityMilestones){
   if(entry.reward?.kind===kind&&entry.reward.id===id)return communitySource(event,entry.reward,entry.percent);
  }
  for(const entry of event.discoveries){
   if(entry.reward.kind===kind&&entry.reward.id===id)return discoverySource(event,entry.reward,entry.name);
  }
 }
 return undefined;
}

export function profileRewardSource(state:GameState,kind:ProfileRewardKind,id:string):ProfileRewardSource{
 if(kind==='title'){
  const title=PROFILE_TITLES.find(row=>row.id===id);
  if(title){
   if(title.requiredGuild)return {
    kind,id,name:title.name,label:'Guild membership',
    detail:'Join a guild to unlock this title.',
    destination:'Guild',actionLabel:'Open Guild',
   };
   const level=title.requiredLevel??1;
   return {
    kind,id,name:title.name,label:`Character level ${level}`,
    detail:`Reach level ${level} on this character.`,
    destination:'Character',actionLabel:'View Character',
   };
  }
 }
 return eventProfileRewardSource(state,kind,id)??{
  kind,id,name:humanize(id),label:'Collection source',
  detail:'Open Collections to review known unlock sources.',
  destination:'Collections',actionLabel:'Open Collections',
 };
}

function eventRewardName(state:GameState,kind:ProfileRewardKind,id:string){
 return eventProfileRewardSource(state,kind,id)?.name??humanize(id);
}
function addedIds(before:string[]|undefined,after:string[]|undefined){
 const prior=new Set(before??[]);
 return (after??[]).filter(id=>!prior.has(id));
}

export function newlyUnlockedProfileRewards(before:GameState,after:GameState):ProfileUnlockNotice[]{
 const notices:ProfileUnlockNotice[]=[];
 for(const id of addedIds(before.account.unlockedProfileBackgroundIds,after.account.unlockedProfileBackgroundIds)){
  notices.push({kind:'background',id,name:eventRewardName(after,'background',id),source:profileRewardSource(after,'background',id)});
 }
 for(const id of addedIds(before.account.unlockedProfileBorderIds,after.account.unlockedProfileBorderIds)){
  notices.push({kind:'border',id,name:eventRewardName(after,'border',id),source:profileRewardSource(after,'border',id)});
 }
 for(const id of addedIds(before.account.unlockedTitleIds,after.account.unlockedTitleIds)){
  notices.push({kind:'title',id,name:eventRewardName(after,'title',id),source:profileRewardSource(after,'title',id)});
 }
 const beforeJournalTitles=before.account.journalState?.unlockedTitles??{},afterJournalTitles=after.account.journalState?.unlockedTitles??{};
 for(const id of Object.keys(afterJournalTitles).filter(id=>beforeJournalTitles[id]===undefined)){
  const definition=JOURNAL_TITLES_V42.find(row=>row.id===id);if(definition)notices.push({kind:'title',id,name:definition.name});
 }
 if(before.character&&after.character&&before.character.id===after.character.id){
  for(const title of PROFILE_TITLES){
   if(title.id==='new-adventurer')continue;
   if(!profileTitleUnlocked(before,title.id)&&profileTitleUnlocked(after,title.id)){
    notices.push({kind:'title',id:title.id,name:title.name,source:profileRewardSource(after,'title',title.id)});
   }
  }
 }
 const seen=new Set<string>();
 return notices.filter(row=>{const key=row.kind+':'+row.id;if(seen.has(key))return false;seen.add(key);return true;});
}
