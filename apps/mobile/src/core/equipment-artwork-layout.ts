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
export const EQUIPMENT_ARTWORK_DEFAULT_SCALE=1/(1-EQUIPMENT_ARTWORK_INSET*2);

export function equipmentArtworkLayout(slotIndex:number,size:number,aspect:number,artScale=EQUIPMENT_ARTWORK_DEFAULT_SCALE){
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=EQUIPMENT_ATLAS_CELLS)return null;
  if(!Number.isFinite(size)||size<=0)return null;
  const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
  const cellWidth=ratio>=1?size:size*ratio,cellHeight=ratio>=1?size/ratio:size;
  const inset=EQUIPMENT_ARTWORK_INSET,scale=Number.isFinite(artScale)&&artScale>0?artScale:EQUIPMENT_ARTWORK_DEFAULT_SCALE;
  const artWidth=cellWidth*scale,artHeight=cellHeight*scale;
  return {
    inset,cellWidth,cellHeight,artWidth,artHeight,
    sheetWidth:cellWidth*EQUIPMENT_ATLAS_COLUMNS*scale,
    sheetHeight:cellHeight*EQUIPMENT_ATLAS_ROWS*scale,
    // These offsets are relative to an isolated one-cell viewport. The outer
    // artwork frame centers that viewport, preventing adjacent atlas cells
    // from becoming visible when a review scale is smaller than 1.
    left:-(slotIndex%EQUIPMENT_ATLAS_COLUMNS)*artWidth,
    top:-Math.floor(slotIndex/EQUIPMENT_ATLAS_COLUMNS)*artHeight,
  };
}
