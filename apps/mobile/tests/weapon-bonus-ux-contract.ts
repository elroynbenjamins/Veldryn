export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const forge=read('src/components/SmithingCollection.tsx');
const pool=read('src/components/WeaponBonusSection.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
check(forge.includes('bonusPoolOpenByItem[item.id]??true')&&forge.includes('onExpandedChange={open=>setBonusPoolOpenByItem(current=>({...current,[item.id]:open}))}'),
  'Forge must preserve each selected equipment item disclosure preference while live queue updates rerender');
check(forge.includes('<WeaponBonusPool key={item.id} itemId={item.id} expanded='),
  'Forge must show actual selected weapon and nonweapon bonus possibilities with controlled disclosure');
check(pool.includes("weaponBonusConfig(itemId,'common')")&&pool.includes("equipmentBonusConfig(itemId,'common')")&&pool.includes('weaponBonusRange(base.tier,stat)')&&pool.includes('equipmentBonusRange(base.tier,stat,armor!.slot)'),
  'Possible rolls must use authoritative exact-tier and slot-aware ranges, not guessed UI values');
check(pool.includes('base.pool.map(stat=>'),
  'Live T1–T9 equipment previews must iterate the actual current seven-stat weapon or armor pool');
check(pool.includes('accessibilityState={{expanded}}')&&pool.includes('onPress={toggleExpanded}')&&pool.includes('controlledExpanded??localExpanded')&&pool.includes('onExpandedChange?.(!controlledExpanded)'),
  'Possible bonuses must be an accessible controlled disclosure and remain collapsible after updates');
check(preview.includes('weaponBonusComparisonRows(oldRecord?.weaponBonuses,instance?.weaponBonuses)'),
  'Compare & Swap must compare the selected exact weapon receipts');
check(preview.includes('weaponBonusDisplayDelta(change.deltaBps)')&&preview.includes('statColor(C,change.deltaBps)'),
  'Comparison must show positive/negative percentage-point differences');
check(pool.includes('accessible accessibilityLabel={weaponBonusStatText(language,stat'),
  'Every tier-specific roll range should have a usable screen-reader label');
check(preview.includes("accessibilityLabel={weaponBonusStatText(language,change.stat)"),
  'A screen reader should announce the whole current/new/difference comparison');
check(preview.includes('compactBonusRows')&&preview.includes('rollCompareRowStack'),
  'Comparison must fit narrow/high-font screens');
check(inspect.includes('Random bonuses on this equipment copy.'),
  'The current compact Item Quick Inspect panel must not be replaced with roll-grade bars');
check(pool.includes('if(!base)return null;')&&pool.includes('twoAtAllRarities'),
  'Only eligible selected weapon and armor recipes should display tier- and rarity-correct possibilities');
check(!forge.includes('WeaponBonusDetails')&&!preview.includes('WeaponBonusDetails'),
  'Do not duplicate verbose legacy roll-strength panels');
console.log('PASS: selected Forge roll pool, compact preview, exact-copy comparison and inspect continuity');
