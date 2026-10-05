import type {ImageSourcePropType} from 'react-native';
import type {CoopUiAssetId} from '../core/coop-ui-contract';

/** Metro-discoverable imports for the 28 pack assets marked ready. */
export const coopUiAssets:Record<CoopUiAssetId,ImageSourcePropType>={
  rootbound_hero:require('../../assets/coop-ui/illustrations/rootbound_hero.webp'),
  forest_thumbnail:require('../../assets/coop-ui/illustrations/forest_thumbnail.webp'),
  lava_thumbnail:require('../../assets/coop-ui/illustrations/lava_thumbnail.webp'),
  ice_thumbnail:require('../../assets/coop-ui/illustrations/ice_thumbnail.webp'),
  sunken_thumbnail:require('../../assets/coop-ui/illustrations/sunken_thumbnail.webp'),
  elite_room_art:require('../../assets/coop-ui/illustrations/elite_room_art.webp'),
  camp_room_art:require('../../assets/coop-ui/illustrations/camp_room_art.webp'),
  shrine_room_art:require('../../assets/coop-ui/illustrations/shrine_room_art.webp'),
  node_battle:require('../../assets/coop-ui/node_tiles/node_battle.webp'),
  node_elite:require('../../assets/coop-ui/node_tiles/node_elite.webp'),
  node_event:require('../../assets/coop-ui/node_tiles/node_event.webp'),
  node_shrine:require('../../assets/coop-ui/node_tiles/node_shrine.webp'),
  node_camp:require('../../assets/coop-ui/node_tiles/node_camp.webp'),
  node_treasure:require('../../assets/coop-ui/node_tiles/node_treasure.webp'),
  node_merchant:require('../../assets/coop-ui/node_tiles/node_merchant.webp'),
  node_echo:require('../../assets/coop-ui/node_tiles/node_echo.webp'),
  node_risk:require('../../assets/coop-ui/node_tiles/node_risk.webp'),
  node_boss:require('../../assets/coop-ui/node_tiles/node_boss.webp'),
  role_tank:require('../../assets/coop-ui/role_tiles/role_tank_v2.webp'),
  role_damage:require('../../assets/coop-ui/role_tiles/role_damage_v2.webp'),
  role_support:require('../../assets/coop-ui/role_tiles/role_support_v2.webp'),
  boon_rooted:require('../../assets/coop-ui/boon_tiles/boon_rooted.webp'),
  boon_growth:require('../../assets/coop-ui/boon_tiles/boon_growth.webp'),
  boon_resilience:require('../../assets/coop-ui/boon_tiles/boon_resilience.webp'),
  skill_guard:require('../../assets/coop-ui/skill_tiles/skill_guard.webp'),
  skill_bulwark:require('../../assets/coop-ui/skill_tiles/skill_bulwark.webp'),
  skill_strike:require('../../assets/coop-ui/skill_tiles/skill_strike.webp'),
  skill_rift:require('../../assets/coop-ui/skill_tiles/skill_rift.webp'),
};
