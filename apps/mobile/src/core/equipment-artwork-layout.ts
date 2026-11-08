/**
 * Equipment icons are cropped out of 5 × 2 sprite atlases. Every sheet is
 * authored to one template: square cells whose art sits in the middle ~76%,
 * leaving a ~12% margin. Taking 6% off each source cell hides the neighbouring
 * tile that filtering would otherwise bleed in at the frame edge, and seats the
 * icon in its frame without reaching the artwork.
 */
export const EQUIPMENT_ATLAS_COLUMNS=5;
export const EQUIPMENT_ATLAS_ROWS=2;
export const EQUIPMENT_ATLAS_CELLS=EQUIPMENT_ATLAS_COLUMNS*EQUIPMENT_ATLAS_ROWS;
export const EQUIPMENT_ARTWORK_INSET=.06;

export function equipmentArtworkLayout(slotIndex:number,size:number,aspect:number){
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=EQUIPMENT_ATLAS_CELLS)return null;
  if(!Number.isFinite(size)||size<=0)return null;
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const cellWidth=ratio>=1?size:size*ratio,cellHeight=ratio>=1?size/ratio:size;
  const inset=EQUIPMENT_ARTWORK_INSET,scale=1/(1-inset*2);
  return {
    inset,cellWidth,cellHeight,
    sheetWidth:cellWidth*EQUIPMENT_ATLAS_COLUMNS*scale,
    sheetHeight:cellHeight*EQUIPMENT_ATLAS_ROWS*scale,
    left:-((slotIndex%EQUIPMENT_ATLAS_COLUMNS)+inset)*cellWidth*scale,
    top:-(Math.floor(slotIndex/EQUIPMENT_ATLAS_COLUMNS)+inset)*cellHeight*scale,
  };
}
