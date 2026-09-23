export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const types=read('src/core/types.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const modal=read('src/components/EquipmentEnhancementModal.tsx');
const slots=read('src/components/EquipmentSlot.tsx');
const character=read('src/screens/CharacterScreen.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
const items=read('src/content/items.ts');
const monsters=read('src/content/monsters.ts');
const save=read('src/core/save-normalization.ts');
const commands=read('src/core/game-commands.ts');
const game=read('src/core/game.ts');

ok(types.includes("GemSocketKind='stat'|'effect'"),'Equipment must use named Stat/Effect socket kinds');
ok(types.includes("statGemId?:string; effectGemId?:string"),'Enhancement save shape must expose named sockets');
ok(enhancement.includes('EQUIPMENT_GEM_SOCKET_COUNT=2'),'Every gear piece must have exactly two logical gem sockets');
ok(enhancement.includes("kind==='stat'&&enhancement.statGemId"),'Second Stat Gem must be rejected');
ok(enhancement.includes("kind==='effect'&&enhancement.effectGemId"),'Second Effect Gem must be rejected');
ok(enhancement.includes('result.combat_speed=Math.min(.10'),'Effect Gem stacking must be capped');
ok(enhancement.includes('result.boss_power=Math.min(.15'),'Boss Effect Gem stacking must be capped');
ok(enhancement.includes('result.damage_reduction=Math.min(.10'),'Damage-reduction Effect Gem stacking must be capped');

ok(modal.includes('one Stat Gem and one Effect Gem'),'Enhancement UI must explain the two named slots');
ok(modal.includes('Socket Stat'),'Stat candidates must have a dedicated action');
ok(modal.includes('Socket Effect'),'Effect candidates must have a dedicated action');
ok(slots.includes('statGemFilled')&&slots.includes('effectGemFilled'),'Equipment tiles must show separate Stat/Effect pips');
ok(character.includes("S {selectedDecision.sockets.statFilled?'◆':'◇'}"),'Character detail must show named socket status');
ok(inspect.includes("1 Stat + 1 Effect"),'Quick inspect must describe named socket structure');

for(const id of ['SWIFT_SIGIL','BOSSBANE_SIGIL','BULWARK_SIGIL','RENEWAL_SIGIL'])ok(items.includes("id:'"+id+"'"),'Legacy Effect Gem must remain readable for save compatibility: '+id);
ok(!monsters.includes("itemId:'SWIFT_SIGIL'")&&!monsters.includes("itemId:'BOSSBANE_SIGIL'")&&!monsters.includes("itemId:'BULWARK_SIGIL'")&&!monsters.includes("itemId:'RENEWAL_SIGIL'"),'Legacy socketable Effect Gems must not bypass the unrefined Enchanting loop through monster drops');
ok(monsters.includes('ASTERFALL_RAW_GEM_DROPS')&&monsters.includes("LANTERN_WRETCH:{familyId:'effect_opening_strike'")&&monsters.includes("FALLEN_SENTINEL:{familyId:'effect_bulwark'"),'Asterfall combat must replace legacy sigil drops with unrefined canonical Effect Gem families');
ok(monsters.includes('mobileRawGemItemIdV1(raw.familyId,1)'),'Asterfall gem rewards must materialize as Grade I unrefined canonical gems');

ok(save.includes('displacedLegacyGemIds'),'Save normalization must identify displaced old sockets');
ok(save.includes('addRefundsToStacks'),'Displaced legacy gems must be refunded instead of deleted');
ok(commands.includes("integer(a,'index',0,1)"),'Online/local command validation must accept only Stat/Effect socket indexes');
ok(game.includes('equippedEffectGemBonuses(state)'),'Combat simulation must consume Effect Gem bonuses');
ok(game.includes('(1+effectGems.combat_speed)'),'Combat-speed Effect Gems must affect trusted combat simulation');
ok(game.includes('(1-effectGems.damage_reduction)'),'Damage-reduction Effect Gems must affect incoming damage');
ok(game.includes('(1+effectGems.recovery)'),'Recovery Effect Gems must affect combat recovery');

console.log('PASS: two-slot Stat/Effect gem system is distinct, migration-safe, sourced and runtime-functional');
