import type {ImageSourcePropType} from 'react-native';

export const ASTERFALL_GATHERING_CELL=256;
export const ASTERFALL_GATHERING_SHEET_WIDTH=768;
export const ASTERFALL_GATHERING_SHEET_HEIGHT=512;
export const asterfallGatheringSheet:ImageSourcePropType=require('../../assets/asterfall-logs-fish-v2.png');

export interface AsterfallGatheringCell{column:number;row:number;}
export const asterfallGatheringCellById:Readonly<Record<string,AsterfallGatheringCell>>={
  GREENWOOD_LOG:{column:0,row:0},
  IRONWOOD_LOG:{column:1,row:0},
  CROWNWOOD_LOG:{column:2,row:0},
  SILVERFIN:{column:0,row:1},
  RIVER_EEL:{column:1,row:1},
  OATHSCALE_PIKE:{column:2,row:1},
};
export function asterfallGatheringCell(itemId:string){return asterfallGatheringCellById[itemId];}
export function hasAsterfallGatheringArtwork(itemId:string){return !!asterfallGatheringCell(itemId);}
