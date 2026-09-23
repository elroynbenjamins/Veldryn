import {createCharacter,newGame} from '../src/core/game';
import {accountBonusOverview} from '../src/core/account-bonuses';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const now=1_000_000;
let state=createCharacter(newGame(now),'IRONWARDEN','Bonus Tester');

let overview=accountBonusOverview(state);
ok(!overview.temporary,'Fresh character should not report a temporary account bonus');

state={...state,character:{...state.character!,
 faith:{...(state.character!.faith as any),xp:0,selectedBlessingId:'EMBER_VOW',favoriteBlessingIds:[],hideWeakerBlessings:true},
 ownedBoostIds:['boost:combat_focus'],
 activeDailySupplyBoost:{type:'combat_xp',remainingSeconds:3600},
}};
overview=accountBonusOverview(state);
const combat=overview.modifiers.find(row=>row.id==='combatPowerMultiplier');
ok(!!combat&&combat.percent>8&&combat.percent<8.2,'Overview should reflect compounded Faith + permanent combat power math');
ok(overview.sources.some(row=>row.id==='faith:EMBER_VOW'&&row.scope==='character'),'Selected Faith blessing should appear as an active character source');
ok(overview.sources.some(row=>row.label==='Combat Focus Sigil'&&row.scope==='character'),'Owned permanent boost should appear as an active character source');
ok(overview.temporary?.label==='Combat XP'&&overview.temporary.percent===10&&overview.temporary.remainingSeconds===3600,'Active Daily Supplies boost should appear with exact remaining qualifying time');
ok(overview.sources.some(row=>row.scope==='temporary'&&row.label.includes('Daily Supplies')),'Temporary Daily Supplies source should be labeled separately from permanent modifiers');


state={...state,account:{...state.account,entitlements:{vip_plus:true,supporter:true}}};
overview=accountBonusOverview(state);
ok(overview.sources.some(row=>row.id==='entitlement:vip'&&row.detail.includes('+20 Bank')),'VIP inheritance should expose permanent storage/loadout QoL');
ok(overview.sources.some(row=>row.id==='entitlement:vip_plus'&&row.detail.includes('RGB names')),'VIP+ should expose advanced permanent QoL');
ok(overview.sources.some(row=>row.id==='entitlement:supporter'&&row.detail.includes('Forge')),'Supporter should expose active Forge/name-style QoL');
console.log(JSON.stringify({status:'PASS',combatPowerPct:combat?.percent,sourceCount:overview.sources.length,temporary:overview.temporary},null,2));
