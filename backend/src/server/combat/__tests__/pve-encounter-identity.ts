import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';
import {buildExpeditionEncounter,expeditionEncounterPreview} from '../expedition-combat-service';
import {simulateCombat} from '../engine';
import {launchPlayer} from '../content/launch-combat';
import type {CombatantDefinition} from '../types';

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

const glacier=buildExpeditionEncounter({encounterId:'FROST_LAKE_BATTLE_02'});
assert.equal(glacier[0].name,'Glacier Stalker');
assert.equal(glacier[0].abilities[0].target,'random_enemy');
assert.ok(glacier[0].abilities[0].effects.some(effect=>effect.executeBelowHpPct!==undefined));
assert.ok(expeditionEncounterPreview('FROST_LAKE_BATTLE_02')!.archetypes.some(item=>item.id==='assassin'));

const choir=buildExpeditionEncounter({encounterId:'FROST_CHOIR_BATTLE_01'});
assert.ok(choir[0].abilities.some(ability=>ability.target==='all_enemies'&&ability.interruptible));
assert.ok(expeditionEncounterPreview('FROST_CHOIR_BATTLE_01')!.archetypes.some(item=>item.id==='caster'));

const fenReaver=buildExpeditionEncounter({encounterId:'ASH_FEN_BATTLE_03'});
assert.ok(fenReaver[0].abilities.some(ability=>ability.effects.some(effect=>effect.executeBelowHpPct!==undefined)));
assert.ok(expeditionEncounterPreview('ASH_FEN_BATTLE_03')!.mechanics.some(item=>item.id==='execute'));

const crucibleHex=buildExpeditionEncounter({encounterId:'ASH_CRUCIBLE_BATTLE_01'});
assert.ok(crucibleHex[1].abilities.some(ability=>ability.effects.some(effect=>effect.kind==='debuff'&&effect.tag==='damage_taken')));

const bellbeast=buildExpeditionEncounter({encounterId:'BOSS_EXP_BELLBEAST'})[0];
assert.deepEqual(bellbeast.abilities.map(ability=>ability.name),['Shiverlake Charge','Bellquake','Rimehorn Frenzy']);
assert.deepEqual((bellbeast.phases??[]).map(phase=>phase.name),['Cracked Bell','Winter Stampede']);
assert.ok(bellbeast.abilities.some(ability=>ability.interruptible));

const cantor=buildExpeditionEncounter({encounterId:'BOSS_EXP_CANTOR'})[0];
assert.deepEqual(cantor.abilities.map(ability=>ability.name),['Dissonant Verse','Choir Tempest']);
assert.deepEqual((cantor.phases??[]).map(phase=>phase.name),['First Refrain','Final Refrain']);
assert.ok(cantor.abilities.some(ability=>ability.effects.some(effect=>effect.kind==='dot')));

const fenPrime=buildExpeditionEncounter({encounterId:'BOSS_EXP_FEN'})[0];
assert.ok(fenPrime.abilities.some(ability=>ability.name==='Blackglass Execution'&&ability.effects.some(effect=>effect.executeBelowHpPct!==undefined)));
assert.deepEqual((fenPrime.phases??[]).map(phase=>phase.name),['Cracking Shell','Devour the Weak']);

const cruciblePrime=buildExpeditionEncounter({encounterId:'BOSS_EXP_PRIME'})[0];
assert.ok(cruciblePrime.abilities.some(ability=>ability.name==='Molten Aegis'&&ability.effects.some(effect=>effect.kind==='shield')));
assert.deepEqual((cruciblePrime.phases??[]).map(phase=>phase.name),['Tempered Shell','Overheat']);

const hollowRegent=buildExpeditionEncounter({encounterId:'EVENT_VEILBREAK_BOSS'})[0];
assert.deepEqual((hollowRegent.phases??[]).map(phase=>phase.name),['Lanterns Dim',"Regent's Decree"]);
assert.equal(hollowRegent.abilities.find(ability=>ability.id==='EVENT_VEILBREAK_BOSS_LANCE')?.target,'random_enemy');
assert.ok(hollowRegent.abilities.find(ability=>ability.id==='EVENT_VEILBREAK_BOSS_NOVA')?.effects.some(effect=>effect.kind==='dot'));
assert.ok((hollowRegent.phases??[]).find(phase=>phase.name==="Regent's Decree")?.effects.some(effect=>effect.executeBelowHpPct!==undefined));

const coinboundCaptain=buildExpeditionEncounter({encounterId:'EVENT_MERCHANT_BOSS'})[0];
assert.deepEqual((coinboundCaptain.phases??[]).map(phase=>phase.name),['Toll Is Due',"Captain's Share"]);
assert.ok(coinboundCaptain.abilities.some(ability=>ability.id==='EVENT_MERCHANT_BOSS_RALLY'&&ability.effects.some(effect=>effect.kind==='buff'&&effect.tag==='damage_done')));
assert.ok((coinboundCaptain.phases??[]).find(phase=>phase.name==='Toll Is Due')?.effects.some(effect=>effect.kind==='debuff'&&effect.tag==='damage_taken'));

const rimebellColossus=buildExpeditionEncounter({encounterId:'EVENT_FROSTFALL_BOSS'})[0];
assert.deepEqual((rimebellColossus.phases??[]).map(phase=>phase.name),['Frozen Carapace','Last Toll']);
assert.ok(rimebellColossus.abilities.some(ability=>ability.id==='EVENT_FROSTFALL_BOSS_WARD'&&ability.effects.some(effect=>effect.kind==='shield')));
assert.ok((rimebellColossus.phases??[]).find(phase=>phase.name==='Frozen Carapace')?.effects.some(effect=>effect.kind==='shield'));
assert.ok((rimebellColossus.phases??[]).find(phase=>phase.name==='Last Toll')?.effects.some(effect=>effect.kind==='damage'&&effect.damageType==='ice'));

for(const [encounterId,expected] of [
 ['EVENT_VEILBREAK_BOSS',['focus','execute','interrupt','dot']],
 ['EVENT_MERCHANT_BOSS',['heavy_hit','aoe','interrupt','enrage']],
 ['EVENT_FROSTFALL_BOSS',['heavy_hit','aoe','interrupt','barrier']],
] as const){
 const preview=expeditionEncounterPreview(encounterId)!;
 for(const mechanic of expected)assert.ok(preview.mechanics.some(item=>item.id===mechanic),`${encounterId} preview missing ${mechanic}`);
}

const zeroStats={maxHp:20_000,attackPower:0,healingPower:0,defense:0,accuracy:1000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
const caster:CombatantDefinition={id:'CASTER',name:'Priority Caster',team:'enemies',role:'enemy',level:25,stats:zeroStats,basicAttackMs:99_999,basicAttackCoeff:0,abilities:[
 {id:'DANGER_CAST',name:'Danger Cast',cooldownMs:99_999,castTimeMs:3000,target:'all_enemies',priority:100,interruptible:true,effects:[{kind:'damage',flat:100}]},
]};
const decoy:CombatantDefinition={id:'DECOY',name:'Decoy',team:'enemies',role:'enemy',level:25,stats:zeroStats,basicAttackMs:99_999,basicAttackCoeff:0,abilities:[]};
const interruptRun=simulateCombat({seed:'mechanic-aware-interrupt',players:[launchPlayer('Hexweaver',25)],enemies:[decoy,caster],maxDurationMs:1200});
const interrupt=interruptRun.events.find(event=>event.type==='interrupt');
assert.ok(interrupt,'Hexweaver should react to an interruptible cast');
assert.equal(interrupt!.targetId,'CASTER','interrupt AI must target the actual interruptible caster rather than a random enemy');
assert.equal(interrupt!.interruptedAbilityId,'DANGER_CAST','interrupt events must preserve the interrupted PvE ability for simulation telemetry');
assert.equal(launchPlayer('Hexweaver',25).abilities.find(ability=>ability.id==='HX_NULL')?.target,'interruptible_casting_enemy');
for(const className of ['Ironwarden','Bastion','Dreadguard'] as const){
 const ability=launchPlayer(className,25).abilities.find(item=>item.effects.some(effect=>effect.kind==='interrupt'));
 assert.equal(ability?.target,'interruptible_casting_enemy',`${className} interrupt should use caster-aware targeting`);
}

const harmless:CombatantDefinition={id:'HARMLESS',name:'Harmless Target',team:'enemies',role:'enemy',level:25,stats:zeroStats,basicAttackMs:99_999,basicAttackCoeff:0,abilities:[]};
const dawnRun=simulateCombat({seed:'support-no-waste-dawn',players:[launchPlayer('Dawnkeeper',25)],enemies:[harmless],maxDurationMs:700});
assert.equal(dawnRun.events.some(event=>event.abilityId==='DK_HOT'&&(event.type==='status_apply'||event.type==='hot_tick')),false,'Dawnkeeper should not spend Sunthread at full health');
const stoneRun=simulateCombat({seed:'support-no-waste-stone',players:[launchPlayer('Stonecaller',25)],enemies:[harmless],maxDurationMs:700});
assert.equal(stoneRun.events.some(event=>event.abilityId==='SC_SHIELD'&&event.type==='shield'),false,'Stonecaller should not spend Resonant Armor at full health');
assert.equal(launchPlayer('Dawnkeeper',25).abilities.find(ability=>ability.id==='DK_HOT')?.aiCondition,'ally_below_80_or_targeted');
assert.equal(launchPlayer('Stonecaller',25).abilities.find(ability=>ability.id==='SC_SHIELD')?.aiCondition,'ally_below_80_or_targeted');
assert.equal(launchPlayer('Dawnkeeper',25).abilities.find(ability=>ability.id==='DK_HOT')?.target,'threatened_ally');
assert.equal(launchPlayer('Stonecaller',25).abilities.find(ability=>ability.id==='SC_SHIELD')?.target,'threatened_ally');

const focusCaster:CombatantDefinition={id:'FOCUS_CASTER',name:'Focus Caster',team:'enemies',role:'enemy',level:25,stats:zeroStats,basicAttackMs:99_999,basicAttackCoeff:0,abilities:[
 {id:'FOCUS_CAST',name:'Focus Cast',cooldownMs:99_999,castTimeMs:2000,target:'random_enemy',priority:100,interruptible:false,effects:[{kind:'damage',flat:100}]},
]};
const focusPlayers=[launchPlayer('Stonecaller',25),launchPlayer('Wayfinder',25)];
const focusStone=simulateCombat({seed:'support-focus-stone',players:focusPlayers,enemies:[focusCaster],maxDurationMs:500});
const focusCast=focusStone.events.find(event=>event.type==='cast_start'&&event.abilityId==='FOCUS_CAST');
const focusShield=focusStone.events.find(event=>event.type==='shield'&&event.abilityId==='SC_SHIELD');
assert.ok(focusCast&&focusShield,'Stonecaller should pre-empt a focused incoming cast');
assert.equal(focusShield!.targetId,focusCast!.targetId,'Stonecaller must shield the exact ally targeted by the incoming cast');

const focusDawn=simulateCombat({seed:'support-focus-dawn',players:[launchPlayer('Dawnkeeper',25),launchPlayer('Wayfinder',25)],enemies:[focusCaster],maxDurationMs:500});
const dawnCast=focusDawn.events.find(event=>event.type==='cast_start'&&event.abilityId==='FOCUS_CAST');
const dawnHot=focusDawn.events.find(event=>event.type==='status_apply'&&event.abilityId==='DK_HOT'&&event.statusKind==='hot');
assert.ok(dawnCast&&dawnHot,'Dawnkeeper should pre-empt a focused incoming cast');
assert.equal(dawnHot!.targetId,dawnCast!.targetId,'Dawnkeeper must apply Sunthread to the exact ally targeted by the incoming cast');

const aoeCaster:CombatantDefinition={...focusCaster,id:'AOE_CASTER',name:'AoE Caster',abilities:[
 {id:'AOE_CAST',name:'AoE Cast',cooldownMs:99_999,castTimeMs:2000,target:'all_enemies',priority:100,interruptible:false,effects:[{kind:'damage',flat:100}]},
]};
const aoeStone=simulateCombat({seed:'support-aoe-stone',players:[launchPlayer('Stonecaller',25),launchPlayer('Wayfinder',25)],enemies:[aoeCaster],maxDurationMs:500});
assert.equal(aoeStone.events.some(event=>event.abilityId==='SC_SHIELD'&&event.type==='shield'),false,'party-wide AoE casts must not be misread as single-target focus for Stonecaller');
const aoeDawn=simulateCombat({seed:'support-aoe-dawn',players:[launchPlayer('Dawnkeeper',25),launchPlayer('Wayfinder',25)],enemies:[aoeCaster],maxDurationMs:500});
assert.equal(aoeDawn.events.some(event=>event.abilityId==='DK_HOT'&&(event.type==='status_apply'||event.type==='hot_tick')),false,'party-wide AoE casts must not be misread as single-target focus for Dawnkeeper');

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
