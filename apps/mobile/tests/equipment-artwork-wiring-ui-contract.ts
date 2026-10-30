export {};

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
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
ok(sheetSetIds.length===80,'All 80 authored equipment sprite sheets must remain registered');
for(const setId of sheetSetIds){
  ok(catalog.sets.some(set=>set['Set ID']===setId),'Artwork sheet references unknown set '+setId);
  ok((piecesBySet.get(setId)?.length??0)===10,'Artwork set '+setId+' must resolve all ten current catalogue pieces');
}
const thornmaw=piecesBySet.get('T2_013')??[];
ok(thornmaw.length===10&&thornmaw[0]==='T2P_274'&&thornmaw[9]==='T2X_039','Thornmaw Assault must use the current T2 catalogue item IDs');

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
ok(equipmentPreview.includes('<EquipmentArtwork item={item} size={112} framed={false}/>'),'Large equipment previews reuse the same safe crop');

console.log('PASS: authored equipment sheets resolve every current catalogue piece, including Thornmaw Assault');
