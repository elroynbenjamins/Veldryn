import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';
import {buildExpeditionEncounter,expeditionEncounterPreview} from '../expedition-combat-service';

const veil=buildExpeditionEncounter({encounterId:'EVENT_VEILBREAK_BATTLE_01'});
const veilPreview=expeditionEncounterPreview('EVENT_VEILBREAK_BATTLE_01')!;
assert.ok(veilPreview.archetypes.some(item=>item.id==='assassin'));
assert.ok(veilPreview.mechanics.some(item=>item.id==='focus'));
assert.ok(veilPreview.mechanics.some(item=>item.id==='execute'));
assert.equal(veil[0].abilities[0].target,'random_enemy');
assert.ok(veil[0].abilities[0].effects.some(effect=>effect.kind==='damage'&&effect.executeBelowHpPct!==undefined));

const ledger=buildExpeditionEncounter({encounterId:'EVENT_MERCHANT_BATTLE_02'});
assert.ok(ledger[0].abilities.some(ability=>ability.effects.some(effect=>effect.kind==='debuff'&&effect.tag==='damage_taken')));
assert.ok(expeditionEncounterPreview('EVENT_MERCHANT_BATTLE_02')!.mechanics.some(item=>item.id==='vulnerability'));

const frost=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BATTLE_02'});
assert.ok(frost[0].abilities.some(ability=>ability.target==='all_enemies'&&ability.interruptible));
assert.ok(expeditionEncounterPreview('EVENT_FROSTFALL_BATTLE_02')!.mechanics.some(item=>item.id==='interrupt'));

const warden=buildExpeditionEncounter({encounterId:'FROST_LAKE_ELITE_03'});
assert.ok(warden[0].abilities.some(ability=>ability.effects.some(effect=>effect.kind==='shield')));
assert.ok(expeditionEncounterPreview('FROST_LAKE_ELITE_03')!.archetypes.some(item=>item.id==='guardian'));

for(const [encounterId,factory] of Object.entries(EXPEDITION_ENCOUNTERS)){
 const preview=expeditionEncounterPreview(encounterId);
 assert.ok(preview,`missing PvE preview for ${encounterId}`);
 assert.ok(preview!.archetypes.length>=1&&preview!.archetypes.length<=2,`invalid archetype count for ${encounterId}`);
 assert.ok(preview!.mechanics.length>=1&&preview!.mechanics.length<=4,`invalid mechanic count for ${encounterId}`);
 const encoded=JSON.stringify(preview);
 for(const secret of ['maxHp','attackPower','defense','coeff','cooldownMs','priority'])assert.equal(encoded.includes(secret),false,`preview leaked ${secret} for ${encounterId}`);
 const definitions=factory();
 assert.ok(definitions.every(definition=>(definition.tags??[]).some(tag=>tag.startsWith('pve:archetype:'))),`missing archetype tag for ${encounterId}`);
}
console.log('PASS PvE encounter archetypes, mechanics and sanitized previews');
