import type {ImageSourcePropType} from 'react-native';

export const CONSUMABLE_ART_CELL=48;
export const CONSUMABLE_ART_SHEET_SIZE=144;

export const herbArtworkSheet:ImageSourcePropType=require('../../assets/consumables-herb-v2.png');
export const potionArtworkSheet:ImageSourcePropType=require('../../assets/consumables-potion-v2.png');

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
