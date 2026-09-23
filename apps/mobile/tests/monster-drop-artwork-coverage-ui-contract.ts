export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const monsters=read('src/content/monsters.ts');
const items=read('src/content/items.ts');
const fallback=read('src/theme/equipment-fallback-art.ts');
const artSources=[
  read('src/theme/resource-assets.ts'),
  read('src/theme/runtime-item-assets.ts'),
  read('src/theme/regional-resource-assets.ts'),
  read('src/theme/misc-item-assets.ts'),
  read('src/theme/asterfall-ingredient-assets.ts'),
  read('src/theme/asterfall-ore-assets.ts'),
  read('src/theme/asterfall-gathering-assets.ts'),
  read('src/theme/asterfall-crafted-assets.ts'),
  read('src/theme/arcane-material-assets.ts'),
  read('src/theme/consumable-assets.ts'),
  read('src/theme/core-material-assets.ts'),
  read('src/theme/gem-assets.ts'),
  read('src/theme/equipment-assets.ts'),
  fallback,
];
const allArt=artSources.join('\n');
const dropIds=new Set<string>();
for(const match of monsters.matchAll(/itemId:'([^']+)'/g))dropIds.add(match[1]);
dropIds.add('HOLY_WATER');

function itemLine(id:string){
  const escaped=id.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
  return items.match(new RegExp("\\{id:'"+escaped+"'[^\\n]*"))?.[0]??'';
}
function itemType(id:string){return /type:'([^']+)'/.exec(itemLine(id))?.[1];}
function hasArtwork(id:string){
  if(allArt.includes(id))return true;
  const line=itemLine(id);
  return itemType(id)==='gear'&&line.includes('noviceSetId:');
}
const missing=[...dropIds].filter(id=>!hasArtwork(id));
ok(missing.length===0,'Monster drop artwork missing for: '+missing.join(', '));

const fallbackGear=[...dropIds].filter(id=>itemType(id)==='gear'&&fallback.includes('"'+id+'"'));
ok(fallbackGear.length<=12,'Too many monster drops rely on generic starter artwork: '+fallbackGear.join(', '));

console.log('PASS: '+dropIds.size+' monster-drop item IDs resolve to artwork; '+fallbackGear.length+' early gear drops remain explicit fallback candidates');
