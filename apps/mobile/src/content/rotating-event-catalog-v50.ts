import type {RotatingEventCatalog,RotatingEventDefinition,RotatingEventReward,RotatingEventTask} from '../core/rotating-events-v50';
const utc=(year:number,month:number,day:number)=>Date.UTC(year,month-1,day);
const rewards:RotatingEventReward[]=[
 {id:'frost_preview_pet',name:'Aurora Fox',kind:'pet',rarity:'epic',refId:'PENDING_FROST_AURORA_FOX',featured:true,imageKey:'event/frostfall/aurora_fox'},
 {id:'frost_preview_frame',name:'Frostfall Frame',kind:'profile',rarity:'rare',refId:'PENDING_PROFILE_FRAME_FROSTFALL'},
 {id:'veil_preview_pet',name:'Lantern Wisp',kind:'pet',rarity:'epic',refId:'PENDING_VEIL_WISP',featured:true},
 {id:'starfall_preview_material',name:'Starfall Materials',kind:'material',rarity:'rare',quantity:25,refId:'PENDING_STARFALL_MATERIAL'},
];
const tasks:RotatingEventTask[]=[
 {id:'frost_actions',label:'Complete 120 eligible actions',target:120,metric:'eligible_action',rewardIds:['frost_preview_frame']},
 {id:'veil_contracts',label:'Complete 8 Veilbreak contracts',target:8,metric:'event_contract_clear',rewardIds:['veil_preview_pet']},
 {id:'starfall_gather',label:'Gather 250 Starfall resources',target:250,metric:'event_resource_gathered',rewardIds:['starfall_preview_material']},
];
const event=(row:Omit<RotatingEventDefinition,'communityModuleEnabled'>):RotatingEventDefinition=>({...row,communityModuleEnabled:false});
const events:RotatingEventDefinition[]=[
 event({id:'frostfall',title:'Frostfall Festival',subtitle:'Warm hearts in a brighter tomorrow.',shortDescription:'Winter activities, collections and account-bound rewards.',startsAtMs:utc(2026,12,1),endsAtMs:utc(2026,12,29),graceEndsAtMs:utc(2026,12,31),modules:['overview','rewards','tasks','collection','pets','companions'],theme:{accent:'#71c9ff',accentAlt:'#a879ff',backgroundKey:'event/frostfall/background',bannerKey:'event/frostfall/banner',iconKey:'snowflake'},rewardIds:['frost_preview_pet','frost_preview_frame'],taskIds:['frost_actions'],featuredPetIds:[],featuredCompanionIds:[],collectionIds:[],enabled:false,priority:50}),
 event({id:'veilbreak',title:'The Veilbreak',subtitle:'Face what walks between worlds.',shortDescription:'Contracts, collections and eerie cosmetics.',startsAtMs:utc(2026,10,10),endsAtMs:utc(2026,11,2),graceEndsAtMs:utc(2026,11,4),modules:['overview','rewards','tasks','collection','pets'],theme:{accent:'#bb69f3',accentAlt:'#ef6670',backgroundKey:'event/veilbreak/background',bannerKey:'event/veilbreak/banner',iconKey:'veil'},rewardIds:['veil_preview_pet'],taskIds:['veil_contracts'],featuredPetIds:[],featuredCompanionIds:[],collectionIds:[],enabled:false,priority:50}),
 event({id:'starfall',title:'Starfall Nights',subtitle:'Follow the lights across Veldryn.',shortDescription:'Nighttime discoveries, gathering rewards and celestial collectibles.',startsAtMs:utc(2027,8,1),endsAtMs:utc(2027,8,22),graceEndsAtMs:utc(2027,8,24),modules:['overview','rewards','tasks','collection','pets'],theme:{accent:'#4db9ff',accentAlt:'#bb69f3',backgroundKey:'event/starfall/background',bannerKey:'event/starfall/banner',iconKey:'star'},rewardIds:['starfall_preview_material'],taskIds:['starfall_gather'],featuredPetIds:[],featuredCompanionIds:[],collectionIds:[],enabled:false,priority:40}),
];
/** Authoring templates only. They stay disabled until real canonical reward/content IDs replace PENDING refs. */
export const ROTATING_EVENT_CATALOG_V50:RotatingEventCatalog={events,rewards,tasks};
