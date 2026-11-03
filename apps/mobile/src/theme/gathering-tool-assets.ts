import type {ImageSourcePropType} from 'react-native';

// Each tool has its own transparent PNG. Do not crop the old 4x3 atlas at
// runtime: that introduced art fragments and incorrect framing at small sizes.
export const gatheringToolImages:Record<string,ImageSourcePropType>={
  COPPER_PICKAXE:require('../../assets/tools/individual/copper-pickaxe.png'),
  ASTER_IRON_PICKAXE:require('../../assets/tools/individual/aster-iron-pickaxe.png'),
  OATHSTONE_PICKAXE:require('../../assets/tools/individual/oathstone-pickaxe.png'),
  FROSTIRON_PICKAXE:require('../../assets/tools/individual/frostiron-pickaxe.png'),
  GREENWOOD_HATCHET:require('../../assets/tools/individual/greenwood-hatchet.png'),
  ASTER_IRON_HATCHET:require('../../assets/tools/individual/aster-iron-hatchet.png'),
  OATHSTONE_HATCHET:require('../../assets/tools/individual/oathstone-hatchet.png'),
  FROSTIRON_HATCHET:require('../../assets/tools/individual/frostiron-hatchet.png'),
  REEDLINE_ROD:require('../../assets/tools/individual/reedline-rod.png'),
  IRONWOOD_ROD:require('../../assets/tools/individual/ironwood-rod.png'),
  OATHSCALE_ROD:require('../../assets/tools/individual/oathscale-rod.png'),
  RIMEGLASS_ROD:require('../../assets/tools/individual/rimeglass-rod.png'),
};

export function hasGatheringToolArtwork(itemId:string):boolean{
  return Object.prototype.hasOwnProperty.call(gatheringToolImages,itemId);
}
