import type {ImageSourcePropType} from 'react-native';

const skillArtwork=new Map<string,ImageSourcePropType>([
 ['professions_gathering',require('../../assets/guild-remaster/skills/professions_gathering.png')],
 ['professions_crafting',require('../../assets/guild-remaster/skills/professions_crafting.png')],
 ['professions_mastery',require('../../assets/guild-remaster/skills/professions_mastery.png')],
 ['fellowship_membership',require('../../assets/guild-remaster/skills/fellowship_membership.png')],
 ['fellowship_quests',require('../../assets/guild-remaster/skills/fellowship_quests.png')],
 ['fellowship_projects',require('../../assets/guild-remaster/skills/fellowship_projects.png')],
 ['vanguard_boss',require('../../assets/guild-remaster/skills/vanguard_boss.png')],
 ['vanguard_defence',require('../../assets/guild-remaster/skills/vanguard_defence.png')],
 ['vanguard_support',require('../../assets/guild-remaster/skills/vanguard_support.png')],
]);

const facilityArtwork=new Map<string,ImageSourcePropType>([
 ['banner_gallery',require('../../assets/guild-remaster/facilities/banner_gallery.png')],
 ['trophy_room',require('../../assets/guild-remaster/facilities/trophy_room.png')],
 ['training_room',require('../../assets/guild-remaster/facilities/training_room.png')],
 ['workshop',require('../../assets/guild-remaster/facilities/workshop.png')],
 ['expedition_board',require('../../assets/guild-remaster/facilities/expedition_board.png')],
 ['raid_memorial',require('../../assets/guild-remaster/facilities/raid_memorial.png')],
]);

const projectArtwork=new Map<string,ImageSourcePropType>([
 ['guild_weekly_borderwatch',require('../../assets/guild-remaster/projects/guild_weekly_borderwatch.png')],
 ['guild_weekly_warden_call',require('../../assets/guild-remaster/projects/guild_weekly_warden_call.png')],
 ['guild_weekly_elite_suppression',require('../../assets/guild-remaster/projects/guild_weekly_elite_suppression.png')],
 ['guild_weekly_road_relief',require('../../assets/guild-remaster/projects/guild_weekly_road_relief.png')],
 ['guild_weekly_makers_drive',require('../../assets/guild-remaster/projects/guild_weekly_makers_drive.png')],
 ['guild_weekly_reconstruction',require('../../assets/guild-remaster/projects/guild_weekly_reconstruction.png')],
 ['guild_weekly_rift_containment',require('../../assets/guild-remaster/projects/guild_weekly_rift_containment.png')],
 ['guild_weekly_frontier_relief',require('../../assets/guild-remaster/projects/guild_weekly_frontier_relief.png')],
 ['guild_weekly_watchtower',require('../../assets/guild-remaster/projects/guild_weekly_watchtower.png')],
 ['guild_dev_reinforce_hall',require('../../assets/guild-remaster/projects/guild_dev_reinforce_hall.png')],
 ['guild_dev_stock_lodge',require('../../assets/guild-remaster/projects/guild_dev_stock_lodge.png')],
 ['guild_dev_runebound_research',require('../../assets/guild-remaster/projects/guild_dev_runebound_research.png')],
 ['guild_dev_war_standards',require('../../assets/guild-remaster/projects/guild_dev_war_standards.png')],
 ['guild_weekly_shared_effort',require('../../assets/guild-remaster/projects/guild_weekly_shared_effort.png')],
]);

export const guildSkillArtwork=(id:string)=>skillArtwork.get(id);
export const guildFacilityArtwork=(id:string)=>facilityArtwork.get(id);
export const guildProjectArtwork=(id:string)=>projectArtwork.get(id);
