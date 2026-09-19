export type EventModuleId='overview'|'rewards'|'tasks'|'collection'|'shop'|'pets'|'companions';
export type EventRarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export type EventRewardKind='item'|'currency'|'pet'|'companion'|'profile'|'title'|'material'|'cosmetic';
export interface RotatingEventTheme{accent:string;accentAlt?:string;backgroundKey:string;bannerKey:string;iconKey?:string}
export interface RotatingEventReward{id:string;name:string;kind:EventRewardKind;rarity:EventRarity;quantity?:number;refId?:string;imageKey?:string;featured?:boolean;claimGroup?:string}
export interface RotatingEventTask{id:string;label:string;target:number;metric:string;rewardIds:string[]}
export interface RotatingEventDefinition{
 id:string;title:string;subtitle:string;shortDescription:string;startsAtMs:number;endsAtMs:number;graceEndsAtMs?:number;
 modules:EventModuleId[];theme:RotatingEventTheme;rewardIds:string[];taskIds:string[];featuredPetIds:string[];featuredCompanionIds:string[];collectionIds:string[];eventCurrencyId?:string;
 enabled:boolean;priority:number;
 /** Pre-launch VELDRYN intentionally leaves server-wide community campaigns off. */
 communityModuleEnabled?:false;
}
export interface RotatingEventCatalog{events:RotatingEventDefinition[];rewards:RotatingEventReward[];tasks:RotatingEventTask[]}
export interface RotatingEventProgress{accountId:string;eventId:string;progressByTask:Record<string,number>;unlockedRewardIds:string[];claimedRewardIds:string[];completedCollectionIds:string[];processedProgressEventIds:string[];updatedAtMs:number}
export interface RotatingEventTaskProgressEvent{eventId:string;accountId:string;taskId:string;amount:number;progressEventId:string;occurredAtMs:number}
const unique=(rows:string[])=>new Set(rows).size===rows.length;
export function validateRotatingEventCatalog(catalog:RotatingEventCatalog){
 const rewards=new Set<string>(),tasks=new Set<string>(),events=new Set<string>();
 for(const row of catalog.rewards){if(!row.id||rewards.has(row.id)||(row.quantity??1)<=0)throw new Error('invalid_event_reward');rewards.add(row.id)}
 for(const row of catalog.tasks){if(!row.id||tasks.has(row.id)||!Number.isSafeInteger(row.target)||row.target<=0)throw new Error('invalid_event_task');tasks.add(row.id);for(const id of row.rewardIds)if(!rewards.has(id))throw new Error(`unknown_task_reward:${id}`)}
 for(const row of catalog.events){if(!row.id||events.has(row.id)||row.startsAtMs>=row.endsAtMs)throw new Error('invalid_event');events.add(row.id);if(row.graceEndsAtMs!==undefined&&row.graceEndsAtMs<row.endsAtMs)throw new Error('invalid_event_grace');if(!unique(row.modules)||!unique(row.rewardIds)||!unique(row.taskIds))throw new Error('duplicate_event_links');for(const id of row.rewardIds)if(!rewards.has(id))throw new Error(`unknown_event_reward:${id}`);for(const id of row.taskIds)if(!tasks.has(id))throw new Error(`unknown_event_task:${id}`);if(row.communityModuleEnabled!==undefined&&row.communityModuleEnabled!==false)throw new Error('community_module_deferred')}
 return true;
}
export const eventActive=(event:RotatingEventDefinition,nowMs:number)=>event.enabled&&nowMs>=event.startsAtMs&&nowMs<event.endsAtMs;
export const eventGrace=(event:RotatingEventDefinition,nowMs:number)=>event.enabled&&nowMs>=event.endsAtMs&&event.graceEndsAtMs!==undefined&&nowMs<event.graceEndsAtMs;
export function rotatingActiveEvents(catalog:RotatingEventCatalog,nowMs:number){validateRotatingEventCatalog(catalog);return catalog.events.filter(event=>eventActive(event,nowMs)).sort((a,b)=>b.priority-a.priority||a.startsAtMs-b.startsAtMs)}
export function rotatingCurrentEvent(catalog:RotatingEventCatalog,nowMs:number){return rotatingActiveEvents(catalog,nowMs)[0]}
export function rotatingUpcomingEvents(catalog:RotatingEventCatalog,nowMs:number,limit=3){return catalog.events.filter(event=>event.enabled&&event.startsAtMs>nowMs).sort((a,b)=>a.startsAtMs-b.startsAtMs).slice(0,Math.max(0,limit))}
export function newRotatingEventProgress(accountId:string,eventId:string,nowMs:number):RotatingEventProgress{return {accountId,eventId,progressByTask:{},unlockedRewardIds:[],claimedRewardIds:[],completedCollectionIds:[],processedProgressEventIds:[],updatedAtMs:nowMs}}
export function applyRotatingEventTaskProgress(progress:RotatingEventProgress,event:RotatingEventTaskProgressEvent,catalog:RotatingEventCatalog){
 if(event.accountId!==progress.accountId||event.eventId!==progress.eventId)throw new Error('event_scope_mismatch');if(!Number.isSafeInteger(event.amount)||event.amount<=0)throw new Error('invalid_event_progress_amount');
 const task=catalog.tasks.find(row=>row.id===event.taskId);if(!task)throw new Error('event_task_not_found');const before=progress.progressByTask[task.id]??0;
 if(progress.processedProgressEventIds.includes(event.progressEventId))return {taskId:task.id,before,after:before,completed:false,newlyUnlockedRewardIds:[],duplicate:true};
 const after=Math.min(task.target,before+event.amount),completed=before<task.target&&after>=task.target;progress.progressByTask[task.id]=after;const newlyUnlockedRewardIds:string[]=[];
 if(completed)for(const id of task.rewardIds)if(!progress.unlockedRewardIds.includes(id)){progress.unlockedRewardIds.push(id);newlyUnlockedRewardIds.push(id)}
 progress.processedProgressEventIds=[...progress.processedProgressEventIds,event.progressEventId].slice(-500);progress.updatedAtMs=event.occurredAtMs;return {taskId:task.id,before,after,completed,newlyUnlockedRewardIds,duplicate:false};
}
export function claimRotatingEventReward(progress:RotatingEventProgress,rewardId:string,claimedAtMs:number){if(!progress.unlockedRewardIds.includes(rewardId)||progress.claimedRewardIds.includes(rewardId))throw new Error('event_reward_not_claimable');progress.claimedRewardIds.push(rewardId);progress.updatedAtMs=claimedAtMs;return {eventId:progress.eventId,rewardId,grantKey:`event:${progress.eventId}:reward:${rewardId}:account:${progress.accountId}`,claimedAtMs}}
