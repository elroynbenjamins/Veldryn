const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../src/'+p),'utf8');
const forge=read('components/SmithingCollection.tsx');
const recipe=read('components/RecipeCard.tsx');
const pool=read('components/WeaponBonusSection.tsx');
const home=read('components/coop/CoopDungeonBrowser.tsx');
const route=read('components/coop/DungeonRouteChoices.tsx');
const echo=read('components/coop/CoopSocialEchoPicker.tsx');
const copy=read('i18n/dungeon-ux-copy.ts');
assert.match(recipe,/<WeaponBonusPool key=\{output.id\} itemId=\{output.id\}\/>/,'The selected equipment Stats tab must retain the shared real slot-specific bonus pool');
assert.doesNotMatch(forge,/<ForgeWeaponBonusPool/,'No weapon-only panel that hides armor rolls');
assert.ok(forge.indexOf('<CraftQuantitySelector')>0&&forge.indexOf('<CraftQuantitySelector')<forge.indexOf('void onCraft(recipe.id,craftCount)')&&forge.indexOf('void onCraft(recipe.id,craftCount)')<forge.indexOf('<RecipeCard key={recipe.id}')&&recipe.includes("detailTab==='stats'?<>"),'Resource-aware quantity → Forge action → optional actual bonus-roll details');
assert.match(pool,/equipmentBonusConfig\(itemId,'common'\)/,'Armor, ring and other nonweapon pools supported');
assert.match(pool,/equipmentBonusRange\(base.tier,stat,armor!\.slot\)/,'Actual tier/slot-specific roll ranges, not guessed values');
assert.match(pool,/weaponBonusStatText\(language,stat\)/,'Localized live and legacy bonus labels');
assert.match(home,/SectionGuide scope=\{guideScope\} area="dungeon" section="home" placement="header"/,'Keep interactive dungeon ? help');
assert.match(home,/onPress=\{onShop\}/,'Keep working Dungeon Shop shortcut');
assert.match(home,/shopShortcut:\{minWidth:74,minHeight:48/,'Shop touch target accessible');
assert.match(route,/continueChoice=bossAvailable&&option.kind!=='boss'/,'Only continue deeper instead of a boss at a real checkpoint');
assert.match(route,/dungeonUxText\(language,live\?'continueVote':'continueDeeper'\)/,'Live voting and Solo selection remain distinct');
assert.match(route,/onPress=\{\(\)=>onChoose\?\.\(option.nodeId\)\}/,'Retain server-authoritative choice callback');
assert.match(echo,/const \[expanded,setExpanded\]=useState\(true\)/,'Show roles, filter and selectable candidates by default');
assert.match(echo,/validateSelectedSocialEchoCharacterIds/,'Keep real role/duplicate server safety rules');
for(const lang of ['en','de','es','nl','it','fr','ru','tr']){
 const row=copy.split(String.fromCharCode(10)).find(line=>line.trimStart().startsWith(lang+':{'));
 assert.ok(row,'Missing dungeon UI translations for '+lang);
 for(const key of ['bossChoice','continueDeeper','continueVote','checkpointCamp','checkpointBoon','checkpointCampHint','checkpointBoonHint']){
  assert.match(row,new RegExp('(?:^|[,{])'+key+':'),'Missing '+key+' dungeon UI translation for '+lang);
 }
}
console.log('PASS: approved 1.0.11 Forge, Dungeon Home, Endurance, and Echo UI contracts');
