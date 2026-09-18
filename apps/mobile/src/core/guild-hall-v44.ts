export type GuildHallFacilityId='banner_gallery'|'trophy_room'|'training_room'|'workshop'|'expedition_board'|'raid_memorial';
export interface GuildHallFacilityDefinition{id:GuildHallFacilityId;name:string;description:string;tierHallLevels:number[]}
export interface GuildHallFacilityState{facilityId:GuildHallFacilityId;progress:number;tier:number;updatedAtMs:number}
export interface GuildHallTrophy{trophyKey:string;label:string;description:string;sourceKind:string;sourceId:string;earnedAtMs:number}
export interface GuildHallState{schemaVersion:44;guildId:string;revision:number;hallProgress:number;lifetimeProjectsCompleted:number;facilities:Record<GuildHallFacilityId,GuildHallFacilityState>;trophies:GuildHallTrophy[];createdAtMs:number;updatedAtMs:number}
export interface GuildHallPolicy{enabled:boolean;hallLevelThresholds:number[];facilityProgressThresholds:number[];maxStoredTrophies:number;baseDisplayedTrophies:number;trainingXpBpsPerTier:number;workshopSpeedBpsPerTier:number;maxTrainingXpBps:number;maxWorkshopSpeedBps:number;maxExtraProjectDraftChoices:number}

export const DEFAULT_GUILD_HALL_POLICY:GuildHallPolicy={
 enabled:true,hallLevelThresholds:[0,200,500,900,1400,2000,2700,3500,4400,5400,6500,7700,9000,10400,11900,13500,15200,17000,18900,20900],
 facilityProgressThresholds:[250,850,1850,3350,5450],maxStoredTrophies:100,baseDisplayedTrophies:2,
 trainingXpBpsPerTier:10,workshopSpeedBpsPerTier:10,maxTrainingXpBps:50,maxWorkshopSpeedBps:50,maxExtraProjectDraftChoices:2
};
export const GUILD_HALL_FACILITIES:GuildHallFacilityDefinition[]=[
 {id:'banner_gallery',name:'Banner Gallery',description:'Unlocks guild-banner presentation options.',tierHallLevels:[1,4,8,12,16]},
 {id:'trophy_room',name:'Trophy Room',description:'Archives accomplishments and expands visible trophy slots.',tierHallLevels:[3,6,10,14,18]},
 {id:'training_room',name:'Training Room',description:'Tiny skill-XP convenience bonus for members.',tierHallLevels:[5,8,11,14,17]},
 {id:'workshop',name:'Guild Workshop',description:'Tiny crafting/processing speed convenience bonus.',tierHallLevels:[7,10,13,16,19]},
 {id:'expedition_board',name:'Expedition Board',description:'Adds Guild Project draft choices, never active-project or reward limits.',tierHallLevels:[9,12,15,18,20]},
 {id:'raid_memorial',name:'Raid Memorial',description:'Permanent raid history and presentation progression.',tierHallLevels:[12,14,16,18,20]},
];
const defs=new Map(GUILD_HALL_FACILITIES.map(row=>[row.id,row]));
export function newGuildHallState(guildId:string,nowMs:number):GuildHallState{const facilities={} as Record<GuildHallFacilityId,GuildHallFacilityState>;for(const d of GUILD_HALL_FACILITIES)facilities[d.id]={facilityId:d.id,progress:0,tier:0,updatedAtMs:nowMs};return {schemaVersion:44,guildId,revision:0,hallProgress:0,lifetimeProjectsCompleted:0,facilities,trophies:[],createdAtMs:nowMs,updatedAtMs:nowMs}}
export function guildHallLevel(progress:number,policy=DEFAULT_GUILD_HALL_POLICY){let level=1;for(let i=1;i<policy.hallLevelThresholds.length;i++){if(progress>=policy.hallLevelThresholds[i])level=i+1;else break}return level}
export function guildHallFacilityTier(id:GuildHallFacilityId,progress:number,hallLevel:number,policy=DEFAULT_GUILD_HALL_POLICY){const def=defs.get(id);if(!def)throw new Error('unknown_facility');let tier=0;for(let i=0;i<5;i++){if(hallLevel>=def.tierHallLevels[i]&&progress>=policy.facilityProgressThresholds[i])tier=i+1;else break}return tier}
function recalc(state:GuildHallState,policy=DEFAULT_GUILD_HALL_POLICY){const level=guildHallLevel(state.hallProgress,policy);for(const d of GUILD_HALL_FACILITIES)state.facilities[d.id].tier=guildHallFacilityTier(d.id,state.facilities[d.id].progress,level,policy)}
export function applyGuildHallProjectCompletion(state:GuildHallState,event:{eventId:string;guildId:string;completedAtMs:number;hallProgressAward:number;facilityContribution?:{facilityId:GuildHallFacilityId;progressAward:number}},policy=DEFAULT_GUILD_HALL_POLICY){
 if(event.guildId!==state.guildId)throw new Error('guild_mismatch');if(!Number.isSafeInteger(event.hallProgressAward)||event.hallProgressAward<=0)throw new Error('invalid_hall_progress_award');
 const beforeLevel=guildHallLevel(state.hallProgress,policy),before=Object.fromEntries(Object.entries(state.facilities).map(([k,v])=>[k,v.tier])) as Record<GuildHallFacilityId,number>;
 state.hallProgress+=event.hallProgressAward;state.lifetimeProjectsCompleted++;state.updatedAtMs=event.completedAtMs;
 if(event.facilityContribution){const f=state.facilities[event.facilityContribution.facilityId];if(!f)throw new Error('unknown_facility');if(!Number.isSafeInteger(event.facilityContribution.progressAward)||event.facilityContribution.progressAward<0)throw new Error('invalid_facility_progress_award');f.progress+=event.facilityContribution.progressAward;f.updatedAtMs=event.completedAtMs}
 recalc(state,policy);
 return {beforeLevel,afterLevel:guildHallLevel(state.hallProgress,policy),upgradedFacilities:GUILD_HALL_FACILITIES.filter(d=>state.facilities[d.id].tier>before[d.id]).map(d=>({facilityId:d.id,fromTier:before[d.id],toTier:state.facilities[d.id].tier}))};
}
export function guildHallBenefits(state:GuildHallState,policy=DEFAULT_GUILD_HALL_POLICY){return {skillXpBonusBps:Math.min(policy.maxTrainingXpBps,state.facilities.training_room.tier*policy.trainingXpBpsPerTier),craftingProcessingSpeedBps:Math.min(policy.maxWorkshopSpeedBps,state.facilities.workshop.tier*policy.workshopSpeedBpsPerTier),extraProjectDraftChoices:Math.min(policy.maxExtraProjectDraftChoices,state.facilities.expedition_board.tier>=4?2:state.facilities.expedition_board.tier>=2?1:0)}}
export function guildHallVisualStage(level:number){return level>=20?'Legendary Hall':level>=15?'Great Hall':level>=10?'Grand Hall':level>=5?'Established Hall':'Foundations'}
