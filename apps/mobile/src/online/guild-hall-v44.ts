import {supabase} from './supabase';
import {myGuild} from './social';
import {GUILD_HALL_FACILITIES,guildHallBenefits,guildHallFacilityTier,guildHallLevel,guildHallVisualStage,newGuildHallState,type GuildHallFacilityId,type GuildHallState,type GuildHallTrophy} from '../core/guild-hall-v44';

type HallRow={guild_id:string;hall_progress:number|string;lifetime_projects_completed:number;facilities:Record<string,{facilityId?:string;progress?:number;updatedAtMs?:number}>|null;revision:number;created_at:string;updated_at:string};
type TrophyRow={trophy_key:string;label:string;description:string;source_kind:string;source_id:string;earned_at:string};
function requireClient(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}

export async function loadOnlineGuildHallV44():Promise<{state:GuildHallState;level:number;stage:string;benefits:ReturnType<typeof guildHallBenefits>}|null>{
 const membership=await myGuild();if(!membership)return null;
 const client=requireClient();
 const [{data:hall,error:hallError},{data:trophies,error:trophyError}]=await Promise.all([
   client.from('guild_halls').select('guild_id,hall_progress,lifetime_projects_completed,facilities,revision,created_at,updated_at').eq('guild_id',membership.guild_id).maybeSingle(),
   client.from('guild_hall_trophies').select('trophy_key,label,description,source_kind,source_id,earned_at').eq('guild_id',membership.guild_id).order('earned_at',{ascending:false}).limit(100),
 ]);
 if(hallError)throw hallError;if(trophyError)throw trophyError;
 const now=Date.now(),state=newGuildHallState(membership.guild_id,now);
 if(hall){
   const row=hall as HallRow;state.hallProgress=Math.max(0,Number(row.hall_progress)||0);state.lifetimeProjectsCompleted=Math.max(0,Math.floor(Number(row.lifetime_projects_completed)||0));state.revision=Math.max(0,Math.floor(Number(row.revision)||0));state.createdAtMs=Date.parse(row.created_at)||now;state.updatedAtMs=Date.parse(row.updated_at)||now;
   const level=guildHallLevel(state.hallProgress);
   for(const definition of GUILD_HALL_FACILITIES){const raw=row.facilities?.[definition.id],progress=Math.max(0,Math.floor(Number(raw?.progress)||0));state.facilities[definition.id]={facilityId:definition.id,progress,tier:guildHallFacilityTier(definition.id,progress,level),updatedAtMs:Math.max(0,Math.floor(Number(raw?.updatedAtMs)||state.updatedAtMs))};}
 }
 state.trophies=(trophies??[]).map((row:TrophyRow):GuildHallTrophy=>({trophyKey:row.trophy_key,label:row.label,description:row.description,sourceKind:row.source_kind,sourceId:row.source_id,earnedAtMs:Date.parse(row.earned_at)||0}));
 const level=guildHallLevel(state.hallProgress);return{state,level,stage:guildHallVisualStage(level),benefits:guildHallBenefits(state)};
}
