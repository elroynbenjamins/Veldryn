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
const preEntitlementDropPercent=overview.modifiers.find(row=>row.label==='Drop chance')?.percent??0;
const preEntitlementCraftingPercent=overview.modifiers.find(row=>row.label==='Crafting speed')?.percent??0;

state={...state,account:{...state.account,entitlements:{vip_plus:true,supporter:true}}};
overview=accountBonusOverview(state);
ok(!overview.sources.some(row=>row.id==='entitlement:vip'),'VIP+ alone should not display an unowned VIP source');
ok(overview.sources.some(row=>row.id==='entitlement:vip_plus'&&row.detail.includes('+10 Inventory')&&row.detail.includes('+5% drops')&&row.detail.includes('+10% Crafting speed')),'VIP+ should expose its storage and progression benefits');
const entitlementDrop=overview.modifiers.find(row=>row.label==='Drop chance');
const entitlementCrafting=overview.modifiers.find(row=>row.label==='Crafting speed');
const expectedDropPercent=((1+preEntitlementDropPercent/100)*1.05-1)*100;
const expectedCraftingPercent=((1+preEntitlementCraftingPercent/100)*1.10-1)*100;
ok(!!entitlementDrop&&Math.abs(entitlementDrop.percent-expectedDropPercent)<0.01,'VIP+ should compound the existing effective drop chance by x1.05');
ok(!!entitlementCrafting&&Math.abs(entitlementCrafting.percent-expectedCraftingPercent)<0.01,'VIP+ should compound the existing effective Crafting speed by x1.10');
ok(overview.sources.some(row=>row.id==='entitlement:supporter'&&row.detail.includes('Forge')),'Supporter should expose active Forge/name-style QoL');
state={...state,account:{...state.account,entitlements:{...state.account.entitlements,vip:true}}};
overview=accountBonusOverview(state);
ok(overview.sources.some(row=>row.id==='entitlement:vip'&&row.detail.includes('+10 Inventory')&&row.detail.includes('+20 Bank')&&row.detail.includes('+5% Gathering speed')&&row.detail.includes('+5% Combat XP')),'Owned VIP should expose its separate storage and progression benefits');
ok(overview.modifiers.some(row=>row.label==='Gathering speed'&&row.percent>=5),'VIP should contribute Gathering speed');
ok(overview.modifiers.some(row=>row.label==='Combat XP'&&row.percent>=5),'VIP should contribute Combat XP');
console.log(JSON.stringify({status:'PASS',combatPowerPct:combat?.percent,sourceCount:overview.sources.length,temporary:overview.temporary},null,2));
