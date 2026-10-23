/**
 * Every starter weapon uses one cell of the authored 3 × 3 sprite atlas.
 * Keep crop geometry independent of the source image's pixel dimensions so
 * the same artwork fits class creation, inventory and enlarged previews.
 */
export const STARTER_WEAPON_CELLS={
  basic_sword:{column:0,row:0},basic_tower_shield:{column:1,row:0},basic_chained_weapon:{column:2,row:0},
  basic_bow:{column:0,row:1},basic_two_handed_weapon:{column:1,row:1},basic_wand:{column:2,row:1},
  basic_main_hand_blade:{column:0,row:2},basic_mace:{column:1,row:2},basic_staff:{column:2,row:2},
} as const;

const ATLAS_COLUMNS=3;
const DEFAULT_INSET=.06;
// The bow nearly fills its source cell vertically; extra breathing room keeps
// both tips in view even in small onboarding and equipment thumbnails.
const BOW_INSET=.14;

export function starterWeaponArtworkLayout(itemId:string,size:number){
  const cell=STARTER_WEAPON_CELLS[itemId as keyof typeof STARTER_WEAPON_CELLS];
  if(!cell||!Number.isFinite(size)||size<=0)return null;
  const inset=itemId==='basic_bow'?BOW_INSET:DEFAULT_INSET;
  const displaySize=size*(1-inset*2),offset=size*inset;
  return {
    ...cell,inset,displaySize,
    sheetSize:ATLAS_COLUMNS*displaySize,
    left:offset-cell.column*displaySize,
    top:offset-cell.row*displaySize,
  };
}
