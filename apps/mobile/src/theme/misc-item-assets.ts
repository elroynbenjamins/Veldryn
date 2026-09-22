import type {ImageSourcePropType} from 'react-native';
import misc0 from './generated/misc-items-v1-data-0';
import misc1 from './generated/misc-items-v1-data-1';
import misc2 from './generated/misc-items-v1-data-2';
import misc3 from './generated/misc-items-v1-data-3';

export const MISC_ITEM_CELL=48;
export const MISC_ITEM_SHEET_WIDTH=240;
export const MISC_ITEM_SHEET_HEIGHT=96;
export const miscItemSheet:ImageSourcePropType={uri:'data:image/png;base64,'+misc0+misc1+misc2+misc3};

export interface MiscItemCell{column:number;row:number;}
export const miscItemCellById:Readonly<Record<string,MiscItemCell>>={
  ROYAL_CHITIN:{column:0,row:0},
  BOAR_HIDE:{column:1,row:0},
  WOLF_PELT:{column:2,row:0},
  IRONWOOD_FANG:{column:3,row:0},
  BLACKGLASS_CORE:{column:4,row:0},

  CINDER_HEART:{column:0,row:1},
  REGENT_SIGIL:{column:1,row:1},
  EVENT_BONDBLOOM:{column:2,row:1},
  TRAVEL_RATION:{column:3,row:1},
  FALLEN_KNIGHT_SIGIL:{column:4,row:1},
};

export function miscItemCell(itemId:string){return miscItemCellById[itemId];}
export function hasMiscItemArtwork(itemId:string){return !!miscItemCell(itemId);}
