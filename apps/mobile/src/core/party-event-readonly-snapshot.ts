/**
 * UI-only adapter for the hidden private Party Event v33 status projection.
 * No requests or gameplay actions. Never display a fabricated "live" stage,
 * supply quantity or vote when the authenticated server has no snapshot.
 */
export const PARTY_EVENT_STATUS_MOBILE_RELEASED=false;
export type PartyEventStoryId='caravan'|'hunt'|'wards'|'reliquary';
type Stage=1|2|3;
export interface PartyEventScreenOrder {
 readonly stage:Stage;
 readonly itemId:string;
 readonly category:'wood'|'ore'|'herb';
 readonly kind:'required'|'optional';
 readonly target:number;
 readonly donated:number;
}
export interface PartyEventScreenSnapshot {
 readonly family:PartyEventStoryId;
 readonly variation:string;
 readonly difficulty:'standard'|'veteran'|'heroic';
 readonly status:'active'|'closed'|'settled';
 readonly stage:Stage;
 readonly rosterSize:2|3|4;
 readonly completedActions:readonly ('scout_route'|'secure_approach'|'support_expedition'|'prepare_finale')[];
 readonly orders:readonly PartyEventScreenOrder[];
 readonly votes:{
  readonly stage2:string|null;readonly stage3:string|null;
  readonly myStage2Ballot:boolean;readonly myStage3Ballot:boolean;
 };
}
const stories:Record<string,PartyEventStoryId>={
 broken_caravan:'caravan',nightfall_hunt:'hunt',
 broken_wards:'wards',lost_reliquary:'reliquary',
};
const actions=['scout_route','secure_approach','support_expedition','prepare_finale'];
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v
 &&typeof v==='object'&&!Array.isArray(v);
const boundedString=(v:unknown,min:number,max:number):v is string=>typeof v==='string'
 &&v.length>=min&&v.length<=max;
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'
 &&Number.isSafeInteger(v)&&v>=min&&v<=max;
const validTime=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)
 &&Number.isFinite(Date.parse(v));
const candidate=(v:unknown,arr:readonly unknown[])=>arr.includes(v);

/** Accept only the private, release-disabled projection shape; fail closed. */
export function decodePartyEventReadOnlySnapshot(raw:unknown,nowMs:number=Date.now()):PartyEventScreenSnapshot|null{
 if(!isRecord(raw)||raw.schema!=='party-event-readonly-status-v33'
  ||!boundedString(raw.family,3,50)||!stories[raw.family]
  ||!boundedString(raw.variation,3,80)
  ||!candidate(raw.difficulty,['standard','veteran','heroic'])
  ||!candidate(raw.status,['active','closed','settled'])
  ||!integer(raw.stage,1,3)||!integer(raw.rosterSize,2,4)
  ||raw.canClaim!==false||raw.canContribute!==false||raw.canFight!==false
  ||!validTime(raw.eventStartsAt)||!validTime(raw.eventEndsAt)||!validTime(raw.serverTime)
  ||Date.parse(raw.eventEndsAt as string)-Date.parse(raw.eventStartsAt as string)!==604800000
  ||!Number.isFinite(nowMs)
  ||nowMs-Date.parse(raw.serverTime as string)>120000
  ||Date.parse(raw.serverTime as string)-nowMs>30000
  ||(raw.status==='active'&&(Date.parse(raw.serverTime as string)<Date.parse(raw.eventStartsAt as string)
   ||Date.parse(raw.serverTime as string)>=Date.parse(raw.eventEndsAt as string)))
  ||(raw.status==='closed'&&Date.parse(raw.serverTime as string)<Date.parse(raw.eventEndsAt as string))
  ||(raw.status==='settled'&&Date.parse(raw.serverTime as string)<Date.parse(raw.eventEndsAt as string)+3600000)
  ||!Array.isArray(raw.completedActions)||raw.completedActions.length>4
  ||!Array.isArray(raw.orders)||raw.orders.length>120
  ||!isRecord(raw.votes))return null;
 if(raw.completedActions.some((v:unknown)=>!actions.includes(v as string))
  ||new Set(raw.completedActions).size!==raw.completedActions.length
  ||(raw.stage===1&&raw.completedActions.some((v:unknown)=>v!=='scout_route'))
  ||(raw.stage===2&&raw.completedActions.includes('prepare_finale')))return null;
 const keys=new Set<string>();
 for(const row of raw.orders){
  if(!isRecord(row)||!integer(row.stage,1,3)
   ||!boundedString(row.itemId,3,100)
   ||!candidate(row.category,['wood','ore','herb'])
   ||!candidate(row.kind,['required','optional'])
   ||!integer(row.target,1,10000)||!integer(row.donated,0,row.target))
   return null;
  const key=[row.stage,row.itemId,row.kind].join(':');
  if(keys.has(key))return null;
  keys.add(key);
 }
 const v=raw.votes;
 if((v.stage2!==null&&!boundedString(v.stage2,1,80))
  ||(v.stage3!==null&&!boundedString(v.stage3,1,80))
  ||typeof v.myStage2Ballot!=='boolean'||typeof v.myStage3Ballot!=='boolean'
  ||(raw.stage===1&&(v.stage2!==null||v.stage3!==null||v.myStage2Ballot||v.myStage3Ballot))
  ||(raw.stage===2&&(v.stage3!==null||v.myStage3Ballot))
  ||(raw.stage===3&&v.stage2===null))return null;
 return {
  family:stories[raw.family]!,variation:raw.variation,
  difficulty:raw.difficulty as PartyEventScreenSnapshot['difficulty'],
  status:raw.status as PartyEventScreenSnapshot['status'],
  stage:raw.stage as Stage,rosterSize:raw.rosterSize as 2|3|4,
  completedActions:raw.completedActions as PartyEventScreenSnapshot['completedActions'],
  orders:raw.orders as PartyEventScreenOrder[],
  votes:{
   stage2:v.stage2 as string|null,stage3:v.stage3 as string|null,
   myStage2Ballot:v.myStage2Ballot as boolean,myStage3Ballot:v.myStage3Ballot as boolean,
  },
 };
}
/** Aggregate quantities, not a gameplay readiness or payout decision. */
export function partyEventSupplyProgress(
 snapshot:PartyEventScreenSnapshot,stage:Stage,kind:'required'|'optional',
):{donated:number;target:number;percent:number;orders:number}{
 const values=snapshot.orders.filter(o=>o.stage===stage&&o.kind===kind);
 const donated=values.reduce((n,o)=>n+o.donated,0);
 const target=values.reduce((n,o)=>n+o.target,0);
 return {donated,target,percent:target===0?0:Math.min(100,Math.floor(donated/target*100)),
  orders:values.length};
}

/**
 * V39 is a server-only GET response. The QA UI accepts no old sample
 * status as a live feed, no writable capability and no expired lease.
 */
export type PartyEventReadTransportV39={
 readonly kind:'ready'|'empty'|'invalid';
 readonly event:PartyEventScreenSnapshot|null;
};
export function decodePartyEventReadTransportV39(raw:unknown,nowMs:number=Date.now()):PartyEventReadTransportV39{
 const invalid:PartyEventReadTransportV39={kind:'invalid',event:null};
 if(!isRecord(raw)||raw.schema!=='party-event-status-http-v39'
  ||raw.claimsEnabled!==false||raw.donationsEnabled!==false||raw.combatEnabled!==false
  ||!('event' in raw)||'error' in raw)
  return invalid;
 if(raw.event===null)return {kind:'empty',event:null};
 const event=decodePartyEventReadOnlySnapshot(raw.event,nowMs);
 return event===null?invalid:{kind:'ready',event};
}
