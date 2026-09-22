/** Unified remaining item artwork atlas.
 * 9 columns × 4 rows, 64 px logical cells.
 * Covers the remaining runtime herbs, potions, materials, food and quest item
 * that previously fell back to a generic inventory icon.
 */
export const REMAINING_ITEM_SHEET_WIDTH=576;
export const REMAINING_ITEM_SHEET_HEIGHT=256;
export const REMAINING_ITEM_CELL=64;
export const remainingItemSheet=require('../../assets/remaining-items-v1.png');

export interface RemainingItemCell{column:number;row:number;}
export const remainingItemCellById:Readonly<Record<string,RemainingItemCell>>={
  DEWLEAF:{column:0,row:0},
  RIVER_MINT:{column:1,row:0},
  IRONBLOOM:{column:2,row:0},
  CAVELICHEN:{column:3,row:0},
  CROWN_SAGE:{column:4,row:0},
  OATHBLOSSOM:{column:5,row:0},
  SUNSCALE:{column:6,row:0},
  FROSTBLOOM:{column:7,row:0},
  ASHEN_MYRRH:{column:8,row:0},

  DEWLEAF_DRAUGHT:{column:0,row:1},
  RIVERHEART_DRAUGHT:{column:1,row:1},
  OATHBLOOM_DRAUGHT:{column:2,row:1},
  VIGOR_TONIC:{column:3,row:1},
  GREATER_VIGOR_TONIC:{column:4,row:1},
  OATH_VIGOR_TONIC:{column:5,row:1},
  WARD_TONIC:{column:6,row:1},
  GREATER_WARD_TONIC:{column:7,row:1},
  OATH_WARD_TONIC:{column:8,row:1},

  ROYAL_CHITIN:{column:0,row:2},
  BOAR_HIDE:{column:1,row:2},
  WOLF_PELT:{column:2,row:2},
  IRONWOOD_FANG:{column:3,row:2},
  BLACKGLASS_CORE:{column:4,row:2},
  CINDER_HEART:{column:5,row:2},
  REGENT_SIGIL:{column:6,row:2},
  EVENT_BONDBLOOM:{column:7,row:2},
  TRAVEL_RATION:{column:8,row:2},

  FALLEN_KNIGHT_SIGIL:{column:0,row:3},
};

export function remainingItemCell(itemId:string){return remainingItemCellById[itemId];}
export function hasRemainingItemArtwork(itemId:string){return !!remainingItemCell(itemId);}
