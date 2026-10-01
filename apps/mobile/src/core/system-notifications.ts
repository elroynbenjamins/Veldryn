import type {GameState} from './types';
import {equipmentCraftingQueue} from './equipment-crafting-queue';
import {eventLifecycle} from './live-events';
import {navigationText} from '../i18n/navigation';

export type SystemNoticeTone='info'|'good'|'warning';
export interface SystemNotice{id:string;title:string;body:string;tone:SystemNoticeTone}

/** Builds the read-only system feed from actionable, persisted game state. */
export function systemNotifications(state:GameState,nowMs=Date.now()):SystemNotice[]{
 const tr=(text:string,params?:Record<string,string|number>)=>navigationText(state.settings.language,text,params);
 const notices:SystemNotice[]=[];
 const completedCrafts=equipmentCraftingQueue(state).filter(job=>job.completesAtMs<=nowMs).length;
 if(completedCrafts)notices.push({id:'forge-ready',title:tr('Forge ready'),body:tr('Crafts ready to claim from Skills: {count}',{count:completedCrafts}),tone:'good'});
 const pendingWeekly=state.account.weeklyOrderPendingRewards?.length??0;
 if(pendingWeekly)notices.push({id:'weekly-orders',title:tr('Weekly rewards ready'),body:tr('Weekly rewards ready to claim: {count}',{count:pendingWeekly}),tone:'good'});
 const overflow=state.overflow.stacks.reduce((total,row)=>total+row.quantity,0);
 if(overflow)notices.push({id:'overflow',title:tr('Storage attention'),body:tr('Items in overflow: {count}. Move them to the Bank from Inventory.',{count:overflow}),tone:'warning'});
 const event=eventLifecycle(state,nowMs);
 if(event?.phase==='claiming')notices.push({id:'event-claiming',title:tr('Event rewards remain'),body:tr('{name} has ended, but its reward window is still open.',{name:event.definition.name}),tone:'info'});
 else if(event?.phase==='upcoming')notices.push({id:'event-upcoming',title:tr('Event approaching'),body:tr('{name} is scheduled to begin soon.',{name:event.definition.name}),tone:'info'});
 return notices;
}
