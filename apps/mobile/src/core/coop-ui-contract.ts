export const COOP_UI_READY_ASSET_IDS=[
  'rootbound_hero','forest_thumbnail','lava_thumbnail','ice_thumbnail','sunken_thumbnail',
  'elite_room_art','camp_room_art','shrine_room_art',
  'node_battle','node_elite','node_event','node_shrine','node_camp','node_treasure','node_merchant','node_echo','node_risk','node_boss',
  'role_tank','role_damage','role_support',
  'boon_rooted','boon_growth','boon_resilience',
  'skill_guard','skill_bulwark','skill_strike','skill_rift',
] as const;

export type CoopUiAssetId=typeof COOP_UI_READY_ASSET_IDS[number];
export type CoopRole='tank'|'damage'|'support';
export const COOP_PRIMARY_TABS=['Home','Character','World','Inventory','More'] as const;

export function isCoopUiAssetId(value:unknown):value is CoopUiAssetId{
  return typeof value==='string'&&(COOP_UI_READY_ASSET_IDS as readonly string[]).includes(value);
}
