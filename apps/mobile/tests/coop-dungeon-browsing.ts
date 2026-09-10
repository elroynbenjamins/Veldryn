import {coopTierEligibility,filterCoopDungeons,groupCoopDungeonsByRegion,presentCoopDungeon,validateCoopDungeonView,type CoopRoomType} from '../src/core/coop-dungeon-browsing';
import {validateCoopEventExpeditionPreview} from '../src/core/coop-event-expeditions';
import {COOP_MESSAGE_COUNT,SUPPORTED_LANGUAGES,translatedCoopMessageCount} from '../src/i18n';

function equal(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
const rootbound=presentCoopDungeon({id:'EXP_001',name:'Rootbound Vault',minLevel:15,recommendedLevel:25,syncLevel:25,available:true,enabledRoomTypes:['battle','elite','camp','boss'],difficulties:[1,2,3,4,5],preBossRoomMin:5,preBossRoomMax:5});
validateCoopDungeonView(rootbound);
equal([rootbound.id,rootbound.name,rootbound.minLevel,rootbound.recommendedLevel],['EXP_001','Rootbound Vault',15,25],'canonical EXP_001 changed');
equal(rootbound.heroArtId,'rootbound_hero','Rootbound hero art mapping changed');
equal(rootbound.estimatedMinutes,{min:6,max:8},'launch duration target changed');equal(rootbound.tierMinLevels,{1:15,2:20,3:25,4:30,5:35},'tier requirements changed');
equal(coopTierEligibility(rootbound,3,25),{eligible:true,requiredLevel:25},'eligible tier should open');equal(coopTierEligibility(rootbound,4,25),{eligible:false,requiredLevel:30},'under-level tier should fail closed');
const unknown=presentCoopDungeon({id:'EXP_UNKNOWN',name:'A deliberately very long authoritative expedition title that must remain live text',minLevel:1,syncLevel:1,available:true,enabledRoomTypes:['battle','forge' as unknown as CoopRoomType],difficulties:[1]});
equal(unknown.artId,undefined,'unknown art must use fallback');equal(unknown.enabledRoomTypes,['battle'],'unsupported rooms must be hidden');
const locked=presentCoopDungeon({id:'EXP_LOCKED',name:'Locked',minLevel:50,syncLevel:60,available:false,lockedReason:'Requires level 50',difficulties:[1]});validateCoopDungeonView(locked);
equal(filterCoopDungeons([rootbound,locked],'available').map(item=>item.id),['EXP_001'],'available filter failed');
equal(groupCoopDungeonsByRegion([rootbound,locked]).map(group=>[group.region,group.availableCount,group.dungeons.length]),[['Other',1,2]],'regional grouping failed');
const sortedRegion=groupCoopDungeonsByRegion([presentCoopDungeon({id:'LATE',name:'Late',region:'Sunscar',minLevel:36,syncLevel:45,available:true}),presentCoopDungeon({id:'EARLY',name:'Early',region:'Sunscar',minLevel:32,syncLevel:45,available:true})]);equal(sortedRegion[0].dungeons.map(item=>item.id),['EARLY','LATE'],'regional progression must sort by minimum level');
validateCoopEventExpeditionPreview({id:'EVENT_TEST',eventName:'Suncrest Games',name:'The Shattered Isles',description:'A seasonal route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],finalBoss:'Aureon, First Champion',status:'preview'});
let eventFailure='';try{validateCoopEventExpeditionPreview({id:'EVENT_BAD',eventName:'Starfall',name:'Rift',description:'Bad duplicate route.',routeHighlights:['Rift Gate','Rift Gate','Boss Nexus'],finalBoss:'The Constellation Eater',status:'preview'})}catch(error){eventFailure=error instanceof Error?error.message:String(error)}equal(eventFailure,'invalid_event_route_highlights','event previews require three distinct route highlights');
let failure='';try{validateCoopDungeonView(presentCoopDungeon({id:'EXP_BAD',name:'Bad lock',minLevel:2,syncLevel:2,available:false,difficulties:[1]}))}catch(error){failure=error instanceof Error?error.message:String(error)}equal(failure,'locked_reason_required','locked reason must fail closed');
for(const language of SUPPORTED_LANGUAGES)equal(translatedCoopMessageCount(language),COOP_MESSAGE_COUNT,`${language} co-op catalog incomplete`);
console.log(`co-op dungeon browsing OK (${SUPPORTED_LANGUAGES.length} languages, ${COOP_MESSAGE_COUNT} messages each)`);
