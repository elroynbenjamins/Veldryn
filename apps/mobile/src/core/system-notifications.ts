import type {GameState} from './types';
import {equipmentCraftingQueue} from './equipment-crafting-queue';
import {eventLifecycle} from './live-events';

export type SystemNoticeTone='info'|'good'|'warning';
export interface SystemNotice{id:string;title:string;body:string;tone:SystemNoticeTone}

/** Builds the read-only system feed from actionable, persisted game state. */
export function systemNotifications(state:GameState,nowMs=Date.now()):SystemNotice[]{
 const notices:SystemNotice[]=[];
 const completedCrafts=equipmentCraftingQueue(state).filter(job=>job.completesAtMs<=nowMs).length;
 if(completedCrafts)notices.push({id:'forge-ready',title:'Forge ready',body:`${completedCrafts} craft${completedCrafts===1?'':'s'} can be claimed from Skills.`,tone:'good'});
 const pendingWeekly=state.account.weeklyOrderPendingRewards?.length??0;
 if(pendingWeekly)notices.push({id:'weekly-orders',title:'Weekly rewards ready',body:`${pendingWeekly} weekly reward${pendingWeekly===1?' is':'s are'} ready to claim.`,tone:'good'});
 const overflow=state.overflow.stacks.reduce((total,row)=>total+row.quantity,0);
 if(overflow)notices.push({id:'overflow',title:'Storage attention',body:`${overflow} item${overflow===1?' is':'s'} waiting in overflow. Move them to the Bank from Inventory.`,tone:'warning'});
 const event=eventLifecycle(state,nowMs);
 if(event?.phase==='claiming')notices.push({id:'event-claiming',title:'Event rewards remain',body:`${event.definition.name} has ended, but its reward window is still open.`,tone:'info'});
 else if(event?.phase==='upcoming')notices.push({id:'event-upcoming',title:'Event approaching',body:`${event.definition.name} is scheduled to begin soon.`,tone:'info'});
 return notices;
}
