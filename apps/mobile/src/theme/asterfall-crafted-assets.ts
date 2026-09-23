import type {ImageSourcePropType} from 'react-native';

export const ASTERFALL_CRAFTED_CELL=64;
export const ASTERFALL_CRAFTED_SHEET_WIDTH=256;
export const ASTERFALL_CRAFTED_SHEET_HEIGHT=128;
export const asterfallCraftedSheet:ImageSourcePropType=require('../../assets/asterfall-crafted-v1.png');

export interface AsterfallCraftedCell{column:number;row:number;}
export const asterfallCraftedCellById:Readonly<Record<string,AsterfallCraftedCell>>={
  COPPER_INGOT:{column:0,row:0},
  ASTER_IRON_INGOT:{column:1,row:0},
  OATHSTONE_INGOT:{column:2,row:0},
  REINFORCED_FITTING:{column:3,row:0},
  COOKED_SILVERFIN:{column:0,row:1},
  SEARED_RIVER_EEL:{column:1,row:1},
  ROASTED_OATHSCALE:{column:2,row:1},
  IRONWOOD_STEW:{column:3,row:1},
};
export function asterfallCraftedCell(itemId:string){return asterfallCraftedCellById[itemId];}
export function hasAsterfallCraftedArtwork(itemId:string){return !!asterfallCraftedCell(itemId);}
