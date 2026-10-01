import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {classSelectionDetails,CLASS_PLAYSTYLE,CLASS_COMBAT_TRAITS} from '../src/core/class-selection';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {classCombatStyle} from '../src/core/class-combat';
import {SUPPORTED_LANGUAGES,LANGUAGE_NAMES} from '../src/i18n/languages';
const {readFileSync}=require('fs') as {readFileSync(path:string,encoding:'utf8'):string};
const registry=readFileSync('src/theme/class-skill-assets.ts','utf8');
for(const definition of CLASSES){
 const details=classSelectionDetails(definition.id),kit=launchPlayer(definition.name),style=classCombatStyle(definition.id);
 assert.ok(CLASS_PLAYSTYLE[definition.id].length>20);
 assert.ok(CLASS_COMBAT_TRAITS[definition.id].length>10);
 assert.equal(details.abilities.length,kit.abilities.length);
 for(const ability of details.abilities){
  const engine=kit.abilities.find(row=>row.id===ability.id)!;
  assert.equal(ability.name,engine.name);
  assert.equal(ability.cooldownSeconds,engine.cooldownMs/1000);
  assert.equal(ability.castSeconds,engine.castTimeMs/1000);
  assert.ok(ability.summary?.length>20,`${ability.id} needs an accurate summary`);
  assert.ok(registry.includes(`${ability.icon}:`),`${ability.id} icon must exist`);
 }
 assert.equal(details.speedPercent,Math.round((style.speedMultiplier-1)*100));
 assert.equal(details.damageTakenPercent,Math.round((style.damageTakenMultiplier-1)*100));
 assert.equal(details.skills.length,2);
}
assert.equal(classSelectionDetails('DREADGUARD').speedPercent,4);
assert.equal(classSelectionDetails('RAVAGER').damageTakenPercent,9);
assert.equal(classSelectionDetails('BASTION').damageTakenPercent,-16);
const screen=readFileSync('src/screens/ClassSelectScreen.tsx','utf8');
const overview=readFileSync('src/components/creation/ClassCombatOverview.tsx','utf8');
const picker=readFileSync('src/components/creation/CreationLanguagePicker.tsx','utf8');
assert.ok(screen.includes('<ClassCombatOverview key={selected.id}'),'overview follows the selected class');
assert.ok(overview.includes('Encounter abilities do not activate during idle hunting.'));
assert.ok(!overview.includes('expanded')&&!overview.includes('Pressable'),'ability details cannot be collapsed');
assert.ok(overview.includes('ability.summary')&&overview.includes('ability.cooldownSeconds')&&overview.includes('ability.castSeconds'),'ability summaries and timings remain visible');
assert.ok(overview.includes('<View style={s.progression}>'),'skill progression stays visible');
assert.ok(picker.includes('accessibilityRole="radio"')&&picker.includes('checked:language===id'));
assert.ok(picker.includes('onChange(id);setOpen(false)'));
assert.ok(picker.includes('visible={open&&!disabled}'));
assert.ok(!screen.includes('showLanguages&&'),'language options must not reflow the creation screen');
for(const language of SUPPORTED_LANGUAGES)assert.ok(LANGUAGE_NAMES[language].length>0);
console.log('PASS class selection: all nine combat kits, idle modifiers, artwork coverage and language selector contracts');
