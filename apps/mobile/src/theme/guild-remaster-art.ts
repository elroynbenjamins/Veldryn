import type {ImageSourcePropType} from 'react-native';

const skillArtwork=new Map<string,ImageSourcePropType>([
 ['professions_gathering',require('../../assets/guild-remaster/skills/professions_gathering.webp')],
 ['professions_crafting',require('../../assets/guild-remaster/skills/professions_crafting.webp')],
 ['professions_mastery',require('../../assets/guild-remaster/skills/professions_mastery.webp')],
 ['fellowship_membership',require('../../assets/guild-remaster/skills/fellowship_membership.webp')],
 ['fellowship_quests',require('../../assets/guild-remaster/skills/fellowship_quests.webp')],
 ['fellowship_projects',require('../../assets/guild-remaster/skills/fellowship_projects.webp')],
 ['vanguard_boss',require('../../assets/guild-remaster/skills/vanguard_boss.webp')],
 ['vanguard_defence',require('../../assets/guild-remaster/skills/vanguard_defence.webp')],
 ['vanguard_support',require('../../assets/guild-remaster/skills/vanguard_support.webp')],
]);

const facilityArtwork=new Map<string,ImageSourcePropType>([
 ['banner_gallery',require('../../assets/guild-remaster/facilities/banner_gallery.webp')],
 ['trophy_room',require('../../assets/guild-remaster/facilities/trophy_room.webp')],
 ['training_room',require('../../assets/guild-remaster/facilities/training_room.webp')],
 ['workshop',require('../../assets/guild-remaster/facilities/workshop.webp')],
 ['expedition_board',require('../../assets/guild-remaster/facilities/expedition_board.webp')],
 ['raid_memorial',require('../../assets/guild-remaster/facilities/raid_memorial.webp')],
]);

const projectArtwork=new Map<string,ImageSourcePropType>([
 ['guild_weekly_borderwatch',require('../../assets/guild-remaster/projects/guild_weekly_borderwatch.webp')],
 ['guild_weekly_warden_call',require('../../assets/guild-remaster/projects/guild_weekly_warden_call.webp')],
 ['guild_weekly_elite_suppression',require('../../assets/guild-remaster/projects/guild_weekly_elite_suppression.webp')],
 ['guild_weekly_road_relief',require('../../assets/guild-remaster/projects/guild_weekly_road_relief.webp')],
 ['guild_weekly_makers_drive',require('../../assets/guild-remaster/projects/guild_weekly_makers_drive.webp')],
 ['guild_weekly_reconstruction',require('../../assets/guild-remaster/projects/guild_weekly_reconstruction.webp')],
 ['guild_weekly_rift_containment',require('../../assets/guild-remaster/projects/guild_weekly_rift_containment.webp')],
 ['guild_weekly_frontier_relief',require('../../assets/guild-remaster/projects/guild_weekly_frontier_relief.webp')],
 ['guild_weekly_watchtower',require('../../assets/guild-remaster/projects/guild_weekly_watchtower.webp')],
 ['guild_dev_reinforce_hall',require('../../assets/guild-remaster/projects/guild_dev_reinforce_hall.webp')],
 ['guild_dev_stock_lodge',require('../../assets/guild-remaster/projects/guild_dev_stock_lodge.webp')],
 ['guild_dev_runebound_research',require('../../assets/guild-remaster/projects/guild_dev_runebound_research.webp')],
 ['guild_dev_war_standards',require('../../assets/guild-remaster/projects/guild_dev_war_standards.webp')],
 ['guild_weekly_shared_effort',require('../../assets/guild-remaster/projects/guild_weekly_shared_effort.webp')],
]);

export const guildSkillArtwork=(id:string)=>skillArtwork.get(id);
export const guildFacilityArtwork=(id:string)=>facilityArtwork.get(id);
export const guildProjectArtwork=(id:string)=>projectArtwork.get(id);
