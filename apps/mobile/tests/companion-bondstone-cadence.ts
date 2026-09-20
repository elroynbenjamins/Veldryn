import {createCharacter,newGame} from '../src/core/game';
import {awardCompanionRematchBondstone,companionRematchBondstoneStatus,COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP} from '../src/core/companion-runtime';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const monday=Date.UTC(2026,8,14,12);
let state=createCharacter(newGame(monday),'IRONWARDEN','Bondstone Tester');

equal(COMPANION_REMATCH_WEEKLY_BONDSTONE_CAP,2,'Fallen Knight rematch weekly Bondstone cap');
let status=companionRematchBondstoneStatus(state,monday);
equal(status.used,0,'fresh week starts with zero rematch Bondstones');
equal(status.remaining,2,'fresh week has two Bondstone rewards available');

const first=awardCompanionRematchBondstone(state,monday);state=first.state;
equal(first.reward,1,'first successful rematch awards Bondstone');
const second=awardCompanionRematchBondstone(state,monday+86400000);state=second.state;
equal(second.reward,1,'second successful rematch awards Bondstone');
const third=awardCompanionRematchBondstone(state,monday+2*86400000);state=third.state;
equal(third.reward,0,'third successful rematch in same UTC week awards no Bondstone');
status=companionRematchBondstoneStatus(state,monday+5*86400000);
equal(status.used,2,'weekly rematch Bondstone usage is capped');
equal(status.remaining,0,'weekly cap reports no remaining Bondstone rewards');

const normalized=normalizeCompanionRuntimeSave(state.account);
equal(normalized.companionRematchBondstones,2,'rematch Bondstone usage survives save normalization');
equal(normalized.companionRematchBondstoneWeek,status.week,'rematch Bondstone week survives save normalization');

const nextWeek=monday+7*86400000;
status=companionRematchBondstoneStatus(state,nextWeek);
equal(status.used,0,'new UTC week resets rematch Bondstone allowance');
equal(status.remaining,2,'new UTC week restores rematch Bondstone allowance');
const resetAward=awardCompanionRematchBondstone(state,nextWeek);
equal(resetAward.reward,1,'new UTC week can award Bondstones again');
equal(resetAward.state.account.companionRematchBondstones,1,'new week starts a new rematch Bondstone counter');

const corrupt=normalizeCompanionRuntimeSave({...state.account,companionRematchBondstones:999});
equal(corrupt.companionRematchBondstones,2,'save normalization clamps forged rematch Bondstone usage');

console.log('PASS: Fallen Knight rematch Bondstone cadence validates');
