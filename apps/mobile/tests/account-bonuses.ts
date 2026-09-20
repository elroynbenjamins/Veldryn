import {createCharacter,newGame} from '../src/core/game';
import {accountBonusOverview} from '../src/core/account-bonuses';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {selectCollectible,unlockCollectible} from '../src/core/collectibles';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}
function approx(actual:number,expected:number,message:string,tolerance=.001){if(Math.abs(actual-expected)>tolerance)throw new Error(message+': expected '+expected+', got '+actual)}
const now=Date.UTC(2026,8,20,12,0,0);

let state=createCharacter(newGame(now),'WAYFINDER','Bonus Tester');
const original=JSON.stringify(state);
const baseline=accountBonusOverview(state,now);
equal(JSON.stringify(state),original,'Account Bonuses projection must be read-only');
equal(baseline.offline.baseHours,24,'Account Bonuses should expose the 24h Offline Reserve baseline');
equal(baseline.offline.maxHours,36,'Account Bonuses should expose the 36h Offline Reserve maximum');
equal(baseline.offline.hours,24,'Fresh character should show 24h Offline Reserve');
ok(!baseline.dailySupply,'No temporary Daily Supplies boost should be shown when none is active');

state=unlockCollectible(state,'pet:feral_rat');
state=selectCollectible(state,'pet','pet:feral_rat');
const collectible=accountBonusOverview(state,now),attack=collectible.collectionRows.find(row=>row.target==='attack');
ok(!!attack,'Owned selected attack pet should create an Attack collection row');
approx(attack!.passivePct,.5,'Owned collectible passive should be +0.50%');
approx(attack!.activePct,2,'Selected Feral Rat active bonus should be +2.00%');
approx(attack!.totalPct,2.5,'Selected Feral Rat total collection contribution should be +2.50%');
equal(collectible.ownedCounts.pets,1,'Owned pet count should come from the collection journal');
ok(collectible.sourceRows.some(row=>row.label==='Feral Rat'&&row.detail.includes('+2.00% active')),'Selected collectible should appear as a current-character source');

const runtimeAfterPet=characterPermanentMultipliers(state),shownPetCombat=collectible.effectiveRows.find(row=>row.id==='combatPowerMultiplier');
ok(!!shownPetCombat,'Attack collectible should appear in the effective Combat power row');
approx(shownPetCombat!.deltaPct,(runtimeAfterPet.combatPowerMultiplier-1)*100,'Displayed combat power must equal runtime multiplier math');

state={...state,character:{...state.character!,ownedBoostIds:['boost:combat_focus']}};
const boosted=accountBonusOverview(state,now),runtimeBoosted=characterPermanentMultipliers(state);
const shownBoostedCombat=boosted.effectiveRows.find(row=>row.id==='combatPowerMultiplier');
ok(boosted.sourceRows.some(row=>row.label==='Combat Focus Sigil'),'Character-owned permanent boost should appear as a source');
approx(shownBoostedCombat!.deltaPct,(runtimeBoosted.combatPowerMultiplier-1)*100,'Permanent boost display must remain in parity with runtime multiplicative math');

state={...state,character:{...state.character!,activeDailySupplyBoost:{type:'combat_xp',remainingSeconds:5400}}};
const temporary=accountBonusOverview(state,now),runtimeTemporary=characterPermanentMultipliers(state);
ok(!!temporary.dailySupply&&temporary.dailySupply.label==='Combat XP'&&temporary.dailySupply.bonusPct===10,'Active Daily Supplies should be shown separately as a temporary +10% boost');
equal(temporary.dailySupply?.remainingSeconds,5400,'Daily Supplies remaining qualifying time should be projected exactly');
approx(runtimeTemporary.characterXpMultiplier,runtimeBoosted.characterXpMultiplier,'Daily Supplies must not leak into permanent multiplier math');

state={...state,account:{...state.account,patronTier:'crown'}};
const reserve=accountBonusOverview(state,now);
equal(reserve.offline.hours,28,'Crown patron should expose both existing +2h patron Offline Reserve sources');
ok(reserve.offline.sources.filter(source=>source.earned&&source.id==='bloom_patron').length===1,'Bloom Patron Offline Reserve source should be shown as earned for Crown');
ok(reserve.offline.sources.filter(source=>source.earned&&source.id==='crown_patron').length===1,'Crown Patron Offline Reserve source should be shown as earned');
equal(reserve.offline.maxHours,36,'Account Bonuses must never imply a higher Offline Reserve maximum');

const beforeFinal=JSON.stringify(state);
accountBonusOverview(state,now);
equal(JSON.stringify(state),beforeFinal,'Repeated Account Bonuses projections must never mutate save state');

console.log(JSON.stringify({status:'PASS',collectionAttack:attack,combatPower:shownBoostedCombat?.value,offlineHours:reserve.offline.hours,dailySupply:temporary.dailySupply},null,2));
