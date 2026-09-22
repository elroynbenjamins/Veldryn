import type {ImageSourcePropType} from 'react-native';
import chunk0 from './generated/asterfall-ores-v1-data-0';
import chunk1 from './generated/asterfall-ores-v1-data-1';
import chunk2 from './generated/asterfall-ores-v1-data-2';

export const ASTERFALL_ORE_CELL=48;
export const ASTERFALL_ORE_SHEET_WIDTH=192;
export const ASTERFALL_ORE_SHEET_HEIGHT=48;
export const asterfallOreSheet:ImageSourcePropType={
  uri:'data:image/png;base64,'+chunk0+chunk1+chunk2,
};

export interface AsterfallOreCell{column:number;row:number;}
export const asterfallOreCellById:Readonly<Record<string,AsterfallOreCell>>={
  COPPER_ORE:{column:0,row:0},
  ASTER_IRON_ORE:{column:1,row:0},
  OATHSTONE_ORE:{column:2,row:0},
  ECHO_QUARTZ:{column:3,row:0},
};

export function asterfallOreCell(itemId:string){return asterfallOreCellById[itemId];}
export function hasAsterfallOreArtwork(itemId:string){return !!asterfallOreCell(itemId);}
