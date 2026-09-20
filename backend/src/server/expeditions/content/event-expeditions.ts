export interface EventExpeditionDefinition {
 id:string;eventName:string;liveEventSeriesId:string;name:string;description:string;routeHighlights:string[];finalBoss:string;minLevel:number;rewardMarks:number;startMonth:number;startDay:number;endMonth:number;endDay:number;encounterPrefix:string;bossEncounterId:string;
}

export const EVENT_EXPEDITIONS:readonly EventExpeditionDefinition[] = Object.freeze([
 {id:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:'Suncrest Games',liveEventSeriesId:'EVT_ANNUAL_006',name:'The Shattered Isles',description:'Island arenas, pirate camps and sun shrines form a summer expedition route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',minLevel:45,rewardMarks:96,startMonth:6,startDay:1,endMonth:8,endDay:31,encounterPrefix:'EVENT_SUNCREST',bossEncounterId:'EVENT_SUNCREST_BOSS'},
 {id:'EVENT_STARFALL_ASTRAL_RIFT',eventName:'Starfall Nights',liveEventSeriesId:'EVT_ANNUAL_008',name:'Astral Rift Expedition',description:'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.',routeHighlights:['Meteor Field','Star Shrine','Rift Gate'],finalBoss:'The Constellation Eater',minLevel:70,rewardMarks:118,startMonth:9,startDay:1,endMonth:9,endDay:30,encounterPrefix:'EVENT_STARFALL',bossEncounterId:'EVENT_STARFALL_BOSS'},
 {id:'EVENT_VEILBREAK_GLOAM_BREACH',eventName:'The Veilbreak',liveEventSeriesId:'EVT_ANNUAL_010',name:'The Gloam Breach',description:'Enter a ruptured ward district where shades are extinguishing lanterns and pulling the streets into the Gloam.',routeHighlights:['Lantern Gate','Hollow Chapel','Gloam Crossing'],finalBoss:'The Hollow Regent',minLevel:35,rewardMarks:102,startMonth:10,startDay:23,endMonth:11,endDay:2,encounterPrefix:'EVENT_VEILBREAK',bossEncounterId:'EVENT_VEILBREAK_BOSS'},
 {id:'EVENT_MERCHANT_GILDED_ROAD',eventName:'Merchant & Guild Festival',liveEventSeriesId:'EVT_ANNUAL_011',name:'The Gilded Road',description:'Escort a high-value guild caravan through sabotaged tollgates, raider camps and a seized counting house.',routeHighlights:['Broken Tollgate','Caravan Crossroads','Seized Counting House'],finalBoss:'The Coinbound Captain',minLevel:35,rewardMarks:100,startMonth:11,startDay:13,endMonth:11,endDay:27,encounterPrefix:'EVENT_MERCHANT',bossEncounterId:'EVENT_MERCHANT_BOSS'},
 {id:'EVENT_FROSTFALL_AURORA_HOLLOW',eventName:'Frostfall Festival',liveEventSeriesId:'EVT_ANNUAL_012',name:'Aurora Hollow',description:'Follow stolen festival bells into a frozen hollow where winter spirits have turned the celebration into a deadly procession.',routeHighlights:['Snowbell Pass','Frozen Giftworks','Aurora Belfry'],finalBoss:'The Rimebell Colossus',minLevel:35,rewardMarks:104,startMonth:12,startDay:6,endMonth:12,endDay:21,encounterPrefix:'EVENT_FROSTFALL',bossEncounterId:'EVENT_FROSTFALL_BOSS'},
 {id:'EVENT_TURNING_CHRONICLE_VAULT',eventName:'Turning of the Age',liveEventSeriesId:'EVT_ANNUAL_001',name:'The Chronicle Vault',description:'Descend through fractured archives where memories of the closing age have become hostile echoes.',routeHighlights:['Shattered Archive','Hourglass Causeway','First Dawn Observatory'],finalBoss:'The Last Hour',minLevel:50,rewardMarks:110,startMonth:12,startDay:29,endMonth:1,endDay:4,encounterPrefix:'EVENT_TURNING',bossEncounterId:'EVENT_TURNING_BOSS'},
 {id:'EVENT_HEARTBOND_VOW_GARDEN',eventName:'Heartbond Festival',liveEventSeriesId:'EVT_ANNUAL_002',name:'The Broken Vow Garden',description:'Follow a sabotaged festival route through rose gardens and lantern bridges twisted by broken vows.',routeHighlights:['Rosebridge','Vow Garden','Lantern Promenade'],finalBoss:'The Severed Vow',minLevel:30,rewardMarks:92,startMonth:2,startDay:7,endMonth:2,endDay:16,encounterPrefix:'EVENT_HEARTBOND',bossEncounterId:'EVENT_HEARTBOND_BOSS'},
 {id:'EVENT_BLOOMWAKE_THORNHEART_GROVE',eventName:'Bloomwake',liveEventSeriesId:'EVT_ANNUAL_003',name:'Thornheart Grove',description:'Push into an overgrown sacred grove where awakened spring magic has grown feral and predatory.',routeHighlights:['Overgrown Shrine','Pollen Hollow','Rootbound Grove'],finalBoss:'The Thornheart Ancient',minLevel:30,rewardMarks:98,startMonth:3,startDay:20,endMonth:4,endDay:5,encounterPrefix:'EVENT_BLOOMWAKE',bossEncounterId:'EVENT_BLOOMWAKE_BOSS'},
]);

function utcDay(year:number,month:number,day:number):number{return Date.UTC(year,month-1,day);}
function active(definition:EventExpeditionDefinition,nowMs:number):boolean{
 const now=new Date(nowMs),year=now.getUTCFullYear(),day=utcDay(year,now.getUTCMonth()+1,now.getUTCDate());
 const crossesYear=definition.startMonth>definition.endMonth;
 if(!crossesYear)return day>=utcDay(year,definition.startMonth,definition.startDay)&&day<=utcDay(year,definition.endMonth,definition.endDay);
 const lateYear=day>=utcDay(year,definition.startMonth,definition.startDay);
 const earlyYear=day<=utcDay(year,definition.endMonth,definition.endDay);
 return lateYear||earlyYear;
}

/** Calendar dates are presentation metadata only. Authenticated co-op entry promotes
 * the matching route to available only when the authoritative LiveOps event is active. */
export function eventExpeditionPreviews(nowMs:number):Array<EventExpeditionDefinition&{status:'preview';scheduled:boolean}>{
 return EVENT_EXPEDITIONS.map(definition=>({...definition,status:'preview' as const,scheduled:active(definition,nowMs)}));
}
