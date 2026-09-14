export interface EventExpeditionDefinition {
 id:string;eventName:string;name:string;description:string;routeHighlights:string[];finalBoss:string;minLevel:number;rewardMarks:number;startMonth:number;startDay:number;endMonth:number;endDay:number;
}

export const EVENT_EXPEDITIONS:readonly EventExpeditionDefinition[] = Object.freeze([
 {id:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:'Suncrest Games',name:'The Shattered Isles',description:'Island arenas, pirate camps and sun shrines form a summer expedition route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',minLevel:45,rewardMarks:96,startMonth:6,startDay:1,endMonth:8,endDay:31},
 {id:'EVENT_STARFALL_ASTRAL_RIFT',eventName:'Starfall Convergence',name:'Astral Rift Expedition',description:'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.',routeHighlights:['Meteor Field','Star Shrine','Rift Gate'],finalBoss:'The Constellation Eater',minLevel:70,rewardMarks:118,startMonth:9,startDay:1,endMonth:9,endDay:30},
]);

function utcDay(year:number,month:number,day:number):number{return Date.UTC(year,month-1,day);}
function active(definition:EventExpeditionDefinition,nowMs:number):boolean{
 const now=new Date(nowMs),year=now.getUTCFullYear(),day=utcDay(year,now.getUTCMonth()+1,now.getUTCDate());
 return day>=utcDay(year,definition.startMonth,definition.startDay)&&day<=utcDay(year,definition.endMonth,definition.endDay);
}

/** The schedule is authoritative, but routes remain preview-only until their
 * server start/settlement transport is deployed. */
export function eventExpeditionPreviews(nowMs:number):Array<EventExpeditionDefinition&{status:'preview';scheduled:boolean}>{
 return EVENT_EXPEDITIONS.map(definition=>({...definition,status:'preview' as const,scheduled:active(definition,nowMs)}));
}
