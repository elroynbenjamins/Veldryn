import {assert} from './test-assert';
import {
  GATHERING_TOOL_CELL,
  GATHERING_TOOL_SHEET_HEIGHT,
  GATHERING_TOOL_SHEET_WIDTH,
  gatheringToolArtworkLayout,
} from '../src/core/gathering-tool-artwork-layout';

assert.equal(GATHERING_TOOL_SHEET_WIDTH,1448,'four atlas columns');
assert.equal(GATHERING_TOOL_SHEET_HEIGHT,1086,'three atlas rows');
assert.equal(gatheringToolArtworkLayout(0,0,0),null,'zero-sized thumbnails are ignored');
assert.equal(gatheringToolArtworkLayout(0,0,Number.NaN),null,'invalid sizes are ignored');
assert.equal(gatheringToolArtworkLayout(-1,0,48),null,'invalid columns are ignored');
assert.equal(gatheringToolArtworkLayout(4,0,48),null,'out-of-range columns are ignored');
assert.equal(gatheringToolArtworkLayout(0,3,48),null,'out-of-range rows are ignored');

for(const size of [20,24,32,40,48,58,64,80,128]){
  for(let row=0;row<3;row++)for(let column=0;column<4;column++){
    const layout=gatheringToolArtworkLayout(column,row,size)!;
    const scale=layout.atlasWidth/GATHERING_TOOL_SHEET_WIDTH;
    const topScale=layout.atlasHeight/GATHERING_TOOL_SHEET_HEIGHT;
    assert.ok(Math.abs(scale-topScale)<1e-9,'atlas aspect stays unchanged');
    assert.ok(layout.viewportInset>0,'padding remains visible');
    assert.ok(layout.viewportSize<size,'source art fits inside thumbnail frame');
    assert.ok(Math.abs(layout.viewportSize+layout.viewportInset*2-size)<1e-9,'viewport is centered');

    // The visible source rectangle must lie strictly inside the selected
    // atlas cell; neither adjacent cells nor the outer sheet can bleed in.
    const sourceLeft=-layout.left/scale;
    const sourceTop=-layout.top/scale;
    const sourceRight=sourceLeft+layout.viewportSize/scale;
    const sourceBottom=sourceTop+layout.viewportSize/scale;
    const tileLeft=column*GATHERING_TOOL_CELL;
    const tileTop=row*GATHERING_TOOL_CELL;
    assert.ok(sourceLeft>tileLeft && sourceRight<tileLeft+GATHERING_TOOL_CELL,'horizontal sample never crosses a cell boundary');
    assert.ok(sourceTop>tileTop && sourceBottom<tileTop+GATHERING_TOOL_CELL,'vertical sample never crosses a cell boundary');
    assert.ok(sourceLeft-tileLeft<GATHERING_TOOL_CELL*.03,'small sampling guard keeps most of the tool visible');
    assert.ok(sourceTop-tileTop<GATHERING_TOOL_CELL*.03,'small sampling guard preserves long rod and tool ends');
  }
}
console.log('PASS gathering tool atlas framing across all 12 tools and compact/large thumbnail sizes');
