import type {ImageSourcePropType} from 'react-native';

export const GATHERING_TOOL_CELL=64;
export const GATHERING_TOOL_SHEET_WIDTH=256;
export const GATHERING_TOOL_SHEET_HEIGHT=192;
export const gatheringToolAtlas:ImageSourcePropType=require('../../assets/tools/gathering-tools-v2.png');

export interface GatheringToolCell{column:0|1|2|3;row:0|1|2}
export const gatheringToolCells:Record<string,GatheringToolCell>={
  COPPER_PICKAXE:{column:0,row:0},ASTER_IRON_PICKAXE:{column:1,row:0},OATHSTONE_PICKAXE:{column:2,row:0},FROSTIRON_PICKAXE:{column:3,row:0},
  GREENWOOD_HATCHET:{column:0,row:1},ASTER_IRON_HATCHET:{column:1,row:1},OATHSTONE_HATCHET:{column:2,row:1},FROSTIRON_HATCHET:{column:3,row:1},
  REEDLINE_ROD:{column:0,row:2},IRONWOOD_ROD:{column:1,row:2},OATHSCALE_ROD:{column:2,row:2},RIMEGLASS_ROD:{column:3,row:2},
};
