export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const types=read('src/core/types.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const modal=read('src/components/EquipmentEnhancementModal.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
const character=read('src/screens/CharacterScreen.tsx');
const save=read('src/core/save-normalization.ts');
const items=read('src/content/items.ts');
const monsters=read('src/content/monsters.ts');
const migration=read('../../backend/supabase/migrations/20261019000010_equipment_typed_sockets_v1.sql');

ok(types.includes("GemKind = 'stat'|'effect'"),'Socket state must distinguish Stat and Effect Gems');
ok(types.includes('statGemId?:string')&&types.includes('effectGemId?:string')&&types.includes('legacyGemIds?:string[]'),'Enhancement state must preserve typed sockets plus legacy extras');
ok(enhancement.includes("rarity!=='common'"),'Stat socket should unlock on Uncommon+ gear');
ok(enhancement.includes("!['common','uncommon'].includes(rarity)"),'Effect socket should unlock on Rare+ gear');
ok(enhancement.includes("capacity:(effectUnlocked?2:statUnlocked?1:0)"),'Typed socket capacity must never exceed two active sockets');
ok(enhancement.includes("if(enhancement.statGemId)throw new Error('The Stat Gem socket is already filled')"),'A second Stat Gem must not spill into the Effect socket');
ok(enhancement.includes("if(enhancement.effectGemId)throw new Error('The Effect Gem socket is already filled')"),'Only one Effect Gem may be active per item');
ok(enhancement.includes('hasTypedShape'),'New typed saves must not duplicate their compatibility gemIds during normalization');
ok(enhancement.includes('legacy.push(id)'),'Old extra gems must remain recoverable');
ok(enhancement.includes('combatSpeedMultiplier')&&enhancement.includes('incomingDamageMultiplier')&&enhancement.includes('recoveryMultiplier')&&enhancement.includes('combatGoldMultiplier'),'Effect Gems must have bounded runtime effects');

for(const id of ['GEFF_001','GEFF_002','GEFF_003','GEFF_004'])ok(items.includes("id:'"+id+"'"),'Effect Gem catalog missing '+id);
ok(monsters.includes('EFFECT_GEM_DROP_IDS'),'Advanced combat must have a real Effect Gem source');

ok(modal.includes('TYPED SOCKETS'),'Enhancement modal must explain the typed socket model');
ok(modal.includes('STAT GEM')&&modal.includes('EFFECT GEM'),'Enhancement modal must show both named socket roles');
ok(modal.includes('LEGACY GEMS'),'Enhancement modal must expose recoverable old gems');
ok(modal.includes('onUnsocket(index+2)'),'Legacy gems must remain individually extractable');
ok(inspect.includes("STAT · ")&&inspect.includes("EFFECT · "),'Quick inspect must show typed socket roles');
ok(character.includes('EFFECT GEMS'),'Character stats must surface active Effect Gem totals');

ok(save.includes('normalizeGearEnhancementState'),'Save normalization must use the socket migration helper');
ok(migration.includes("socket_kind in('stat','effect','legacy')"),'Item-instance persistence must model typed and legacy socket roles');
ok(migration.includes("where socket_kind='stat'")&&migration.includes("where socket_kind='effect'"),'Persistence must enforce one Stat and one Effect socket per item instance');

console.log('PASS: equipment sockets use typed Stat/Effect roles with safe legacy migration and visible runtime effects');
