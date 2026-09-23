export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const worldMap=read('src/content/world-map.ts');
const modal=read('src/components/TravelRegionModal.tsx');
const world=read('src/screens/WorldScreen.tsx');
const scenes=read('src/components/ZoneSceneArtwork.tsx');
const monsters=read('src/content/monsters.ts');

ok(worldMap.includes("availability:'inDevelopment'")&&worldMap.includes("id:'VEILLANDS'"),'Future region must remain represented as In Development');
ok(modal.includes("title={inDevelopment?\"In Development\":locked?\"Locked\":\"Travel\"}"),'Travel action must distinguish Available, Locked and In Development');
ok(modal.includes('Travel is instant.'),'Travel modal must explicitly communicate instant travel');
ok(world.includes("inDevelopment?'IN DEVELOPMENT'"),'World destination cards must visibly label future regions');
ok(scenes.includes("world-zone-scenes-v1.jpg"),'Travel modal must use the dedicated world-zone scene atlas');
ok(modal.includes('MonsterPortraitFrame')&&modal.includes('COMMON ENEMIES'),'Released-region travel previews must render enemy portraits');
ok(modal.includes('ItemArtwork itemId={drop.itemId}'),'Travel preview notable drops must use real item artwork');

const coverageFiles=[
 'src/theme/misc-item-assets.ts',
 'src/theme/asterfall-ingredient-assets.ts',
 'src/theme/asterfall-ore-assets.ts',
 'src/theme/asterfall-gathering-assets.ts',
 'src/theme/asterfall-crafted-assets.ts',
 'src/theme/arcane-material-assets.ts',
 'src/theme/regional-resource-assets.ts',
 'src/theme/core-material-assets.ts',
 'src/theme/gem-assets.ts',
];
const coverage=coverageFiles.map(read).join('\n');
const dropIds=[...new Set([...monsters.matchAll(/itemId:'([^']+)'/g)].map(match=>match[1]))];
const missing=dropIds.filter(id=>!coverage.includes(id));
ok(missing.length===0,'Monster drop artwork missing for: '+missing.join(', '));

console.log('PASS: travel previews, future-region state, scenic art and monster-drop artwork are complete');
