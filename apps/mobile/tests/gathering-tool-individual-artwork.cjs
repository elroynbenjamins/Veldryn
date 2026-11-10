'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const assets=path.join(root,'assets','tools','individual');
const legacyAssets=path.join(root,'assets','tools');
const source=fs.readFileSync(path.join(root,'src','theme','gathering-tool-assets.ts'),'utf8');
const artwork=fs.readFileSync(path.join(root,'src','components','GatheringToolArtwork.tsx'),'utf8');
const itemArtwork=fs.readFileSync(path.join(root,'src','components','ItemArtwork.tsx'),'utf8');
const expected={
  COPPER_PICKAXE:'copper-pickaxe',ASTER_IRON_PICKAXE:'aster-iron-pickaxe',
  OATHSTONE_PICKAXE:'oathstone-pickaxe',FROSTIRON_PICKAXE:'frostiron-pickaxe',
  GREENWOOD_HATCHET:'greenwood-hatchet',ASTER_IRON_HATCHET:'aster-iron-hatchet',
  OATHSTONE_HATCHET:'oathstone-hatchet',FROSTIRON_HATCHET:'frostiron-hatchet',
  REEDLINE_ROD:'reedline-rod',IRONWOOD_ROD:'ironwood-rod',
  OATHSCALE_ROD:'oathscale-rod',RIMEGLASS_ROD:'rimeglass-rod',
};
for(const [id,name] of Object.entries(expected)){
  assert.ok(source.includes(id+":require('../../assets/tools/individual/"+name+".png')"),'distinct static require for '+id);
  const png=fs.readFileSync(path.join(assets,name+'.png'));
  assert.ok(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG signature '+id);
  assert.equal(png.readUInt32BE(16),256,'width '+id);
  assert.equal(png.readUInt32BE(20),256,'height '+id);
  assert.equal(png[25],6,'RGBA transparent icon '+id);
}
assert.equal(fs.readdirSync(assets).filter(name=>name.endsWith('.png')).length,12,'no missing/duplicate images');
for(const name of ['gathering-tools-v1.png','gathering-tools-v2.webp','gathering-tools-v3.png']){
  assert.equal(fs.existsSync(path.join(legacyAssets,name)),false,'obsolete shared atlas removed: '+name);
}
assert.ok(artwork.includes('gatheringToolImages[itemId]'),'component uses direct PNG source');
assert.ok(artwork.includes('resizeMode="contain"'),'tool icon keeps its full shape');
assert.ok(!artwork.includes('gatheringToolArtworkLayout'),'no atlas crop geometry');
assert.ok(itemArtwork.includes('hasGatheringToolArtwork(itemId)'),'all tool views use individual assets');
console.log('PASS 12 standalone gathering-tool PNGs and direct UI rendering');
