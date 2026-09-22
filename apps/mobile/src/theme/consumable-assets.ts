import type {ImageSourcePropType} from 'react-native';
import herbs0 from './generated/herbs-v1-data-0';
import herbs1 from './generated/herbs-v1-data-1';
import herbs2 from './generated/herbs-v1-data-2';
import herbs3 from './generated/herbs-v1-data-3';
import potions0 from './generated/potions-v1-data-0';
import potions1 from './generated/potions-v1-data-1';
import potions2 from './generated/potions-v1-data-2';
import potions3 from './generated/potions-v1-data-3';

export const CONSUMABLE_ART_CELL=48;
export const CONSUMABLE_ART_SHEET_SIZE=144;

export const herbArtworkSheet:ImageSourcePropType={
  uri:'data:image/png;base64,'+herbs0+herbs1+herbs2+herbs3,
};
export const potionArtworkSheet:ImageSourcePropType={
  uri:'data:image/png;base64,'+potions0+potions1+potions2+potions3,
};

export type ConsumableArtworkSheet='herb'|'potion';
export interface ConsumableArtworkCell{sheet:ConsumableArtworkSheet;column:number;row:number;}

export const consumableArtworkCellById:Readonly<Record<string,ConsumableArtworkCell>>={
  DEWLEAF:{sheet:'herb',column:0,row:0},
  RIVER_MINT:{sheet:'herb',column:1,row:0},
  IRONBLOOM:{sheet:'herb',column:2,row:0},
  CAVELICHEN:{sheet:'herb',column:0,row:1},
  CROWN_SAGE:{sheet:'herb',column:1,row:1},
  OATHBLOSSOM:{sheet:'herb',column:2,row:1},
  SUNSCALE:{sheet:'herb',column:0,row:2},
  FROSTBLOOM:{sheet:'herb',column:1,row:2},
  ASHEN_MYRRH:{sheet:'herb',column:2,row:2},

  DEWLEAF_DRAUGHT:{sheet:'potion',column:0,row:0},
  RIVERHEART_DRAUGHT:{sheet:'potion',column:1,row:0},
  OATHBLOOM_DRAUGHT:{sheet:'potion',column:2,row:0},
  VIGOR_TONIC:{sheet:'potion',column:0,row:1},
  GREATER_VIGOR_TONIC:{sheet:'potion',column:1,row:1},
  OATH_VIGOR_TONIC:{sheet:'potion',column:2,row:1},
  WARD_TONIC:{sheet:'potion',column:0,row:2},
  GREATER_WARD_TONIC:{sheet:'potion',column:1,row:2},
  OATH_WARD_TONIC:{sheet:'potion',column:2,row:2},
};

export function consumableArtworkCell(itemId:string){return consumableArtworkCellById[itemId];}
export function hasConsumableArtwork(itemId:string){return !!consumableArtworkCell(itemId);}
export function consumableArtworkSheet(sheet:ConsumableArtworkSheet){return sheet==='herb'?herbArtworkSheet:potionArtworkSheet;}
