import {COMBAT_COMPANIONS,COMPANION_RARITY_CONFIG,COMPANION_SANCTUARY_CONFIG,combatCompanionDef} from '../src/content/combat-companions';
import {applyCompanionBondXp,applyCompanionXp,ascendCombatCompanion,canEquipCompanion,canUseOwnedCompanion,classCompanionRole,companionAscensionCost,companionBondXpMultiplier,companionCombatContribution,companionCurrentLevelCap,equipCombatCompanion,grantCompanionBondFromUse,grantEquippedCompanionUse,isCompanionAvailable,isCombatCompanionMastered,nextCompanionAscension,purchaseCompanionLevel,reconcileCombatCompanionUnlocks,sanitizeCombatCompanionState,unlockCombatCompanion,upgradeCompanionSanctuary} from '../src/core/combat-companions';
import type {OwnedCompanionProgress,VeldrynClassId} from '../src/core/combat-companion-types';
import {companionTrialResetCountdown} from '../src/core/companion-phase2-presentation';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function throws(fn:()=>unknown,message:string){let did=false;try{fn()}catch{did=true}if(!did)throw new Error(message)}
const materials=['IRONWOOD_FANG','RUNEBOUND_CORE','WISP_DUST','THORN_SAP','LANTERNSTEEL_SHARD','OATHGLASS_SHARD','GLOAM_DUST','OATHGLASS_FRAGMENT','ECHO_QUARTZ','FALLEN_RIVET','TORN_OATHCLOTH','AMBERGLASS','ASTRAL_SCRIPT','SUNSTONE_ORE','RIMEGLASS','CHOIR_BLOOM','FROSTIRON','BANNER_ASH'];

function progress(level=1,ascensionTier:0|1|2|3=0,bondLevel=1):OwnedCompanionProgress{return {level,xp:0,ascensionTier,bondLevel,bondXp:0,bondTraitUnlocked:bondLevel>=10};}
function state(classId:VeldrynClassId='IRONWARDEN'){
  return {
    character:{id:'C1',classId,gold:100000,equippedCombatCompanionId:undefined as string|undefined},
    otherCharacters:[{character:{id:'C2',classId:'DAWNKEEPER' as const,gold:5000,equippedCombatCompanionId:undefined as string|undefined}}],
    inventory:{stacks:materials.map(itemId=>({itemId,quantity:999}))},
    bank:{stacks:[] as {itemId:string;quantity:number}[]},
    quests:[{questId:'QST_005',status:'claimed'}],
    defeatedBossIds:['FALLEN_KNIGHT'],
    skills:[{skillId:'smithing',level:30},{skillId:'fishing',level:25}],
    account:{unlockedCombatCompanionIds:[] as string[],combatCompanionProgress:{} as Record<string,OwnedCompanionProgress>,companionUnlockProgress:{} as Record<string,number>,companionEssence:100000,bondstones:1000,companionSanctuary:{trainingGroundLevel:0,essenceBasinLevel:0,bondHallLevel:0,expeditionPensLevel:0,masteryChamberLevel:1}},
  };
}
function own<T extends ReturnType<typeof state>>(input:T,id:string,p=progress()){const s=unlockCombatCompanion(input,id,1);return {...s,account:{...s.account,combatCompanionProgress:{...s.account.combatCompanionProgress,[id]:p}}};}

// 1–4. Same-role prohibition and cross-role compatibility.
eq(canEquipCompanion('damage','damage'),false,'Damage cannot equip Damage');
eq(canEquipCompanion('tank','tank'),false,'Tank cannot equip Tank');
eq(canEquipCompanion('support','support'),false,'Support cannot equip Support');
ok(canEquipCompanion('damage','tank')&&canEquipCompanion('damage','support')&&canEquipCompanion('tank','damage')&&canEquipCompanion('support','damage'),'Cross-role combinations must work');
eq(classCompanionRole('WAYFINDER'),'damage','Wayfinder role mapping');
eq(classCompanionRole('IRONWARDEN'),'tank','Ironwarden role mapping');
eq(classCompanionRole('DAWNKEEPER'),'support','Dawnkeeper role mapping');


// Unlock requirements are evaluated from data rather than companion-ID conditionals.
const reconciled=reconcileCombatCompanionUnlocks(state('IRONWARDEN'),1);ok(reconciled.account.unlockedCombatCompanionIds.includes('UNIT_001'),'Quest unlock requirement did not reconcile');ok(reconciled.account.unlockedCombatCompanionIds.includes('UNIT_006'),'Boss unlock requirement did not reconcile');

// 5. Locked companion cannot be equipped.
throws(()=>equipCombatCompanion(state('IRONWARDEN'),'UNIT_004'),'Locked companion was equipped');

// 6. XP cannot exceed current cap.
const rare=combatCompanionDef('UNIT_004')!;let p=applyCompanionXp(progress(10,0,1),rare,999999);eq(p.level,10,'XP exceeded initial cap');eq(p.xp,0,'XP should not bank beyond a cap');

// 7, 9–11. Ascension raises cap, validates every resource, deducts once, and failed attempts are atomic.
let asc=own(state('IRONWARDEN'),'UNIT_004',progress(10,0,1));const cost=companionAscensionCost(rare,1),beforeGold=asc.character!.gold,beforeEssence=asc.account.companionEssence,beforeStones=asc.account.bondstones,beforeMat=asc.inventory.stacks.find(x=>x.itemId===cost.materialId)!.quantity;
asc=ascendCombatCompanion(asc,'UNIT_004');eq(asc.account.combatCompanionProgress.UNIT_004.ascensionTier,1,'Ascension tier did not advance');eq(companionCurrentLevelCap(rare,asc.account.combatCompanionProgress.UNIT_004),20,'Ascension I did not raise cap to 20');eq(asc.character!.gold,beforeGold-cost.gold,'Gold deducted incorrectly');eq(asc.account.companionEssence,beforeEssence-cost.companionEssence,'Essence deducted incorrectly');eq(asc.account.bondstones,beforeStones-cost.bondstones,'Bondstones deducted incorrectly');eq(asc.inventory.stacks.find(x=>x.itemId===cost.materialId)!.quantity,beforeMat-(cost.materialQuantity??0),'Regional material deducted incorrectly');
let fail=own(state('IRONWARDEN'),'UNIT_004',progress(10,0,1));fail={...fail,account:{...fail.account,bondstones:0}};const snapshot=JSON.stringify(fail);throws(()=>ascendCombatCompanion(fail,'UNIT_004'),'Ascension should fail without Bondstones');eq(JSON.stringify(fail),snapshot,'Failed Ascension mutated resources');

// Direct levels use Gold + Essence exactly once.
let levelState=own(state('IRONWARDEN'),'UNIT_004',progress(11,1,1));const levelGold=levelState.character!.gold,levelEss=levelState.account.companionEssence;levelState=purchaseCompanionLevel(levelState,'UNIT_004');eq(levelState.account.combatCompanionProgress.UNIT_004.level,12,'Direct level did not advance');ok(levelState.character!.gold<levelGold&&levelState.account.companionEssence<levelEss,'Direct level did not consume both routine resources');

// 8. Hard rarity maxima.
for(const [id,max,tier] of [['UNIT_001',20,1],['UNIT_004',25,2],['UNIT_007',30,3],['UNIT_020',35,3]] as const){const def=combatCompanionDef(id)!;const after=applyCompanionXp(progress(max,tier,10),def,999999);eq(after.level,max,`${def.rarity} exceeded max level`);eq(COMPANION_RARITY_CONFIG[def.rarity].maxLevel,max,`${def.rarity} config max mismatch`)}

// 12–13. Bond only accepts real-use sources and Bond 10 unlocks the trait.
let bond=own(state('IRONWARDEN'),'UNIT_004',progress(1,0,1));const bondBefore=JSON.stringify(bond.account.combatCompanionProgress.UNIT_004);throws(()=>grantCompanionBondFromUse(bond,'UNIT_004','essence' as any,1),'Invalid Bond source accepted');eq(JSON.stringify(bond.account.combatCompanionProgress.UNIT_004),bondBefore,'Invalid Bond source mutated progress');const bonded=applyCompanionBondXp(progress(1,0,1),999999);eq(bonded.bondLevel,10,'Bond did not reach level 10');eq(bonded.bondTraitUnlocked,true,'Bond Trait did not unlock at Bond 10');
let cumulativeBond=applyCompanionBondXp(progress(1,0,1),89);eq(cumulativeBond.bondLevel,1,'Bond advanced before cumulative threshold');eq(cumulativeBond.bondXp,89,'Bond XP should be cumulative');cumulativeBond=applyCompanionBondXp(cumulativeBond,1);eq(cumulativeBond.bondLevel,2,'Bond 2 threshold mismatch');eq(cumulativeBond.bondXp,90,'Bond 2 cumulative XP mismatch');cumulativeBond=applyCompanionBondXp(cumulativeBond,120);eq(cumulativeBond.bondLevel,3,'Bond 3 threshold mismatch');eq(cumulativeBond.bondXp,210,'Bond 3 cumulative XP mismatch');

// Combat use grants both level XP and Bond XP to the equipped companion.
bond=equipCombatCompanion(bond,'UNIT_004');const used=grantEquippedCompanionUse(bond,'battle',5);ok(used.account.combatCompanionProgress.UNIT_004.xp>0,'Combat use did not grant Companion XP');ok(used.account.combatCompanionProgress.UNIT_004.bondXp>0,'Combat use did not grant Bond XP');

// 14–15. Progress is account-wide; equipped ID is character-specific.
const shared=used.account.combatCompanionProgress.UNIT_004;eq(shared.level,used.account.combatCompanionProgress.UNIT_004.level,'Account companion progression missing');eq(used.character!.equippedCombatCompanionId,'UNIT_004','Active character lost equipped companion');eq(used.otherCharacters![0].character.equippedCombatCompanionId,undefined,'Equipped companion leaked to another character');

// 16. Legacy same-role equipped loadouts are safely unequipped.
const legacy:any=state('WAYFINDER');legacy.character.selectedCombatUnitId='UNIT_001';legacy.account.ownedCombatUnitIds=['UNIT_001'];const cleaned=sanitizeCombatCompanionState(legacy);eq(cleaned.character!.equippedCombatCompanionId,undefined,'Invalid legacy same-role loadout survived normalization');ok(cleaned.account.unlockedCombatCompanionIds.includes('UNIT_001'),'Legacy ownership was not preserved');eq(cleaned.account.combatCompanionProgress.UNIT_001.level,10,'Legacy owned unit did not receive migration level');
const residualLegacy:any=own(state('IRONWARDEN'),'UNIT_004',{...progress(10,1,3),bondXp:50});const residualClean=sanitizeCombatCompanionState(residualLegacy);eq(residualClean.account.combatCompanionProgress.UNIT_004.bondXp,260,'Legacy residual Bond XP was not promoted to cumulative semantics');

// Passive cosmetic pets must not be migrated into active combat units.
const petLegacy:any=state();petLegacy.account.unlockedCosmeticPetIds=['PET_001'];petLegacy.character.ownedPetIds=['PET_002'];const petClean=sanitizeCombatCompanionState(petLegacy);eq(petClean.account.unlockedCombatCompanionIds.length,0,'Passive Pet ownership leaked into Combat Companion ownership');

// 17. Recurring event metadata affects availability, never previously earned ownership.
const eventDef={...combatCompanionDef('UNIT_001')!,availability:{eventSource:'FROSTFALL',originalReleaseYear:2026,recurringAvailability:'annual' as const,veteranCosmeticEligibility:true}};eq(isCompanionAvailable(eventDef,{activeEventIds:[]}),false,'Inactive event companion incorrectly available to unlock');eq(isCompanionAvailable(eventDef,{activeEventIds:['FROSTFALL']}),true,'Recurring event did not reopen availability');const prior=own(state(),'UNIT_001');eq(canUseOwnedCompanion(prior,'UNIT_001'),true,'Previously obtained companion was removed by event availability');

// 18. Sanctuary Bond bonus is a single config multiplier, not multiplicative stacking.
let sanctuary=own(state('IRONWARDEN'),'UNIT_004');sanctuary=upgradeCompanionSanctuary(sanctuary,'bondHall');eq(companionBondXpMultiplier(sanctuary),1.05,'Bond Hall level 1 bonus applied incorrectly');sanctuary=upgradeCompanionSanctuary(sanctuary,'bondHall');eq(companionBondXpMultiplier(sanctuary),1.10,'Bond Hall level 2 stacked incorrectly');

// 19. Rarity budget is applied once. Compare full-investment same-role output contribution ratios.
function fullContribution(id:string,level:number,tier:0|1|2|3){let s=own(state('IRONWARDEN'),id,progress(level,tier,10));s=equipCombatCompanion(s,id);return companionCombatContribution(s).contributionPct;}
const std=fullContribution('UNIT_001',20,1),r=fullContribution('UNIT_004',25,2),e=fullContribution('UNIT_007',30,3),pr=fullContribution('UNIT_020',35,3);ok(Math.abs(r/std-1.09)<.005,'Rare rarity budget double-scaled');ok(Math.abs(e/std-1.12)<.005,'Elite rarity budget double-scaled');ok(Math.abs(pr/std-1.155)<.005,'Prestige rarity budget double-scaled');

// 20. Save/load roundtrip preserves ownership, progression, resources, sanctuary and character-specific equip.
let saved=own(state('IRONWARDEN'),'UNIT_004',progress(18,1,7));saved=equipCombatCompanion(saved,'UNIT_004');saved={...saved,account:{...saved.account,companionEssence:4321,bondstones:17,companionSanctuary:{...saved.account.companionSanctuary,bondHallLevel:2}}};const loaded=sanitizeCombatCompanionState(JSON.parse(JSON.stringify(saved)));eq(loaded.character!.equippedCombatCompanionId,'UNIT_004','Equipped ID lost on save/load');eq(loaded.account.combatCompanionProgress.UNIT_004.level,18,'Level lost on save/load');eq(loaded.account.combatCompanionProgress.UNIT_004.bondLevel,7,'Bond lost on save/load');eq(loaded.account.companionEssence,4321,'Essence lost on save/load');eq(loaded.account.bondstones,17,'Bondstones lost on save/load');eq(loaded.account.companionSanctuary.bondHallLevel,2,'Sanctuary lost on save/load');


// Phase 2/3 client projection uses server-derived Trial time, never the device clock.
eq(companionTrialResetCountdown({serverNow:'2026-09-11T12:00:00.000Z',endsAt:'2026-10-01T00:00:00.000Z'}),'Resets in: 19d 12h','Monthly Trial countdown did not use server timestamps');
eq(companionTrialResetCountdown({serverNow:'2026-09-30T17:18:00.000Z',endsAt:'2026-10-01T00:00:00.000Z'}),'Resets in: 6h 42m','Near-reset Trial countdown is incorrect');

// Phase 2/3 save normalization preserves a valid Technique and Pen progression.
let phase2=own(state('IRONWARDEN'),'UNIT_004',{...progress(20,2,7),selectedTechniqueId:'UNIT_004_EXECUTIONER'} as OwnedCompanionProgress);
phase2={...phase2,account:{...phase2.account,companionSanctuary:{...phase2.account.companionSanctuary,expeditionPensLevel:3}}};
const phase2Loaded=sanitizeCombatCompanionState(JSON.parse(JSON.stringify(phase2)));
eq(phase2Loaded.account.combatCompanionProgress.UNIT_004.selectedTechniqueId,'UNIT_004_EXECUTIONER','Technique selection lost on save/load');
eq(phase2Loaded.account.companionSanctuary.expeditionPensLevel,3,'Expedition Pen level lost on save/load');
eq(COMPANION_SANCTUARY_CONFIG.expeditionPens.maxLevel,3,'Expedition Pens should support three mission slots');


// Ecosystem v3 migration/profile safety: one free showcase slot for new state, discovered/codex arrays are normalized.
const phase3Legacy:any=state();phase3Legacy.account.companionPhase2Profile={showcaseCompanionIds:['UNIT_001'],showcaseSlotsUnlocked:2,discoveredCompanionIds:['UNIT_001','UNIT_001'],claimedCodexMilestoneIds:['A','A'],codexRewardIds:['R','R']};phase3Legacy.account.unlockedCombatCompanionIds=['UNIT_001'];phase3Legacy.account.combatCompanionProgress={UNIT_001:progress(20,2,10)};const phase3Clean=sanitizeCombatCompanionState(phase3Legacy);eq(phase3Clean.account.companionPhase2Profile.showcaseSlotsUnlocked,2,'Showcase slots lost');eq(phase3Clean.account.companionPhase2Profile.discoveredCompanionIds.length,1,'Codex discovery not deduplicated');eq(phase3Clean.account.companionPhase2Profile.claimedCodexMilestoneIds.length,1,'Codex claim IDs not deduplicated');
// Standard companions can complete Ascension II at level 20 so the shared Technique gate is reachable without increasing max level.
const standard=combatCompanionDef('UNIT_001')!;eq(nextCompanionAscension(standard,progress(20,1,7)),2,'Standard Ascension II Technique gate is unreachable');ok(isCombatCompanionMastered(standard,progress(20,2,10)),'Fully progressed Standard not recognized as Mastered');
// A companion on a Sanctuary Expedition cannot be newly equipped; client check mirrors server authority for immediate UX.
let expeditionBusy:any=own(state('IRONWARDEN'),'UNIT_004',progress(20,2,7));expeditionBusy.account.companionAssignments=[{assignmentId:'A1',missionId:'M1',companionIds:['UNIT_004'],startedAt:'2026-09-01T00:00:00Z',endsAt:'2026-09-02T00:00:00Z',status:'active'}];throws(()=>equipCombatCompanion(expeditionBusy,'UNIT_004'),'Expedition-busy companion was equipped');

ok(COMBAT_COMPANIONS.length>=24,'Expected the existing regional Combat Unit content family to be represented');
console.log('combat-companions: PASS (20 acceptance areas + migration separation)');
