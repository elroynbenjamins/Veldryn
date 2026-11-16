'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const asset=path.join(root,'assets/crafting-components/cross-profession-components-v2.webp');
const d=fs.readFileSync(asset);
assert(d.length>=4096,'The 64px component atlas should retain pixel-art detail');
assert.equal(d.toString('ascii',0,4),'RIFF','Valid RIFF container');
assert.equal(d.toString('ascii',8,16),'WEBPVP8L','Transparent lossless WebP atlas');
assert.equal(d[20],0x2f,'Valid VP8L frame header');
const width=1+(d[21]|((d[22]&63)<<8));
const height=1+((d[22]>>6)|(d[23]<<2)|((d[24]&15)<<10));
assert.equal(width,192,'Atlas contains 3 columns of 64px');
assert.equal(height,128,'Atlas contains 2 rows of 64px');
const theme=fs.readFileSync(path.join(root,'src/theme/cross-profession-assets.ts'),'utf8');
for(const line of ["CROSS_PROFESSION_ICON_CELL=64","CROSS_PROFESSION_ICON_WIDTH=192","CROSS_PROFESSION_ICON_HEIGHT=128","cross-profession-components-v2.webp"])
 assert(theme.includes(line),'Artwork lookup must match the actual atlas: '+line);
const coords=[['METAL_CLASPS',0,0],['REINFORCED_BUCKLES',1,0],['ARMOR_RIVETS',2,0],
 ['CLOTH_BINDINGS',0,1],['PADDED_LININGS',1,1],['REINFORCED_STRAPS',2,1]];
for(const [id,column,row] of coords){
 const pattern=new RegExp(id+':\\{column:'+column+',row:'+row+'\\}');
 assert(pattern.test(theme),'Correct 64px atlas position required for '+id);
}
const artwork=fs.readFileSync(path.join(root,'src/components/ResourceArtwork.tsx'),'utf8');
assert(artwork.includes('crossProfessionIconCell(itemId)'),'Component atlas must be wired into resource rendering');
console.log('PASS: six 64px transparent pixel icons are correctly mapped to inventory and crafting');
