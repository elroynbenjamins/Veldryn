import {annualEventSeriesId,LIVE_EVENT_CATALOG,type LiveEventDef} from './live-events';
import {eventRewardOwned} from '../core/live-events';
import type {ClassId,GameState} from '../core/types';

export interface AnnualEventCalendarEntry{
  eventId:string;
  name:string;
  windowLabel:string;
  order:number;
  definition:LiveEventDef;
  collectionOwned:number;
  collectionTotal:number;
  collectionPercent:number;
  lifetimeReputation:number;
  hasHistory:boolean;
}

const WINDOWS:Record<string,{windowLabel:string;order:number}>={
  EVT_ANNUAL_001_2026:{windowLabel:'Dec 29 – Jan 4',order:1},
  EVT_ANNUAL_002_2026:{windowLabel:'February',order:2},
  EVT_ANNUAL_003_2026:{windowLabel:'March / April',order:3},
  EVT_ANNUAL_006_2026:{windowLabel:'June / July',order:6},
  EVT_ANNUAL_008_2026:{windowLabel:'August',order:8},
  EVT_ANNUAL_009_2026:{windowLabel:'September',order:9},
  EVT_ANNUAL_010_2026:{windowLabel:'October',order:10},
  EVT_ANNUAL_011_2026:{windowLabel:'November',order:11},
  EVT_ANNUAL_012_2026:{windowLabel:'December',order:12},
};

function rewards(definition:LiveEventDef,classId:ClassId){
  const community=definition.communityEnabled===true
    ?definition.communityMilestones.flatMap(entry=>entry.reward?[entry.reward]:[])
    :[];
  const all=[
    ...definition.milestones(classId).map(entry=>entry.reward),
    ...definition.shop.map(entry=>entry.reward),
    ...definition.discoveries.map(entry=>entry.reward),
    ...community,
  ];
  const byId=new Map(all.map(reward=>[reward.id,reward]));
  return [...byId.values()];
}

export function annualEventCalendar(state:GameState):AnnualEventCalendarEntry[]{
  const classId=state.character?.classId??'IRONWARDEN';
  return LIVE_EVENT_CATALOG.map(definition=>{
    const schedule=WINDOWS[definition.id]??{windowLabel:'Seasonal',order:99};
    const collection=rewards(definition,classId);
    const collectionOwned=collection.filter(reward=>eventRewardOwned(state,reward)).length;
    const collectionTotal=collection.length;
    const seriesId=annualEventSeriesId(definition.id);const lifetimeReputation=seriesId?Object.entries(state.account.eventProgressById??{}).reduce((sum,[eventId,value])=>sum+(annualEventSeriesId(eventId)===seriesId?Number(value??0):0),0):(state.account.eventProgressById?.[definition.id]??0);
    return {
      eventId:definition.id,
      name:definition.name,
      windowLabel:schedule.windowLabel,
      order:schedule.order,
      definition,
      collectionOwned,
      collectionTotal,
      collectionPercent:collectionTotal?Math.round(collectionOwned/collectionTotal*100):0,
      lifetimeReputation,
      hasHistory:lifetimeReputation>0||collectionOwned>0,
    };
  }).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));
}
