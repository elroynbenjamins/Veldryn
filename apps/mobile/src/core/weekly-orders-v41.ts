export type WeeklyOrderKind='hunt'|'profession';
export type WeeklyOrderProfessionKind='gathering'|'processing'|'crafting'|'cooking'|'smelting';
export interface WeeklyOrderReward{rewardRef:string;label:string}
export interface WeeklyOrderSource{kind:'skill'|'monster'|'dungeon'|'recipe'|'item'|'region'|'collection'|'weekly_order';id:string;label:string;available:boolean;reason?:string}
interface CandidateBase{id:string;title:string;regionId?:string;activityId:string;source:WeeklyOrderSource;estimatedPerHour:number;available:boolean;unavailableReason?:string;reward?:WeeklyOrderReward;priority?:number}
export interface HuntOrderCandidate extends CandidateBase{kind:'hunt';monsterId:string;boss?:boolean}
export interface ProfessionOrderCandidate extends CandidateBase{kind:'profession';actionId:string;professionKind:WeeklyOrderProfessionKind}
export type WeeklyOrderCandidate=HuntOrderCandidate|ProfessionOrderCandidate;
export interface WeeklyOrder{id:string;weekKey:string;slot:number;kind:WeeklyOrderKind;title:string;targetId:string;regionId?:string;activityId:string;source:WeeklyOrderSource;target:number;progress:number;reward:WeeklyOrderReward;claimed:boolean;completedAtMs?:number;professionKind?:WeeklyOrderProfessionKind}
export interface WeeklyOrderPolicy{enabled:boolean;huntSlots:number;professionSlots:number;huntTargetMinutes:number;professionTargetMinutes:number;minimumHuntTarget:number;minimumProfessionTarget:number;defaultHuntReward:WeeklyOrderReward;defaultProfessionReward:WeeklyOrderReward;completionReward:WeeklyOrderReward}
export interface WeeklyOrdersState{schemaVersion:41;accountId:string;revision:number;weekKey:string;startsAtMs:number;endsAtMs:number;generatedAtMs:number;orders:WeeklyOrder[];completionClaimed:boolean}
export interface WeeklyOrderProgressEvent{eventId:string;characterId:string;kind:WeeklyOrderKind;targetId:string;amount:number;completedAtMs:number}
export interface WeeklyOrderClaim{claimKey:string;reward:WeeklyOrderReward;orderId?:string;weekKey:string}
export interface WeeklyOrderProgressResult{eventId:string;updated:Array<{orderId:string;before:number;after:number;completed:boolean}>;grants?:WeeklyOrderClaim[]}

const DAY_MS=86_400_000;
export const DEFAULT_WEEKLY_ORDER_POLICY:WeeklyOrderPolicy={
 enabled:true,huntSlots:2,professionSlots:2,huntTargetMinutes:35,professionTargetMinutes:45,
 minimumHuntTarget:10,minimumProfessionTarget:20,
 defaultHuntReward:{rewardRef:'weekly_order_hunt_standard',label:'Hunt Order reward'},
 defaultProfessionReward:{rewardRef:'weekly_order_profession_standard',label:'Profession Order reward'},
 completionReward:{rewardRef:'weekly_orders_completion',label:'Weekly Orders completion reward'},
};

export function weeklyOrderWindow(nowMs:number){
 if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('invalid_weekly_order_time');
 const d=new Date(nowMs),day=(d.getUTCDay()+6)%7,startsAtMs=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day),endsAtMs=startsAtMs+7*DAY_MS;
 const thursday=new Date(startsAtMs+3*DAY_MS),year=thursday.getUTCFullYear(),jan4=Date.UTC(year,0,4),jan4Day=(new Date(jan4).getUTCDay()+6)%7,week1=jan4-jan4Day*DAY_MS;
 const week=Math.floor((startsAtMs-week1)/(7*DAY_MS))+1;
 return {weekKey:`${year}-W${String(week).padStart(2,'0')}`,startsAtMs,endsAtMs};
}
function hash32(input:string){let h=2166136261>>>0;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0}
function roundFriendly(value:number){if(value<=10)return Math.max(1,Math.round(value));if(value<100)return Math.max(5,Math.round(value/5)*5);if(value<500)return Math.max(10,Math.round(value/10)*10);return Math.max(50,Math.round(value/50)*50)}
function targetFor(candidate:WeeklyOrderCandidate,policy:WeeklyOrderPolicy){const minutes=candidate.kind==='hunt'?policy.huntTargetMinutes:policy.professionTargetMinutes,floor=candidate.kind==='hunt'?(candidate.boss?1:policy.minimumHuntTarget):policy.minimumProfessionTarget;return Math.max(floor,roundFriendly(candidate.estimatedPerHour*minutes/60))}
function score(accountId:string,weekKey:string,c:WeeklyOrderCandidate){return Math.max(0,c.priority??50)+(hash32(`${accountId}|${weekKey}|${c.kind}|${c.id}`)/0xffffffff)*25}
function select(accountId:string,weekKey:string,candidates:WeeklyOrderCandidate[],kind:WeeklyOrderKind,slots:number){return candidates.filter(c=>c.kind===kind&&c.available&&c.source.available&&Number.isFinite(c.estimatedPerHour)&&c.estimatedPerHour>0).sort((a,b)=>score(accountId,weekKey,a)-score(accountId,weekKey,b)||a.id.localeCompare(b.id)).slice(0,Math.max(0,slots))}
export function generateWeeklyOrders(accountId:string,nowMs:number,candidates:WeeklyOrderCandidate[],policy:WeeklyOrderPolicy=DEFAULT_WEEKLY_ORDER_POLICY):WeeklyOrdersState{
 if(!accountId)throw new Error('account_required');const window=weeklyOrderWindow(nowMs);
 if(!policy.enabled)return {schemaVersion:41,accountId,revision:0,...window,generatedAtMs:nowMs,orders:[],completionClaimed:false};
 const chosen=[...select(accountId,window.weekKey,candidates,'hunt',policy.huntSlots),...select(accountId,window.weekKey,candidates,'profession',policy.professionSlots)];
 return {schemaVersion:41,accountId,revision:0,...window,generatedAtMs:nowMs,completionClaimed:false,orders:chosen.map((candidate,slot)=>({
   id:`${window.weekKey}:${candidate.kind}:${candidate.id}`,weekKey:window.weekKey,slot,kind:candidate.kind,title:candidate.title,
   targetId:candidate.kind==='hunt'?candidate.monsterId:candidate.actionId,regionId:candidate.regionId,activityId:candidate.activityId,source:{...candidate.source},
   target:targetFor(candidate,policy),progress:0,reward:{...(candidate.reward??(candidate.kind==='hunt'?policy.defaultHuntReward:policy.defaultProfessionReward))},claimed:false,
   professionKind:candidate.kind==='profession'?candidate.professionKind:undefined
 }))};
}
export function applyWeeklyOrderProgress(state:WeeklyOrdersState,event:WeeklyOrderProgressEvent):WeeklyOrderProgressResult{
 if(!event.eventId||!event.characterId||!Number.isSafeInteger(event.amount)||event.amount<=0)throw new Error('invalid_weekly_order_event');
 if(event.completedAtMs<state.startsAtMs||event.completedAtMs>=state.endsAtMs)return {eventId:event.eventId,updated:[]};
 const updated:WeeklyOrderProgressResult['updated']=[];
 for(const order of state.orders){if(order.kind!==event.kind||order.targetId!==event.targetId||order.progress>=order.target)continue;const before=order.progress,after=Math.min(order.target,before+event.amount);order.progress=after;if(after>=order.target&&!order.completedAtMs)order.completedAtMs=event.completedAtMs;updated.push({orderId:order.id,before,after,completed:after>=order.target})}
 return {eventId:event.eventId,updated};
}
export function claimWeeklyOrder(state:WeeklyOrdersState,orderId:string):WeeklyOrderClaim{const order=state.orders.find(o=>o.id===orderId);if(!order)throw new Error('weekly_order_not_found');if(order.progress<order.target)throw new Error('weekly_order_incomplete');if(order.claimed)throw new Error('weekly_order_already_claimed');order.claimed=true;return {claimKey:`${state.weekKey}:order:${order.id}`,reward:{...order.reward},orderId:order.id,weekKey:state.weekKey}}
export function claimWeeklyCompletion(state:WeeklyOrdersState,policy:WeeklyOrderPolicy=DEFAULT_WEEKLY_ORDER_POLICY):WeeklyOrderClaim{if(!state.orders.length||state.orders.some(o=>o.progress<o.target))throw new Error('weekly_orders_incomplete');if(state.completionClaimed)throw new Error('weekly_completion_already_claimed');state.completionClaimed=true;return {claimKey:`${state.weekKey}:completion`,reward:{...policy.completionReward},weekKey:state.weekKey}}
