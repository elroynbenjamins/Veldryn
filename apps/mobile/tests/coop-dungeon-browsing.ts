import {coopTierEligibility,filterCoopDungeons,groupCoopDungeonsByRegion,highestEligibleCoopTier,presentCoopDungeon,validateCoopDungeonView,type CoopRoomType} from '../src/core/coop-dungeon-browsing';
import {seasonalEventExpeditionInfo,seasonalEventHasExpedition,validateCoopEventExpeditionPreview} from '../src/core/coop-event-expeditions';
import {COOP_MESSAGE_COUNT,SUPPORTED_LANGUAGES,coopPolicyText,translatedCoopMessageCount} from '../src/i18n';

function equal(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
const rootbound=presentCoopDungeon({id:'EXP_001',name:'Rootbound Vault',minLevel:10,recommendedLevel:25,syncLevel:25,available:true,tierMinLevels:{1:10,2:10,3:10},tierMinPower:{1:2500,2:3750,3:5000},enabledRoomTypes:['battle','elite','camp','boss'],difficulties:[1,2,3,4,5],preBossRoomMin:5,preBossRoomMax:5});
validateCoopDungeonView(rootbound);
equal(rootbound.difficulties,[1,2,3],'new dungeon selection must contain three tiers only');
equal(rootbound.itemDropRates,[],'no fictional item drop odds are shown without server data');
equal([rootbound.id,rootbound.name,rootbound.minLevel,rootbound.recommendedLevel],['EXP_001','Rootbound Vault',10,25],'canonical EXP_001 changed');
equal(rootbound.heroArtId,'rootbound_hero','Rootbound hero art mapping changed');
equal(rootbound.estimatedMinutes,{min:6,max:8},'launch duration target changed');equal(rootbound.tierMinLevels,{1:10,2:10,3:10,4:15,5:20},'tier requirements changed');
equal(coopTierEligibility(rootbound,3,10,5000),{eligible:true,requiredLevel:10,requiredPower:5000},'eligible Tier III should open at 5,000 CP');equal(coopTierEligibility(rootbound,3,10,4999),{eligible:false,requiredLevel:10,requiredPower:5000},'power boundary cannot be skipped');equal(coopTierEligibility(rootbound,4,35,100000),{eligible:false,requiredLevel:15,requiredPower:0},'retired Tier IV cannot be selected even at high power');
equal(highestEligibleCoopTier(rootbound,10,5000),3,'Live auto tier should choose Tier III at 5,000 CP');equal(highestEligibleCoopTier(rootbound,10,3749),1,'Live auto tier should stay Tier I below Tier II power');equal(highestEligibleCoopTier(rootbound,9,100000),undefined,'Live auto tier fails closed below dungeon minimum');
const unknown=presentCoopDungeon({id:'EXP_UNKNOWN',name:'A deliberately very long authoritative expedition title that must remain live text',minLevel:1,syncLevel:1,available:true,enabledRoomTypes:['battle','forge' as unknown as CoopRoomType],difficulties:[1]});
equal(unknown.artId,undefined,'unknown art must use fallback');equal(unknown.enabledRoomTypes,['battle'],'unsupported rooms must be hidden');
const locked=presentCoopDungeon({id:'EXP_LOCKED',name:'Locked',minLevel:50,syncLevel:60,available:false,lockedReason:'Requires level 50',difficulties:[1]});validateCoopDungeonView(locked);
equal(filterCoopDungeons([rootbound,locked],'available').map(item=>item.id),['EXP_001'],'available filter failed');
equal(groupCoopDungeonsByRegion([rootbound,locked]).map(group=>[group.region,group.availableCount,group.dungeons.length]),[['Other',1,2]],'regional grouping failed');
const sortedRegion=groupCoopDungeonsByRegion([presentCoopDungeon({id:'LATE',name:'Late',region:'Sunscar',minLevel:36,syncLevel:45,available:true}),presentCoopDungeon({id:'EARLY',name:'Early',region:'Sunscar',minLevel:32,syncLevel:45,available:true})]);equal(sortedRegion[0].dungeons.map(item=>item.id),['EARLY','LATE'],'regional progression must sort by minimum level');
validateCoopEventExpeditionPreview({id:'EVENT_TEST',eventName:'Suncrest Games',name:'The Shattered Isles',description:'A seasonal route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',status:'preview',minLevel:45,rewardMarks:96});
let eventFailure='';try{validateCoopEventExpeditionPreview({id:'EVENT_BAD',eventName:'Starfall',name:'Rift',description:'Bad duplicate route.',routeHighlights:['Rift Gate','Rift Gate','Boss Nexus'],finalBoss:'The Constellation Eater',status:'preview',minLevel:70,rewardMarks:118})}catch(error){eventFailure=error instanceof Error?error.message:String(error)}equal(eventFailure,'invalid_event_route_highlights','event previews require three distinct route highlights');
equal(seasonalEventHasExpedition('EVT_ANNUAL_006_2026'),true,'Suncrest should expose its seasonal expedition');
equal(seasonalEventHasExpedition('EVT_ANNUAL_012_2026'),true,'Frostfall should expose its seasonal expedition');
equal(seasonalEventHasExpedition('EVT_ANNUAL_009_2026'),false,'Harvestwake should not invent an event dungeon');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_001_2026')?.name,'The Chronicle Vault','Turning should present Chronicle Vault');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_002_2026')?.finalBoss,'The Severed Vow','Heartbond should present its final boss');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_003_2026')?.routeHighlights,['Overgrown Shrine','Pollen Hollow','Rootbound Grove'],'Bloomwake route identity changed');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_006_2026')?.name,'The Shattered Isles','Suncrest route identity changed');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_008_2026')?.minLevel,70,'Starfall should remain the highest-level seasonal expedition');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_010_2026')?.name,'The Gloam Breach','Veilbreak route identity changed');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_011_2026')?.finalBoss,'The Coinbound Captain','Merchant final boss identity changed');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_012_2026')?.name,'Aurora Hollow','Frostfall route identity changed');
equal(seasonalEventExpeditionInfo('EVT_ANNUAL_009_2026'),undefined,'Harvestwake remains intentionally dungeonless');
let liveFailure='';try{validateCoopEventExpeditionPreview({id:'EVENT_LIVE',eventName:'Suncrest Games',name:'The Shattered Isles',description:'A seasonal route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',status:'available',minLevel:45,rewardMarks:96})}catch(error){liveFailure=error instanceof Error?error.message:String(error)}equal(liveFailure,'available_event_requires_live_event','live event cards require an authoritative LiveOps id');
let failure='';try{validateCoopDungeonView(presentCoopDungeon({id:'EXP_BAD',name:'Bad lock',minLevel:2,syncLevel:2,available:false,difficulties:[1]}))}catch(error){failure=error instanceof Error?error.message:String(error)}equal(failure,'locked_reason_required','locked reason must fail closed');
for(const language of SUPPORTED_LANGUAGES){equal(translatedCoopMessageCount(language),COOP_MESSAGE_COUNT,`${language} co-op catalog incomplete`);equal(Boolean(coopPolicyText(language,'fellowshipLabel')&&coopPolicyText(language,'fellowshipCopy').includes('25')),true,`${language} Live Fellowship copy incomplete`);}
console.log(`co-op dungeon browsing OK (${SUPPORTED_LANGUAGES.length} languages, ${COOP_MESSAGE_COUNT} messages each)`);
