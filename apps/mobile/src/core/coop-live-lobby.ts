export interface LiveQueueView {ticket:null|{ticketId:string;dungeonId:string;tier:number;role:'tank'|'damage'|'support';status:'queued'|'reserved'|'matched'|'cancelled'|'expired';reservationId:string|null};serverNow:number;}
export interface LiveReadyView {readyCheckId:string;rosterRevision:number;status:'open'|'refilling'|'committed'|'requeued'|'expired'|'cancelled';closesAtMs:number;refillEndsAtMs:number|null;serverNow:number;members:Array<{characterId:string;role:'tank'|'damage'|'support';self:boolean;accepted:boolean}>;}
export function readySecondsRemaining(view:LiveReadyView):number{
 const end=view.status==='refilling'?view.refillEndsAtMs:view.closesAtMs;
 return end===null||!['open','refilling'].includes(view.status)?0:Math.max(0,Math.ceil((end-view.serverNow)/1000));
}
