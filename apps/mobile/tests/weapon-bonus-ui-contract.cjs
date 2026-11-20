const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');

const rolls=read('src/core/weapon-bonus-rolls.ts');
const instances=read('src/core/crafted-gear-instances.ts');
const shared=read('src/components/WeaponBonusSection.tsx');
const selectedCraft=read('src/components/SmithingCollection.tsx');
const recipes=read('src/components/RecipeCard.tsx');
const comparison=read('src/components/EquipmentPreview.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
const pouch=read('src/components/EquipmentPouchPanel.tsx');
const forged=read('src/components/ForgeResultFeedback.tsx');
const locales=read('src/i18n/gameplay.ts');

assert(rolls.includes('WEAPON_BONUS_ROLL_VERSION=3'),'New claims must be a new roll version');
assert(rolls.includes('EARLY_WEAPON_BONUS_BPS')&&rolls.includes('tier<(version===3?1:3)'),
 'The shared pool must roll on every weapon tier while preserving legacy T1/T2 rules');
const currentPool=rolls.split('export const WEAPON_BONUS_CURRENT_POOL')[1].split('/** Stat-sensitive')[0];
assert(currentPool.includes("'maxHp'")&&currentPool.includes("'potency'"),'All active stat families must be in shared pool');
assert(!currentPool.includes("'ward'")&&!currentPool.includes("'penetration'"),'2.0-only stats must not roll yet');
assert(rolls.includes('LEGACY_ROLE_POOL')&&rolls.includes('version===3?WEAPON_BONUS_CURRENT_POOL:LEGACY_ROLE_POOL'),'Old role-specific receipts must remain valid');
assert(instances.includes('row.weaponBonusRollVersion===3'),'Save normalization must retain newly minted weapon rolls');
assert(rolls.split('export function weaponBonusLine')[1].includes('weaponBonusConfig(itemId,rarity,version)'),'Legacy tooltips must use original mint versions');

assert(selectedCraft.includes('<WeaponBonusPool key={item.id} itemId={item.id} initialExpanded/>'),'Selected Forge item must show actual possible stat pool');
assert(recipes.includes('!detailsOnly?<WeaponBonusPool'),'Nested recipe details should not duplicate the pool');
assert(shared.includes('weaponBonusRange(base.tier,stat)')&&shared.includes('weaponBonusStrength(itemId,rarity,bonus,version)'),'Possible and actual rolls must come from the same rules');
assert(shared.includes('accessibilityState={{expanded}}'),'Possible stat list must be keyboard/screen-reader accessible');
assert(comparison.includes('weaponBonusChanges.map(change=>')&&comparison.includes('bonusDifference(change.after-change.before)'),'Swap must compare per-stat bonus gains and losses');
assert(inspect.includes('exactBonusCopy')&&inspect.includes('row.id===instanceId&&row.itemId===itemId'),'Quick inspect must not borrow bonuses from a different physical copy');
assert(pouch.includes('record.weaponBonusRollVersion'),'Pouch must show original roll versions');
assert(forged.includes('<WeaponBonusDetails itemId={result.itemId}'),'Forge reveal must show actual rolled bonuses');
for(const phrase of ['Possible bonus stats','Random bonus stats','Bonus range','Roll strength','Older copy — no recorded bonus']){
 assert(locales.includes('"'+phrase+'":'),'Every new heading must have a translation entry');
}
console.log('PASS: class-neutral bonus UX contract, versioned legacies and exact-copy screens');
