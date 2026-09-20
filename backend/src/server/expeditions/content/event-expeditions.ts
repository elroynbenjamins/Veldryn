export interface EventExpeditionDefinition {
 id:string;
 eventName:string;
 name:string;
 description:string;
 routeHighlights:string[];
 enemyNames:string[];
 finalBoss:string;
 encounterPrefix:string;
 bossEncounterId:string;
 minLevel:number;
 rewardMarks:number;
 startMonth:number;
 startDay:number;
 endMonth:number;
 endDay:number;
}

export const EVENT_EXPEDITIONS:readonly EventExpeditionDefinition[] = Object.freeze([
 {id:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:'Suncrest Games',name:'The Shattered Isles',description:'Island arenas, pirate camps and sun shrines form a summer expedition route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],enemyNames:['Suncrest Corsair','Shoreline Colossus','Solar Reef Warden'],finalBoss:'Aureon, First Champion',encounterPrefix:'EVENT_SUNCREST',bossEncounterId:'EVENT_SUNCREST_BOSS',minLevel:45,rewardMarks:96,startMonth:6,startDay:1,endMonth:8,endDay:31},
 {id:'EVENT_STARFALL_ASTRAL_RIFT',eventName:'Starfall Nights',name:'Astral Rift Expedition',description:'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.',routeHighlights:['Meteor Field','Star Shrine','Rift Gate'],enemyNames:['Astral Marauder','Meteoric Sentinel','Riftbound Herald'],finalBoss:'The Constellation Eater',encounterPrefix:'EVENT_STARFALL',bossEncounterId:'EVENT_STARFALL_BOSS',minLevel:70,rewardMarks:118,startMonth:8,startDay:1,endMonth:8,endDay:31},
 {id:'EVENT_VEILBREAK_HOLLOW_BELFRY',eventName:'The Veilbreak',name:'The Hollow Belfry',description:'Descend through broken lantern wards and a cloister swallowed by the Gloam.',routeHighlights:['Lantern Ward','Shattered Cloister','Gloam Stair'],enemyNames:['Gloam Stalker','Lantern Eater','Veilbound Penitent'],finalBoss:'The Pale Bellkeeper',encounterPrefix:'EVENT_VEILBREAK',bossEncounterId:'EVENT_VEILBREAK_BOSS',minLevel:25,rewardMarks:92,startMonth:10,startDay:23,endMonth:11,endDay:2},
 {id:'EVENT_MERCHANT_BROKEN_TOLLHOUSE',eventName:'Merchant & Guild Festival',name:'The Broken Tollhouse',description:'Fight through seized caravan yards and the coin-vault beneath an abandoned guild tollhouse.',routeHighlights:['Caravan Yard','Seized Ledger Hall','Coin Vault'],enemyNames:['Road Reaver','Contract Wraith','Coinbound Golem'],finalBoss:'The Gilded Extortioner',encounterPrefix:'EVENT_MERCHANT',bossEncounterId:'EVENT_MERCHANT_BOSS',minLevel:20,rewardMarks:88,startMonth:11,startDay:13,endMonth:11,endDay:27},
 {id:'EVENT_FROSTFALL_AURORA_BELLFOUNDRY',eventName:'Frostfall Festival',name:'Aurora Bellfoundry',description:'Cross frozen casting halls and aurora-lit bell chambers beneath the winter festival.',routeHighlights:['Snowbound Causeway','Frozen Casting Hall','Aurora Belfry'],enemyNames:['Rimebound Marauder','Bellfrost Warden','Aurora Revenant'],finalBoss:'The White Bell Beast',encounterPrefix:'EVENT_FROSTFALL',bossEncounterId:'EVENT_FROSTFALL_BOSS',minLevel:25,rewardMarks:94,startMonth:12,startDay:6,endMonth:12,endDay:21},
 {id:'EVENT_TURNING_VAULT_LAST_HOUR',eventName:'Turning of the Age',name:'Vault of the Last Hour',description:'Enter a chronicle vault caught between the last midnight and the first dawn.',routeHighlights:['Fading Gallery','Ageglass Archive','Midnight Orrery'],enemyNames:['Yearless Remnant','Ageglass Sentinel','Dawnless Chronicler'],finalBoss:'The Last Hour',encounterPrefix:'EVENT_TURNING',bossEncounterId:'EVENT_TURNING_BOSS',minLevel:25,rewardMarks:96,startMonth:12,startDay:29,endMonth:1,endDay:4},
 {id:'EVENT_HEARTBOND_GARDEN_BROKEN_VOWS',eventName:'Heartbond Festival',name:'Garden of Broken Vows',description:'Descend through overgrown vow gardens where old promises have become hostile magic.',routeHighlights:['Rosegate Walk','Vowglass Conservatory','Forgotten Arbor'],enemyNames:['Thornbound Jealousy','Vowbreaker Shade','Heartglass Knight'],finalBoss:'The Unbound Heart',encounterPrefix:'EVENT_HEARTBOND',bossEncounterId:'EVENT_HEARTBOND_BOSS',minLevel:15,rewardMarks:84,startMonth:2,startDay:7,endMonth:2,endDay:21},
 {id:'EVENT_BLOOMWAKE_ELDERBLOOM_HOLLOW',eventName:'Bloomwake',name:'Elderbloom Hollow',description:'Travel beneath a waking sacred grove through roots, pollen caverns, and a blighted heart chamber.',routeHighlights:['Rootway Descent','Pollen Grotto','Elderbloom Heart'],enemyNames:['Blightcap Ravager','Rootwoken Stag','Pollen Wraith'],finalBoss:'Elderbloom Devourer',encounterPrefix:'EVENT_BLOOMWAKE',bossEncounterId:'EVENT_BLOOMWAKE_BOSS',minLevel:20,rewardMarks:88,startMonth:3,startDay:20,endMonth:4,endDay:5},
]);

function monthDay(month:number,day:number){return month*100+day;}
function active(definition:EventExpeditionDefinition,nowMs:number):boolean{
 const now=new Date(nowMs),today=monthDay(now.getUTCMonth()+1,now.getUTCDate()),start=monthDay(definition.startMonth,definition.startDay),end=monthDay(definition.endMonth,definition.endDay);
 return start<=end ? today>=start&&today<=end : today>=start||today<=end;
}

/** Seasonal expedition content is authoritative, but the current mobile co-op
 * transport exposes these routes as previews until event-run transport is wired. */
export function eventExpeditionPreviews(nowMs:number):Array<EventExpeditionDefinition&{status:'preview';scheduled:boolean}>{
 return EVENT_EXPEDITIONS.map(definition=>({...definition,status:'preview' as const,scheduled:active(definition,nowMs)}));
}
