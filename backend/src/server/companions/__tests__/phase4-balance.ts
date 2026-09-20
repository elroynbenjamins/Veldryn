import {COMPANION_MISSIONS,COMPANION_RARITY_MAX_LEVEL,COMPANION_SERVER_DEFINITIONS,COMPANION_TRIAL_ENEMY_GROWTH,COMPANION_TRIAL_MITIGATION_CONSTANT,companionServerDefinition,companionTechnique,companionTechniques,companionTrialEnemyScale,companionTrialRecommendedPower,companionTrialReward} from '../content';
import {COMBAT_COMPANIONS} from '../../../../apps/mobile/src/content/combat-companions';
import {companionFullInvestmentSummary,companionPaidLevelingTotals} from '../../../../apps/mobile/src/core/combat-companions';
import {buildOwnedCompanionCombatant} from '../combat-adapter';
import {individualCompanionPower} from '../team';
import {buildCompanionTrialEncounter,companionTrialBossPreview} from '../trials';
import {awardCompanionBondXpServer} from '../progression-v2';
import type {CompanionRarity,CompanionRole} from '../policy';
import type {OwnedCompanionSnapshot} from '../domain';

const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m);};
const near=(v:number,min:number,max:number,m:string)=>{if(v<min||v>max)throw new Error(`${m}: ${v} not in ${min}-${max}`);};
const maxed=(id:string):OwnedCompanionSnapshot=>{const d=companionServerDefinition(id)!;return {companionId:id,level:COMPANION_RARITY_MAX_LEVEL[d.rarity],xp:0,ascensionTier:(d.rarity==='standard'||d.rarity==='rare')?2:3,bondLevel:10,bondXp:2520,bondTraitUnlocked:true,selectedTechniqueId:companionTechniques(id)[0]?.id,mastered:d.rarity==='prestige'};};

// Trial guidance and enemy combat difficulty are deliberately separate units.
ok(companionTrialRecommendedPower(1)===2750,'Floor 1 recommendation drifted');
ok(companionTrialRecommendedPower(30)===4300,'Floor 30 recommendation drifted');
ok(companionTrialEnemyScale(30)<2,'Enemy curve became too steep');
ok(COMPANION_TRIAL_ENEMY_GROWTH===1.020,'Enemy growth requires a seeded balance rerun when changed');
ok(COMPANION_TRIAL_MITIGATION_CONSTANT===100,'Companion-only mitigation calibration drifted');
for(let f=2;f<=30;f++)ok(companionTrialRecommendedPower(f)>companionTrialRecommendedPower(f-1),'Recommended power must increase monotonically');

// Rarity targets are TOTAL intended power bands, not another multiplier on old raw rarity stats.
for(const role of ['damage','tank','support'] as CompanionRole[]){
 const groups=new Map<CompanionRarity,number[]>();
 for(const d of COMPANION_SERVER_DEFINITIONS.filter(x=>x.role===role)){const arr=groups.get(d.rarity)??[];arr.push(individualCompanionPower(maxed(d.id)));groups.set(d.rarity,arr);}
 const standard=groups.get('standard')?.[0];if(!standard)continue;
 const avg=(r:CompanionRarity)=>{const a=groups.get(r);return a?.length?a.reduce((x,y)=>x+y,0)/a.length:undefined;};
 const rare=avg('rare'),elite=avg('elite'),prestige=avg('prestige');
 if(rare)near(rare/standard,1.08,1.11,`${role} Rare total power`);
 if(elite)near(elite/standard,1.11,1.14,`${role} Elite total power`);
 if(prestige)near(prestige/standard,1.14,1.18,`${role} Prestige total power`);
}

// Tank/support actives must be meaningful in standalone combat, unlike the legacy assist coefficients.
for(const id of ['UNIT_002','UNIT_003','UNIT_006','UNIT_008']){const p=maxed(id),c=buildOwnedCompanionCombatant(p,{mode:'companion_trial'}),fx=c.abilities[0].effects[0],amount=c.stats.healingPower*(fx.coeff??0)+(fx.flat??0);if(fx.kind==='shield'||fx.kind==='heal')ok(amount>=c.stats.maxHp*.04,`${id} standalone ${fx.kind} is still negligible`);}

// Authored regional/event identities must reach the actual combat snapshot rather than existing as UI-only flavor.
const identityProgress=(id:string,bond=true):OwnedCompanionSnapshot=>({...maxed(id),selectedTechniqueId:undefined,bondLevel:bond?10:9,bondXp:bond?2520:1990,bondTraitUnlocked:bond});
const dune=buildOwnedCompanionCombatant(identityProgress('UNIT_013'),{mode:'companion_trial'}),duneFx=dune.abilities[0].effects[0];ok(dune.abilities[0].name==='Venom Pounce','Dune Stalker active identity missing');ok((duneFx.executeBonus??0)>=.08,'Dune Stalker execute identity missing');
const solar=buildOwnedCompanionCombatant(identityProgress('UNIT_015'),{mode:'companion_trial'}),solarFx=solar.abilities[0].effects[0];ok(solar.abilities[0].name==='Solar Carapace','Solar Scarab active identity missing');ok((solarFx.shieldReflectPct??0)>=.12,'Solar Scarab reflection identity missing');
const bell=buildOwnedCompanionCombatant(identityProgress('UNIT_018'),{mode:'companion_trial'});ok(bell.abilities[0].name==='Resonant Chime'&&bell.abilities[0].cooldownMs<=21600,'Bell Sprite cadence identity missing');
const bloom=buildOwnedCompanionCombatant(identityProgress('EVT_UNIT_003'),{mode:'companion_trial'}),bloomFx=bloom.abilities[0].effects[0];ok(bloom.abilities[0].name==='Living Bastion'&&(bloomFx.value??0)<=-.085,'Bloomwarden mitigation identity missing');
const wyrmNoBond=buildOwnedCompanionCombatant(identityProgress('UNIT_020',false),{mode:'companion_trial'}),wyrmBond=buildOwnedCompanionCombatant(identityProgress('UNIT_020',true),{mode:'companion_trial'});ok((wyrmBond.abilities[0].effects[0].coeff??0)>(wyrmNoBond.abilities[0].effects[0].coeff??0),'Wyrm Echo Bond identity does not improve active damage');
const bond5={...identityProgress('UNIT_013',false),bondLevel:5,bondXp:580},bond6={...identityProgress('UNIT_013',false),bondLevel:6,bondXp:840};const bond5Damage=buildOwnedCompanionCombatant(bond5,{mode:'companion_trial'}),bond6Damage=buildOwnedCompanionCombatant(bond6,{mode:'companion_trial'});ok(bond6Damage.basicAttackCoeff>bond5Damage.basicAttackCoeff&&(bond6Damage.abilities[0].effects[0].coeff??0)>(bond5Damage.abilities[0].effects[0].coeff??0),'Bond 6 Damage resonance missing');
const tank5={...identityProgress('UNIT_015',false),bondLevel:5,bondXp:580},tank6={...identityProgress('UNIT_015',false),bondLevel:6,bondXp:840};const bond5Tank=buildOwnedCompanionCombatant(tank5,{mode:'companion_trial'}),bond6Tank=buildOwnedCompanionCombatant(tank6,{mode:'companion_trial'});ok(bond6Tank.stats.defense>bond5Tank.stats.defense&&(bond6Tank.abilities[0].effects[0].coeff??0)>(bond5Tank.abilities[0].effects[0].coeff??0),'Bond 6 Tank resonance missing');
ok(companionServerDefinition('EVT_UNIT_001')?.active.name==='First Dawn','Event companion authored active name missing');

// Every checkpoint boss has authored HP-threshold mechanics and readable preview metadata.
for(const floor of [5,10,15,20,25,30]){const boss=buildCompanionTrialEncounter(floor)[0],preview=companionTrialBossPreview(floor);ok(!!boss.boss&&!!boss.phases?.length,`Trial boss ${floor} has no HP phase`);ok(!!preview?.phases.length,`Trial boss ${floor} phase preview missing`);for(const phase of boss.phases??[])ok(phase.hpPct>0&&phase.hpPct<1,`Trial boss ${floor} invalid phase threshold`);}
ok((buildCompanionTrialEncounter(30)[0].phases?.length??0)>=2,'Floor 30 should have multiple phase transitions');

// Paid training is an accelerator. Late-level costs must not become a multi-month Essence wall by themselves.
const economyTargets=[
 ['UNIT_001',300,450,4],
 ['UNIT_004',850,1200,4],
 ['UNIT_007',2100,2900,13],
 ['UNIT_012',5000,7000,29],
] as const;
for(const [id,minEss,maxEss,bondstones] of economyTargets){
 const def=COMBAT_COMPANIONS.find(row=>row.id===id)!;
 const paid=companionPaidLevelingTotals(def),full=companionFullInvestmentSummary(def);
 near(paid.companionEssence,minEss,maxEss,`${id} paid-level Essence target`);
 ok(full.ascensionEssence>0&&full.ascensionGold>0,`${id} ascension totals missing`);
 ok(full.bondstones===bondstones,`${id} Bondstone target drifted: ${full.bondstones}`);
}
const standardPaid=companionPaidLevelingTotals(COMBAT_COMPANIONS.find(row=>row.id==='UNIT_001')!),prestigePaid=companionPaidLevelingTotals(COMBAT_COMPANIONS.find(row=>row.id==='UNIT_012')!);
ok(prestigePaid.companionEssence/standardPaid.companionEssence<20,'Prestige paid-level Essence spread became excessive');

// Repeat Trials remain useful for combat XP/Bond but are not an infinite Essence faucet.
for(const f of [1,10,20,30]){const r=companionTrialReward(f,false,f%5===0);ok(r.companionEssence===0,'Repeat Trial Essence faucet returned');ok(r.bondstones===0,'Repeat Trial Bondstones returned');ok(r.gold<=120,'Repeat Trial Gold too high');}

// Sanctuary missions are a slow passive supplement. At C grade with three Pens,
// nonstop use of any one mission stays near ~100-135 Essence/day rather than 500+.
for(const mission of COMPANION_MISSIONS){const perDay=3*(86_400_000/mission.durationMs)*mission.baseRewards.companionEssence;ok(perDay<=140,`${mission.id} passive Essence/day too high: ${perDay}`);ok(mission.baseRewards.gold<=mission.costs.gold,`${mission.id} is a base-grade net Gold faucet`);}

// Bond thresholds are cumulative and shared with the mobile model.
let bond:OwnedCompanionSnapshot={companionId:'UNIT_001',level:1,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false};bond=awardCompanionBondXpServer(bond,89);ok(bond.bondLevel===1&&bond.bondXp===89,'Bond advanced early');bond=awardCompanionBondXpServer(bond,1);ok(bond.bondLevel===2&&bond.bondXp===90,'Bond 2 cumulative threshold wrong');bond=awardCompanionBondXpServer(bond,120);ok(bond.bondLevel===3&&bond.bondXp===210,'Bond 3 cumulative threshold wrong');

console.log('companion-phase4-balance: PASS');
