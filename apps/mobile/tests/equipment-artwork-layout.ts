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
    // The chosen cell lands inside its own clipped viewport, so scaling down
    // can never expose pixels from the cells on either side.
    assert.ok(Math.abs(layout.left+column*layout.artWidth)<1e-8,'slot '+slotIndex+' aligns its isolated column');
    assert.ok(Math.abs(layout.top+row*layout.artHeight)<1e-8,'slot '+slotIndex+' aligns its isolated row');
    assert.ok(Math.abs(layout.artWidth-layout.cellWidth*scale)<1e-8,'slot '+slotIndex+' scales the isolated cell width');
    assert.ok(Math.abs(layout.artHeight-layout.cellHeight*scale)<1e-8,'slot '+slotIndex+' scales the isolated cell height');
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

const fitted=equipmentArtworkLayout(6,64,1,.94)!;
assert.ok(fitted.artWidth<fitted.cellWidth,'fitted review art leaves breathing room inside the frame');
assert.equal(fitted.left,-fitted.artWidth,'the off-hand cell starts at its isolated atlas boundary');

console.log('PASS equipment atlas cropping isolates every slot before fitting artwork');
