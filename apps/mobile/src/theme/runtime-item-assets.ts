/** Unified runtime item atlas for previously missing inventory visuals.
 * 7 columns × 4 rows, 48 px cells. The atlas is transparent and frame-free.
 */
export const RUNTIME_ITEM_SHEET_WIDTH=336;
export const RUNTIME_ITEM_SHEET_HEIGHT=192;
export const RUNTIME_ITEM_CELL=48;
export const runtimeItemSheet=require('../../assets/runtime-missing-items-v1.png');

export interface RuntimeItemCell{column:number;row:number;}
export const runtimeItemCellById:Readonly<Record<string,RuntimeItemCell>>={
  DEWLEAF:{column:0,row:0},
  RIVER_MINT:{column:1,row:0},
  IRONBLOOM:{column:2,row:0},
  CAVELICHEN:{column:3,row:0},
  CROWN_SAGE:{column:4,row:0},
  OATHBLOSSOM:{column:5,row:0},
  SUNSCALE:{column:6,row:0},

  FROSTBLOOM:{column:0,row:1},
  ASHEN_MYRRH:{column:1,row:1},
  DEWLEAF_DRAUGHT:{column:2,row:1},
  RIVERHEART_DRAUGHT:{column:3,row:1},
  OATHBLOOM_DRAUGHT:{column:4,row:1},
  VIGOR_TONIC:{column:5,row:1},
  GREATER_VIGOR_TONIC:{column:6,row:1},

  OATH_VIGOR_TONIC:{column:0,row:2},
  WARD_TONIC:{column:1,row:2},
  GREATER_WARD_TONIC:{column:2,row:2},
  OATH_WARD_TONIC:{column:3,row:2},
  ROYAL_CHITIN:{column:4,row:2},
  BOAR_HIDE:{column:5,row:2},
  WOLF_PELT:{column:6,row:2},

  IRONWOOD_FANG:{column:0,row:3},
  BLACKGLASS_CORE:{column:1,row:3},
  CINDER_HEART:{column:2,row:3},
  REGENT_SIGIL:{column:3,row:3},
  EVENT_BONDBLOOM:{column:4,row:3},
  TRAVEL_RATION:{column:5,row:3},
  FALLEN_KNIGHT_SIGIL:{column:6,row:3},
};

export function runtimeItemCell(itemId:string){return runtimeItemCellById[itemId];}
export function hasRuntimeItemArtwork(itemId:string){return !!runtimeItemCell(itemId);}
