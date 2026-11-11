export {};

interface ImageBytes{
  readonly [index:number]:number;
  readUInt32BE(offset:number):number;
  readUInt32LE(offset:number):number;
  readUInt16LE(offset:number):number;
  toString(encoding:string,start:number,end:number):string;
}
const fs=require('fs') as {readFileSync:{(path:string,encoding:string):string;(path:string):ImageBytes}};
const catalog=require('../src/content/equipment_catalog_t1_t9_v33.json') as {sets:Array<Record<string,string>>;pieces:Array<Record<string,string>>};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const source=fs.readFileSync('src/theme/equipment-assets.ts','utf8');
const sheetSetIds=[...source.matchAll(/^\s+(T\d_\d{3}):require/mg)].map(match=>match[1]);
const piecesBySet=new Map<string,string[]>();
for(const piece of catalog.pieces){
  const setId=piece['Set ID'];
  piecesBySet.set(setId,[...(piecesBySet.get(setId)??[]),piece['Piece ID']]);
}

ok(source.includes('catalog.pieces as Array<Record<string,string|number>>'),'Equipment art IDs must be derived from the live catalogue, not a hand-maintained piece list');
ok(sheetSetIds.length===94,'All 94 authored equipment sprite sheets must remain registered');
for(const setId of sheetSetIds){
  ok(catalog.sets.some(set=>set['Set ID']===setId),'Artwork sheet references unknown set '+setId);
  ok((piecesBySet.get(setId)?.length??0)===10,'Artwork set '+setId+' must resolve all ten current catalogue pieces');
}
const thornmaw=piecesBySet.get('T2_013')??[];
ok(thornmaw.length===10&&thornmaw[0]==='T2P_274'&&thornmaw[9]==='T2X_039','Thornmaw Assault must use the current T2 catalogue item IDs');

// Every sheet is one 5 x 2 grid of square cells. A canvas that does not divide
// by the grid puts cell borders on fractional pixels, which bleeds a sliver of
// the neighbouring icon into each frame.
function imageSize(file:string){
  const buffer=fs.readFileSync(file);
  if(buffer.readUInt32BE(0)===0x89504e47)return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
  if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP'){
    const format=buffer.toString('ascii',12,16);
    if(format==='VP8X')return {width:(buffer[24]|(buffer[25]<<8)|(buffer[26]<<16))+1,height:(buffer[27]|(buffer[28]<<8)|(buffer[29]<<16))+1};
    if(format==='VP8 ')return {width:buffer.readUInt16LE(26)&0x3fff,height:buffer.readUInt16LE(28)&0x3fff};
    if(format==='VP8L'){const bits=buffer.readUInt32LE(21);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
  }
  return null;
}
const sheetPaths=[...source.matchAll(/require\('\.\.\/\.\.\/(assets\/[^']+)'\)/g)].map(match=>match[1]);
ok(sheetPaths.length===94,'every registered sheet must resolve to an asset path');
for(const sheetPath of sheetPaths){
  const size=imageSize(sheetPath);
  ok(!!size,'Equipment sheet '+sheetPath+' must be a readable png or webp');
  ok(size!.width%5===0&&size!.height%2===0,'Equipment sheet '+sheetPath+' must divide into a 5 by 2 grid, got '+size!.width+'x'+size!.height);
  ok(size!.width/5===size!.height/2,'Equipment sheet '+sheetPath+' must use square cells, got '+(size!.width/5)+'x'+(size!.height/2));
}

const starterWeapon=fs.readFileSync('src/components/StarterWeaponArtwork.tsx','utf8');
const classCreation=fs.readFileSync('src/screens/ClassSelectScreen.tsx','utf8');
const equipment=fs.readFileSync('src/components/EquipmentArtwork.tsx','utf8');
const inventoryArtwork=fs.readFileSync('src/components/ItemArtwork.tsx','utf8');
const equipmentPreview=fs.readFileSync('src/components/EquipmentPreview.tsx','utf8');
ok(starterWeapon.includes('starterWeaponArtworkLayout(itemId,size)'),'Starter sprite must use the safe shared crop geometry');
ok(starterWeapon.includes("frame:{overflow:'hidden'}"),'Atlas crops must stay clipped to their preview frame');
ok(classCreation.includes('classEmblemArtwork[selected.id]')&&!classCreation.includes('StarterWeaponArtwork'),'Creation uses class emblems without displaying starting equipment');
ok(equipment.includes('<StarterWeaponArtwork itemId={item.id} size={size}/>'),'Equipped items use the same fitted starter weapon rendering');
ok(inventoryArtwork.includes('<EquipmentArtwork item={item} compact framed={false}/>'),'Inventory thumbnails reuse the shared starter weapon artwork');
ok(equipmentPreview.includes('<EquipmentArtwork item={item} rarity={rarity.id} size={gearSize} framed={false}/>')&&equipmentPreview.includes('const gearSize='),'Responsive equipment previews reuse the same safe crop while sizing artwork for smaller phones');

console.log('PASS: authored equipment sheets resolve every current catalogue piece, including Thornmaw Assault');
