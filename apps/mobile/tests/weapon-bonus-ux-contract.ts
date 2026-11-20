export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const forge=read('src/components/SmithingCollection.tsx');
const pool=read('src/components/ForgeWeaponBonusPool.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
check(forge.includes('<ForgeWeaponBonusPool key={item.id} itemId={item.id}/>'),
  'Forge must show selected-item bonus possibilities and reset disclosure on selection');
check(pool.includes("weaponBonusConfig(itemId,'common')")&&pool.includes('weaponBonusRange(cfg.tier,stat)'),
  'Possible rolls must use authoritative exact-tier ranges, not guessed UI values');
check(pool.includes('WEAPON_BONUS_CURRENT_POOL.map('),
  'Live T1-T9 displays must share the current seven-stat pool');
check(pool.includes('accessibilityState={{expanded:open}}')&&pool.includes('onPress={()=>setOpen('),
  'Possible bonuses must be an accessible collapsible disclosure');
check(preview.includes('weaponBonusComparisonRows(oldRecord?.weaponBonuses,instance?.weaponBonuses)'),
  'Compare & Swap must compare the selected exact weapon receipts');
check(preview.includes('weaponBonusDisplayDelta(change.deltaBps)')&&preview.includes('statColor(C,change.deltaBps)'),
  'Comparison must show positive/negative percentage-point differences');
check(pool.includes('accessible accessibilityLabel={weaponBonusStatText(language,stat)'),
  'Every tier-specific roll range should have a usable screen-reader label');
check(preview.includes("accessibilityLabel={weaponBonusStatText(language,change.stat)"),
  'A screen reader should announce the whole current/new/difference comparison');
check(preview.includes('compactBonusRows')&&preview.includes('rollCompareRowStack'),
  'Comparison must fit narrow/high-font screens');
check(inspect.includes('Random bonuses on this equipment copy.'),
  'The current compact Item Quick Inspect panel must not be replaced with roll-grade bars');
check(!forge.includes('WeaponBonusDetails')&&!preview.includes('WeaponBonusDetails'),
  'Do not duplicate verbose legacy roll-strength panels');
console.log('PASS: selected Forge roll pool, compact preview, exact-copy comparison and inspect continuity');
