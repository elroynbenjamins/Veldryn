/** Unified generated Sunscar + Frostmarch resource atlas.
 * 5 columns × 4 rows, 64 px logical cells. Artwork is transparent and frame-free;
 * rarity framing remains a UI responsibility.
 */
export const REGIONAL_RESOURCE_SHEET_WIDTH=320;
export const REGIONAL_RESOURCE_SHEET_HEIGHT=256;
export const REGIONAL_RESOURCE_CELL=64;
export const regionalResourceSheet=require('../../assets/regional-resources-v1.png');

export interface RegionalResourceCell{column:number;row:number;}
export const regionalResourceCellById:Readonly<Record<string,RegionalResourceCell>>={
  SUNSTONE_ORE:{column:0,row:0},
  AMBERGLASS:{column:1,row:0},
  SAFFRON_REED:{column:2,row:0},
  MIRAGE_BLOOM:{column:3,row:0},
  DUNEWOOD:{column:4,row:0},

  CHARBARK:{column:0,row:1},
  OASIS_CARP:{column:1,row:1},
  GLASSFIN:{column:2,row:1},
  SCORPION_VENOM:{column:3,row:1},
  TYRANT_SEAL:{column:4,row:1},

  WHITEPINE_LOG:{column:0,row:2},
  RIME_RESIN:{column:1,row:2},
  WINTERMINT:{column:2,row:2},
  ICEFIN:{column:3,row:2},
  BELLFIN_SCALE:{column:4,row:2},

  WYRMSCALE:{column:0,row:3},
  FROZEN_HEART:{column:1,row:3},
  FROSTIRON:{column:2,row:3},
  RIMEGLASS:{column:3,row:3},
  CHOIR_BLOOM:{column:4,row:3},
};

export function regionalResourceCell(itemId:string){return regionalResourceCellById[itemId];}
export function hasRegionalResourceArtwork(itemId:string){return !!regionalResourceCell(itemId);}
