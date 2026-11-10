import {assert} from './test-assert';
import {
  EQUIPMENT_ARTWORK_INSET,EQUIPMENT_ATLAS_CELLS,EQUIPMENT_ATLAS_COLUMNS,EQUIPMENT_ATLAS_ROWS,
  equipmentArtworkLayout,
} from '../src/core/equipment-artwork-layout';

assert.equal(EQUIPMENT_ATLAS_COLUMNS*EQUIPMENT_ATLAS_ROWS,EQUIPMENT_ATLAS_CELLS,'atlas grid matches the ten equipment slots');
assert.equal(EQUIPMENT_ATLAS_CELLS,10,'every set lays out ten pieces on one sheet');

assert.equal(equipmentArtworkLayout(-1,64,1),null,'unknown slots are not rendered');
assert.equal(equipmentArtworkLayout(EQUIPMENT_ATLAS_CELLS,64,1),null,'slots past the grid are not rendered');
assert.equal(equipmentArtworkLayout(1.5,64,1),null,'fractional slots are not rendered');
assert.equal(equipmentArtworkLayout(0,0,1),null,'zero-size sprites are not rendered');
assert.equal(equipmentArtworkLayout(0,Number.NaN,1),null,'invalid preview geometry fails quiet');

const scale=1/(1-EQUIPMENT_ARTWORK_INSET*2);
for(const size of [44,46,48,56,64,112]){
  for(let slotIndex=0;slotIndex<EQUIPMENT_ATLAS_CELLS;slotIndex++){
    const layout=equipmentArtworkLayout(slotIndex,size,1)!;
    const column=slotIndex%EQUIPMENT_ATLAS_COLUMNS,row=Math.floor(slotIndex/EQUIPMENT_ATLAS_COLUMNS);
    // The chosen cell must land exactly under the clipped frame.
    assert.ok(Math.abs(layout.left+(column+layout.inset)*layout.cellWidth*scale)<1e-8,'slot '+slotIndex+' aligns its column');
    assert.ok(Math.abs(layout.top+(row+layout.inset)*layout.cellHeight*scale)<1e-8,'slot '+slotIndex+' aligns its row');
    // The atlas always covers the frame, so no blank edge can show through.
    assert.ok(layout.left<=1e-8&&layout.top<=1e-8,'slot '+slotIndex+' never exposes blank space before the atlas');
    assert.ok(layout.left+layout.sheetWidth>=layout.cellWidth-1e-8,'slot '+slotIndex+' covers the frame horizontally');
    assert.ok(layout.top+layout.sheetHeight>=layout.cellHeight-1e-8,'slot '+slotIndex+' covers the frame vertically');
    assert.ok(Math.abs(layout.sheetWidth-layout.cellWidth*EQUIPMENT_ATLAS_COLUMNS*scale)<1e-8,'slot '+slotIndex+' keeps accurate 5 by 2 cropping');
    assert.equal(layout.inset,EQUIPMENT_ARTWORK_INSET,'every sheet shares one authored crop');
  }
  assert.equal(equipmentArtworkLayout(0,size,1)!.cellWidth,size,'square cells fill the requested frame');
}

// Non-square cells letterbox instead of stretching the art.
const wide=equipmentArtworkLayout(0,64,2)!,tall=equipmentArtworkLayout(0,64,.5)!;
assert.equal(wide.cellWidth,64,'wide cells pin to the frame width');
assert.equal(wide.cellHeight,32,'wide cells keep their authored ratio');
assert.equal(tall.cellWidth,32,'tall cells keep their authored ratio');
assert.equal(tall.cellHeight,64,'tall cells pin to the frame height');
assert.equal(equipmentArtworkLayout(0,64,0)!.cellWidth,64,'a missing ratio falls back to square cells');

console.log('PASS equipment atlas cropping keeps every slot framed without cutting artwork');
