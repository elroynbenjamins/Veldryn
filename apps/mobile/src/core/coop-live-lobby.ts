export interface LiveQueueView {ticket:null|{ticketId:string;dungeonId:string;tier:number;maxTier?:number;role:'tank'|'damage'|'support';status:'queued'|'reserved'|'matched'|'cancelled'|'expired';reservationId:string|null};serverNow:number;}
export interface LiveReadyView {readyCheckId:string;rosterRevision:number;status:'open'|'refilling'|'committed'|'requeued'|'expired'|'cancelled';closesAtMs:number;refillEndsAtMs:number|null;serverNow:number;dungeonId?:string;tier?:number;runId?:string;members:Array<{characterId:string;role:'tank'|'damage'|'support';self:boolean;accepted:boolean;profileIconId?:string|null;iconClassId?:string|null}>;}
export function readySecondsRemaining(view:LiveReadyView):number{
 const end=view.status==='refilling'?view.refillEndsAtMs:view.closesAtMs;
 return end===null||!['open','refilling'].includes(view.status)?0:Math.max(0,Math.ceil((end-view.serverNow)/1000));
}

/** Queue placeholders describe required roles, never an inferred live fill count. */
export function liveLobbySlots(queue?:LiveQueueView,ready?:LiveReadyView){
 const roles=['tank','damage','damage','support'] as const;
 const members=ready?ready.members.filter(m=>ready.status!=='refilling'||m.accepted):[];
 const available=[...members];
 let selfPlaced=false;
 return roles.map((role,index)=>{
  const memberIndex=available.findIndex(m=>m.role===role);
  const member=memberIndex<0?undefined:available.splice(memberIndex,1)[0];
  const queuedSelf=!ready&&!selfPlaced&&queue?.ticket?.role===role;
  if(queuedSelf)selfPlaced=true;
  return {key:`${role}-${index}`,role,member,self:member?.self??queuedSelf,accepted:member?.accepted??false};
 });
}
