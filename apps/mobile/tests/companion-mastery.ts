import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../src/core/game';
import {unlockCombatCompanion,companionCombatContribution} from '../src/core/combat-companions';
import {claimCompanionTraining,companionOwned} from '../src/core/companion-runtime';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';
import {companionMasteryAward,companionMasteryBonuses,companionMasteryCompanionXp,companionMasteryProgress,COMPANION_MASTERY_MAX_XP,normalizeCompanionMasteryXp,awardCompanionMasteryXp} from '../src/core/companion-mastery';
import {buildOwnedCompanionCombatant} from '../../../backend/src/server/companions/combat-adapter';
import {individualCompanionPower} from '../../../backend/src/server/companions/team';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';

const now=Date.UTC(2026,10,10);
const max=companionMasteryProgress(COMPANION_MASTERY_MAX_XP);
assert.equal(max.level,100);
assert.equal(max.need,0);
assert.equal(companionMasteryProgress(0).level,1);
assert.equal(companionMasteryProgress(COMPANION_MASTERY_MAX_XP-1).level,99);
assert.equal(normalizeCompanionMasteryXp(Infinity),0);
assert.equal(normalizeCompanionMasteryXp(-50),0);
assert.equal(normalizeCompanionMasteryXp(Number.MAX_SAFE_INTEGER),COMPANION_MASTERY_MAX_XP);
assert.equal(companionMasteryBonuses(0).statPct,0);
assert.equal(companionMasteryBonuses(COMPANION_MASTERY_MAX_XP).statPct,.05);
assert.equal(companionMasteryBonuses(COMPANION_MASTERY_MAX_XP).companionXpPct,.10);
assert.equal(companionMasteryBonuses(COMPANION_MASTERY_MAX_XP).assistPct,.05);
assert.equal(companionMasteryCompanionXp(100,COMPANION_MASTERY_MAX_XP),110);
assert.equal(companionMasteryAward('training',{days:7,eligible:3}),210);
assert.equal(companionMasteryAward('training',{days:0,eligible:3}),0);
assert.ok(companionMasteryAward('trial',{floor:30,boss:true,firstClear:true})>companionMasteryAward('trial',{floor:1}));
assert.ok(companionMasteryAward('expedition',{hours:12,grade:'S'})>companionMasteryAward('expedition',{hours:2,grade:'C'}));
assert.equal(awardCompanionMasteryXp({companionMasteryXp:COMPANION_MASTERY_MAX_XP-1},999).companionMasteryXp,COMPANION_MASTERY_MAX_XP);
assert.equal(normalizeCompanionRuntimeSave({companionMasteryXp:COMPANION_MASTERY_MAX_XP+100}).companionMasteryXp,COMPANION_MASTERY_MAX_XP);

const companion=COMBAT_COMPANIONS.find(x=>x.role!=='tank')!;
let basic=createCharacter(newGame(now),'IRONWARDEN','Mastery Test');
basic=unlockCombatCompanion(basic,companion.id,now);
basic.character!.equippedCombatCompanionId=companion.id;
const enhanced={...basic,account:{...basic.account,companionMasteryXp:COMPANION_MASTERY_MAX_XP}};
const normalSnapshot=companionOwned(basic)[companion.id];
const buffedSnapshot=companionOwned(enhanced)[companion.id];
assert.equal(normalSnapshot.masteryStatMultiplier,1);
assert.equal(buffedSnapshot.masteryStatMultiplier,1.05);
const without=buildOwnedCompanionCombatant(normalSnapshot,{mode:'companion_trial'});
const withMastery=buildOwnedCompanionCombatant(buffedSnapshot,{mode:'companion_trial'});
for(const key of ['maxHp','attackPower','defense'] as const){
 const ratio=withMastery.stats[key]/without.stats[key];
 assert.ok(ratio>1.045&&ratio<1.055,key+' must be buffed ~5% in actual server combat');
}
assert.ok(individualCompanionPower(buffedSnapshot)>individualCompanionPower(normalSnapshot),'Expedition and Trial Power previews include Mastery stat bonus');
assert.ok(companionCombatContribution(enhanced).contributionPct>companionCombatContribution(basic).contributionPct,'equipped assist contribution must improve');
assert.equal(withMastery.stats.critChance,without.stats.critChance,'Mastery cannot buff crit');
assert.equal(withMastery.stats.haste,without.stats.haste,'Mastery cannot buff haste');

const prepared={...enhanced,account:{...enhanced.account,companionSanctuary:{trainingGroundLevel:1,essenceBasinLevel:0,bondHallLevel:0,expeditionPensLevel:0,masteryChamberLevel:0,lastTrainingClaimAtMs:now-86400000}}};
const claimed=claimCompanionTraining(prepared,now);
assert.equal(claimed.account.companionMasteryXp,COMPANION_MASTERY_MAX_XP,'capped max skill XP remains max');
assert.equal(claimed.account.combatCompanionProgress?.[companion.id]?.xp,26,'companion XP bonus applies to real training reward (24→26)');
assert.ok(!('masteryStatMultiplier' in (claimed.account.combatCompanionProgress?.[companion.id]??{})),'transient runtime stat bonus never persists in owned progress');
const repeated=claimCompanionTraining(claimed,now);
assert.equal(repeated.account.combatCompanionProgress?.[companion.id]?.xp,26,'same-day training cannot grant companion XP twice');
assert.equal(repeated.account.companionMasteryXp,COMPANION_MASTERY_MAX_XP,'same-day training cannot grant Mastery XP twice');

const earning={...prepared,account:{...prepared.account,companionMasteryXp:0}};
const first=claimCompanionTraining(earning,now);
assert.equal(first.account.companionMasteryXp,18,'one eligible companion and one day earn 18 trusted Mastery XP');
assert.equal(claimCompanionTraining(first,now).account.companionMasteryXp,18,'replay cannot earn the same Mastery XP');
console.log('PASS: Companion Mastery account levels, caps, real stat buffs, previews, assistance, training XP and claim replay protection');
