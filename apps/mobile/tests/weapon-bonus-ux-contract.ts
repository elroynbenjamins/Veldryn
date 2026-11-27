export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const forge=read('src/components/SmithingCollection.tsx');
const pool=read('src/components/WeaponBonusSection.tsx');
const preview=read('src/components/EquipmentPreview.tsx');
const bonusFormat=read('src/core/weapon-bonus-display.ts');
const inspect=read('src/components/ItemQuickInspect.tsx');
const recipeCard=read('src/components/RecipeCard.tsx');
check(forge.includes('<RecipeCard key={recipe.id}')&&recipeCard.includes("detailTab==='stats'?<>"),
  'Selected equipment must retain its own keyed Stats tab rather than sharing stale roll previews');
check(recipeCard.includes('<WeaponBonusPool key={output.id} itemId={output.id}/>'),
  'The compact Stats tab must expose actual selected weapon and nonweapon bonus possibilities');
check(pool.includes("weaponBonusConfig(itemId,'common')")&&pool.includes("equipmentBonusConfig(itemId,'common')")&&pool.includes('weaponBonusRange(base.tier,stat)')&&pool.includes('equipmentBonusRange(base.tier,stat,armor!.slot)'),
  'Possible rolls must use authoritative exact-tier and slot-aware ranges, not guessed UI values');
check(pool.includes('base.pool.map(stat=>'),
  'Live T1–T9 equipment previews must iterate the actual current seven-stat weapon or armor pool');
check(pool.includes('accessibilityState={{expanded}}')&&pool.includes('onPress={toggleExpanded}')&&pool.includes('controlledExpanded??localExpanded')&&pool.includes('onExpandedChange?.(!controlledExpanded)'),
  'Possible bonuses must be an accessible controlled disclosure and remain collapsible after updates');
check(preview.includes('weaponBonusComparisonRows(oldRecord?.weaponBonuses,instance?.weaponBonuses)'),
  'Compare & Swap must compare the selected exact weapon receipts');
check(preview.includes('weaponBonusDisplayDelta(change.deltaBps)')&&preview.includes('statColor(C,change.deltaBps)'),
  'Comparison must show positive/negative bonus percentage differences');
check(bonusFormat.includes("(Math.abs(bps)/100).toFixed(1)+'%'")&&!bonusFormat.includes("+' pp'"),'Bonus comparison changes must render % rather than pp');
check(preview.includes('stats.map(row=>')&&!preview.includes('setMore(')&&!preview.includes('actionsOpen'),'All base/loadout stats and bonus comparisons must be visible without an expander');
check(preview.indexOf('hasStorageActions?<View style={[s.footerActionRow,stackFooterActions&&s.footerActionRowStacked]}>')>=0&&preview.indexOf('hasDisposalActions?<View style={s.footerDisposal}')>preview.indexOf('hasStorageActions?<View style={[s.footerActionRow,stackFooterActions&&s.footerActionRowStacked]}>')&&preview.includes('{scrollWithActions?footer:null}')&&preview.includes('{!scrollWithActions?footer:null}'),'Compare sheet must show separate storage and disposal rows');
check(pool.includes('accessible accessibilityLabel={weaponBonusStatText(language,stat'),
  'Every tier-specific roll range should have a usable screen-reader label');
check(preview.includes("accessibilityLabel={weaponBonusStatText(language,change.stat)"),
  'A screen reader should announce the whole current/new/difference comparison');
check(preview.includes('compactBonusRows')&&preview.includes('rollCompareRowStack'),
  'Comparison must fit narrow/high-font screens');
check(inspect.includes('bonusRows.map(roll=>')&&inspect.includes('otherEffectLines=model.effectLines.filter(line=>!isBonusRoll(line)')&&inspect.includes('line!==traitLine')&&!inspect.includes('rollTrack'),
  'Compact Item Quick Inspect must display exact roll values without roll-grade bars or explanatory clutter');
check(pool.includes('if(!base)return null;')&&pool.includes('twoAtAllRarities'),
  'Only eligible selected weapon and armor recipes should display tier- and rarity-correct possibilities');
check(!forge.includes('WeaponBonusDetails')&&!preview.includes('WeaponBonusDetails'),
  'Do not duplicate verbose legacy roll-strength panels');
console.log('PASS: selected Forge roll pool, compact preview, exact-copy comparison and inspect continuity');
