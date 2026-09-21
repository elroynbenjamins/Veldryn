import type { ExpeditionNodeType } from '../../../shared/expedition-types';

export type EventMechanicId =
 'chronicle_stability'|'vow_harmony'|'grove_balance'|'champion_favor'|'rift_stability'|'lantern_light'|'caravan_integrity'|'warmth';

export interface EventMechanicDefinition {
 id:EventMechanicId;
 label:string;
 description:string;
 startValue:number;
 maxValue:number;
 lowThreshold:number;
 highThreshold:number;
 battleDelta:number;
 lowBossAttackMultiplier:number;
 highBossAttackMultiplier:number;
 highRewardBonus:number;
}

export interface EventRouteSpecialDefinition {
 depth:number;
 choice:number;
 kind:Exclude<ExpeditionNodeType,'boss'>;
 contentId:string;
 title:string;
 rewardTag:string;
 mechanicDelta:number;
 risk?:number;
}

export interface EventExpeditionDefinition {
 id:string;
 eventName:string;
 liveEventSeriesId:string;
 name:string;
 description:string;
 routeHighlights:string[];
 finalBoss:string;
 minLevel:number;
 rewardMarks:number;
 startMonth:number;
 startDay:number;
 endMonth:number;
 endDay:number;
 encounterPrefix:string;
 bossEncounterId:string;
 routeNodeCount:number;
 mechanic:EventMechanicDefinition;
 specialNodes:readonly EventRouteSpecialDefinition[];
}

const special=(depth:number,choice:number,kind:EventRouteSpecialDefinition['kind'],contentId:string,title:string,rewardTag:string,mechanicDelta:number,risk?:number):EventRouteSpecialDefinition=>({depth,choice,kind,contentId,title,rewardTag,mechanicDelta,risk});

export const EVENT_EXPEDITIONS:readonly EventExpeditionDefinition[] = Object.freeze([
 {id:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:'Suncrest Games',liveEventSeriesId:'EVT_ANNUAL_006',name:'The Shattered Isles',description:'Island arenas, pirate camps and sun shrines form a summer expedition route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',minLevel:45,rewardMarks:96,startMonth:6,startDay:1,endMonth:8,endDay:31,encounterPrefix:'EVENT_SUNCREST',bossEncounterId:'EVENT_SUNCREST_BOSS',routeNodeCount:5,
  mechanic:{id:'champion_favor',label:'Champion Favor',description:'Win difficult trials and honor the island rites to build favor before facing the First Champion.',startValue:50,maxValue:100,lowThreshold:25,highThreshold:80,battleDelta:-2,lowBossAttackMultiplier:1.08,highBossAttackMultiplier:.94,highRewardBonus:7},
  specialNodes:[special(3,1,'elite','EVENT_SUNCREST_BATTLE_03',"Champion's Trial",'champion_trial',10,1.10),special(3,2,'shrine','EVENT_SUNCREST_SUN_SHRINE','Honor the Sun Shrine','sun_rite',12),special(4,1,'event','EVENT_SUNCREST_CROWD_CHALLENGE','Take the Crowd Challenge','crowd_favor',14),special(4,2,'risk','EVENT_SUNCREST_DARING_ROUTE','Take the Daring Sea Route','high_risk_favor',10,1.18),special(5,1,'treasure','EVENT_SUNCREST_LAUREL_CACHE','Recover the Champion Laurels','laurel_cache',10),special(5,2,'elite','EVENT_SUNCREST_BATTLE_02','Defeat the Shoreline Colossus','arena_upset',12,1.12)]},
 {id:'EVENT_STARFALL_ASTRAL_RIFT',eventName:'Starfall Nights',liveEventSeriesId:'EVT_ANNUAL_008',name:'Astral Rift Expedition',description:'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.',routeHighlights:['Meteor Field','Star Shrine','Rift Gate'],finalBoss:'The Constellation Eater',minLevel:70,rewardMarks:118,startMonth:9,startDay:1,endMonth:9,endDay:30,encounterPrefix:'EVENT_STARFALL',bossEncounterId:'EVENT_STARFALL_BOSS',routeNodeCount:7,
  mechanic:{id:'rift_stability',label:'Rift Stability',description:'Anchor unstable tears as you advance. A stable rift weakens the Constellation Eater; a collapsing one empowers it.',startValue:60,maxValue:100,lowThreshold:30,highThreshold:82,battleDelta:-5,lowBossAttackMultiplier:1.14,highBossAttackMultiplier:.93,highRewardBonus:10},
  specialNodes:[special(3,1,'event','EVENT_STARFALL_RIFT_ANCHOR_1','Anchor the Meteor Tear','rift_anchor',18),special(3,2,'risk','EVENT_STARFALL_METEOR_SURGE_1','Cross the Meteor Surge','unstable_shortcut',-20,1.20),special(4,1,'shrine','EVENT_STARFALL_STAR_SHRINE','Align the Star Shrine','star_alignment',16),special(4,2,'elite','EVENT_STARFALL_BATTLE_03','Break the Riftbound Herald','rift_guardian',6,1.12),special(5,1,'event','EVENT_STARFALL_RIFT_ANCHOR_2','Seal a Minor Rift','rift_seal',16),special(5,2,'risk','EVENT_STARFALL_VOID_BRIDGE','Cross the Void Bridge','void_crossing',-18,1.22),special(6,1,'camp','EVENT_STARFALL_OBSERVATORY_CAMP','Rest at the Observatory','astral_respite',10),special(6,2,'elite','EVENT_STARFALL_BATTLE_02','Destroy the Meteoric Sentinel','meteor_guardian',8,1.12),special(7,1,'event','EVENT_STARFALL_RIFT_ANCHOR_3','Stabilize the Rift Gate','rift_gate',18),special(7,2,'risk','EVENT_STARFALL_NEXUS_RUSH','Rush the Rift Nexus','nexus_rush',-16,1.20)]},
 {id:'EVENT_VEILBREAK_GLOAM_BREACH',eventName:'The Veilbreak',liveEventSeriesId:'EVT_ANNUAL_010',name:'The Gloam Breach',description:'Enter a ruptured ward district where shades are extinguishing lanterns and pulling the streets into the Gloam.',routeHighlights:['Lantern Gate','Hollow Chapel','Gloam Crossing'],finalBoss:'The Hollow Regent',minLevel:35,rewardMarks:102,startMonth:10,startDay:23,endMonth:11,endDay:2,encounterPrefix:'EVENT_VEILBREAK',bossEncounterId:'EVENT_VEILBREAK_BOSS',routeNodeCount:6,
  mechanic:{id:'lantern_light',label:'Lantern Light',description:'Relight ward lanterns to keep the Gloam pushed back. Low light strengthens the Hollow Regent at the end of the breach.',startValue:62,maxValue:100,lowThreshold:28,highThreshold:80,battleDelta:-6,lowBossAttackMultiplier:1.15,highBossAttackMultiplier:.93,highRewardBonus:8},
  specialNodes:[special(3,1,'event','EVENT_VEILBREAK_LANTERN_WARD_1','Relight the Lantern Ward','lantern_restored',20),special(3,2,'risk','EVENT_VEILBREAK_GLOAM_SHORTCUT_1','Take the Gloam Shortcut','gloam_shortcut',-14,1.20),special(4,1,'shrine','EVENT_VEILBREAK_HOLLOW_CHAPEL','Consecrate the Hollow Chapel','chapel_ward',14),special(4,2,'elite','EVENT_VEILBREAK_BATTLE_02','Clear the Lantern-Eater Nest','lantern_eater_nest',6,1.12),special(5,1,'event','EVENT_VEILBREAK_LANTERN_WARD_2','Restore the Street Lantern Chain','lantern_chain',18),special(5,2,'risk','EVENT_VEILBREAK_BLACKOUT_ALLEY','Cross Blackout Alley','blackout_crossing',-16,1.22),special(6,1,'camp','EVENT_VEILBREAK_KEEPER_REFUGE',"Rest at the Keeper's Refuge",'keeper_refuge',10),special(6,2,'elite','EVENT_VEILBREAK_BATTLE_03','Break the Hollow Warden Patrol','warden_patrol',8,1.12)]},
 {id:'EVENT_MERCHANT_GILDED_ROAD',eventName:'Merchant & Guild Festival',liveEventSeriesId:'EVT_ANNUAL_011',name:'The Gilded Road',description:'Escort a high-value guild caravan through sabotaged tollgates, raider camps and a seized counting house.',routeHighlights:['Broken Tollgate','Caravan Crossroads','Seized Counting House'],finalBoss:'The Coinbound Captain',minLevel:35,rewardMarks:100,startMonth:11,startDay:13,endMonth:11,endDay:27,encounterPrefix:'EVENT_MERCHANT',bossEncounterId:'EVENT_MERCHANT_BOSS',routeNodeCount:6,
  mechanic:{id:'caravan_integrity',label:'Caravan Integrity',description:'Protect and repair the guild caravan. A battered caravan makes the final assault harder; a pristine convoy earns a delivery bonus.',startValue:72,maxValue:100,lowThreshold:30,highThreshold:82,battleDelta:-7,lowBossAttackMultiplier:1.10,highBossAttackMultiplier:.96,highRewardBonus:8},
  specialNodes:[special(3,1,'event','EVENT_MERCHANT_WAGON_REPAIR','Repair the Damaged Wagons','caravan_repair',18),special(3,2,'merchant','EVENT_MERCHANT_GUILD_SUPPLY','Stop at the Guild Supply Wagon','supply_stop',8),special(4,1,'event','EVENT_MERCHANT_ESCORT_FORMATION','Form a Caravan Escort','escort_formation',15),special(4,2,'risk','EVENT_MERCHANT_UNSAFE_SHORTCUT','Take the Unsafe Toll Road','unsafe_shortcut',-20,1.20),special(5,1,'camp','EVENT_MERCHANT_GUARD_CAMP','Fortify the Guard Camp','guard_camp',12),special(5,2,'elite','EVENT_MERCHANT_BATTLE_03','Break the Iron Tollkeeper Ambush','tollkeeper_ambush',-6,1.14),special(6,1,'merchant','EVENT_MERCHANT_GUILD_QUARTER','Resupply at the Guild Quarter','guild_resupply',12),special(6,2,'event','EVENT_MERCHANT_TOLLGATE_SECURE','Secure the Final Tollgate','tollgate_secured',16)]},
 {id:'EVENT_FROSTFALL_AURORA_HOLLOW',eventName:'Frostfall Festival',liveEventSeriesId:'EVT_ANNUAL_012',name:'Aurora Hollow',description:'Follow stolen festival bells into a frozen hollow where winter spirits have turned the celebration into a deadly procession.',routeHighlights:['Snowbell Pass','Frozen Giftworks','Aurora Belfry'],finalBoss:'The Rimebell Colossus',minLevel:35,rewardMarks:104,startMonth:12,startDay:6,endMonth:12,endDay:21,encounterPrefix:'EVENT_FROSTFALL',bossEncounterId:'EVENT_FROSTFALL_BOSS',routeNodeCount:6,
  mechanic:{id:'warmth',label:'Warmth',description:'Maintain the party’s warmth with hearths, shelter and festival magic. Deep cold empowers the Rimebell Colossus.',startValue:66,maxValue:100,lowThreshold:30,highThreshold:80,battleDelta:-7,lowBossAttackMultiplier:1.14,highBossAttackMultiplier:.94,highRewardBonus:8},
  specialNodes:[special(3,1,'camp','EVENT_FROSTFALL_FESTIVAL_HEARTH','Restore the Festival Hearth','hearth_warmth',20),special(3,2,'risk','EVENT_FROSTFALL_FROZEN_SHORTCUT','Cross the Frozen Shortcut','cold_shortcut',-18,1.20),special(4,1,'event','EVENT_FROSTFALL_WINDBREAK','Build a Snowbreak Shelter','windbreak',15),special(4,2,'elite','EVENT_FROSTFALL_BATTLE_02','Drive Off the Bellfrost Spirits','bellfrost_assault',-6,1.12),special(5,1,'shrine','EVENT_FROSTFALL_AURORA_BRAZIER','Kindle the Aurora Brazier','aurora_brazier',18),special(5,2,'risk','EVENT_FROSTFALL_WHITEOUT','Push Through the Whiteout','whiteout_crossing',-20,1.22),special(6,1,'camp','EVENT_FROSTFALL_HOT_MEAL','Prepare a Festival Hot Meal','festival_meal',16),special(6,2,'event','EVENT_FROSTFALL_WARMING_BELLS','Ring the Warming Bells','warming_bells',12)]},
 {id:'EVENT_TURNING_CHRONICLE_VAULT',eventName:'Turning of the Age',liveEventSeriesId:'EVT_ANNUAL_001',name:'The Chronicle Vault',description:'Descend through fractured archives where memories of the closing age have become hostile echoes.',routeHighlights:['Shattered Archive','Hourglass Causeway','First Dawn Observatory'],finalBoss:'The Last Hour',minLevel:50,rewardMarks:110,startMonth:12,startDay:29,endMonth:1,endDay:4,encounterPrefix:'EVENT_TURNING',bossEncounterId:'EVENT_TURNING_BOSS',routeNodeCount:6,
  mechanic:{id:'chronicle_stability',label:'Chronicle Stability',description:'Repair fractured records and anchor the timeline. Unstable history makes The Last Hour more dangerous.',startValue:58,maxValue:100,lowThreshold:30,highThreshold:80,battleDelta:-4,lowBossAttackMultiplier:1.12,highBossAttackMultiplier:.94,highRewardBonus:8},
  specialNodes:[special(3,1,'event','EVENT_TURNING_CHRONICLE_SEAL','Repair the Chronicle Seal','chronicle_repaired',18),special(3,2,'risk','EVENT_TURNING_BROKEN_HOUR','Cross a Broken Hour','broken_hour',-14,1.18),special(4,1,'shrine','EVENT_TURNING_DAWN_MEMORY','Anchor a First Dawn Memory','dawn_memory',14),special(4,2,'echo','EVENT_TURNING_CLOSING_ECHO','Resolve the Closing-Age Echo','closing_echo',10),special(5,1,'event','EVENT_TURNING_ARCHIVE_REPAIR','Restore the Shattered Archive','archive_restored',16),special(5,2,'risk','EVENT_TURNING_TIME_SKIP','Force a Time Skip','time_skip',-18,1.20),special(6,1,'camp','EVENT_TURNING_OBSERVATORY_REST','Rest at the First Dawn Observatory','observatory_rest',10),special(6,2,'elite','EVENT_TURNING_BATTLE_03','Defeat the Dawnless Warden','dawnless_warden',8,1.12)]},
 {id:'EVENT_HEARTBOND_VOW_GARDEN',eventName:'Heartbond Festival',liveEventSeriesId:'EVT_ANNUAL_002',name:'The Broken Vow Garden',description:'Follow a sabotaged festival route through rose gardens and lantern bridges twisted by broken vows.',routeHighlights:['Rosebridge','Vow Garden','Lantern Promenade'],finalBoss:'The Severed Vow',minLevel:30,rewardMarks:92,startMonth:2,startDay:7,endMonth:2,endDay:16,encounterPrefix:'EVENT_HEARTBOND',bossEncounterId:'EVENT_HEARTBOND_BOSS',routeNodeCount:5,
  mechanic:{id:'vow_harmony',label:'Vow Harmony',description:'Mend broken vows and restore festival bonds. Strong harmony weakens the Severed Vow and improves the clear payout.',startValue:60,maxValue:100,lowThreshold:30,highThreshold:82,battleDelta:-3,lowBossAttackMultiplier:1.10,highBossAttackMultiplier:.95,highRewardBonus:6},
  specialNodes:[special(3,1,'event','EVENT_HEARTBOND_VOW_SHRINE','Mend the Vow Shrine','vow_mended',18),special(3,2,'risk','EVENT_HEARTBOND_SEVERED_BRIDGE','Cross the Severed Bridge','severed_crossing',-14,1.18),special(4,1,'shrine','EVENT_HEARTBOND_ROSE_OATH','Renew the Rose Oath','rose_oath',16),special(4,2,'elite','EVENT_HEARTBOND_BATTLE_03','Defeat the Sorrowbound Shade','sorrowbound_trial',8,1.10),special(5,1,'event','EVENT_HEARTBOND_LANTERN_BONDS','Relight the Bond Lanterns','bond_lanterns',14),special(5,2,'camp','EVENT_HEARTBOND_PROMENADE_REST','Rest at the Lantern Promenade','promenade_rest',10)]},
 {id:'EVENT_BLOOMWAKE_THORNHEART_GROVE',eventName:'Bloomwake',liveEventSeriesId:'EVT_ANNUAL_003',name:'Thornheart Grove',description:'Push into an overgrown sacred grove where awakened spring magic has grown feral and predatory.',routeHighlights:['Overgrown Shrine','Pollen Hollow','Rootbound Grove'],finalBoss:'The Thornheart Ancient',minLevel:30,rewardMarks:98,startMonth:3,startDay:20,endMonth:4,endDay:5,encounterPrefix:'EVENT_BLOOMWAKE',bossEncounterId:'EVENT_BLOOMWAKE_BOSS',routeNodeCount:6,
  mechanic:{id:'grove_balance',label:'Grove Balance',description:'Prune feral growth without starving the sacred grove. Balanced spring magic weakens the Thornheart Ancient.',startValue:55,maxValue:100,lowThreshold:28,highThreshold:78,battleDelta:-4,lowBossAttackMultiplier:1.12,highBossAttackMultiplier:.94,highRewardBonus:7},
  specialNodes:[special(3,1,'event','EVENT_BLOOMWAKE_PRUNE_GROWTH','Prune the Feral Growth','growth_pruned',16),special(3,2,'risk','EVENT_BLOOMWAKE_POLLEN_RUSH','Rush Through Pollen Hollow','pollen_rush',-16,1.20),special(4,1,'shrine','EVENT_BLOOMWAKE_OLD_GROVE_SHRINE','Awaken the Old Grove Shrine','grove_shrine',15),special(4,2,'elite','EVENT_BLOOMWAKE_BATTLE_03','Calm the Rootbound Stag','rootbound_stag',7,1.10),special(5,1,'forge','EVENT_BLOOMWAKE_HEARTROOT_BIND','Bind the Heartroot','heartroot_bound',14),special(5,2,'risk','EVENT_BLOOMWAKE_THORN_TUNNEL','Cut Through the Thorn Tunnel','thorn_tunnel',-16,1.20),special(6,1,'treasure','EVENT_BLOOMWAKE_SEED_CACHE','Rescue the Sacred Seed Cache','seed_cache',10),special(6,2,'event','EVENT_BLOOMWAKE_BALANCE_RITE','Perform the Balance Rite','balance_rite',16)]},
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
