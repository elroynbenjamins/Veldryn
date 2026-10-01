import type {ProfileGuildIdentity,ProfileGuildCard} from '../core/profile-guild';
import {guildDetails,profileGuildByTag} from './social';

/** Resolve on click only. Local cards have explicit details and no server ID. */
export async function loadProfileGuildCard(identity:ProfileGuildIdentity):Promise<ProfileGuildCard>{
 if(!identity.id&&identity.name&&typeof identity.level==='number')return identity as ProfileGuildCard;
 const id=identity.id??(identity.tag?await profileGuildByTag(identity.tag):null)?.id;
 if(!id)throw new Error('Guild unavailable');
 const guild=await guildDetails(id);
 if(!guild)throw new Error('Guild unavailable');
 return {id:guild.id,name:guild.name,tag:guild.tag,tagColorId:guild.tag_color_id,nameColorId:guild.name_color_id,
  level:guild.level,bannerId:guild.banner_id,frameId:guild.profile_frame_id,backgroundId:guild.background_id,
  motto:guild.motto,memberCap:guild.member_cap};
}
