import {launchPlayer} from '../../combat/content/launch-combat';
import type {AuthoritativeLoadoutRecord, LoadoutRepository} from '../../coop/loadout-snapshots';
import {
  deriveVerifiedPartyBossPreparation,freezePartyEventBossLoadout,
  resolvePartyEventDayEightBoss,PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
} from '../weekly-party-boss-v2';
import {buildWeeklyPartySupplyOrders,weeklyPartyBudget,type VerifiedSupplyItem} from '../weekly-party-events-v2';

function assert(value:unknown,message:string):asserts value {
  if(!value)throw new Error('party_boss_v2: '+message);
}
function rejects(fn:()=>unknown,part:string) {
  try {fn();throw new Error('unexpected_success');}
  catch(e) {assert(String(e).includes(part),'expected '+part+' got '+String(e));}
}
const start=Date.parse('2026-11-09T00:00:00Z');
const end=start+7*86_400_000;
const records=new Map<string,AuthoritativeLoadoutRecord>();
for(const [accountId,characterId,classId] of [
  ['a1','c1','Ironwarden'],['a2','c2','Wayfinder'],['a3','c3','Dawnkeeper'],['a4','c4','Ravager'],
] as const) {
  const actor=launchPlayer(classId,25);
  records.set(accountId, {
    accountId,characterId,classId,loadoutId:'main',revision:1,
    characterLevel:25,dungeonUnlocked:false,legalEquipment:true,
    abilities:structuredClone(actor.abilities),capabilities:[],
    stats:{characterId,classId,level:25,
      maxHp:actor.stats.maxHp,attackPower:actor.stats.attackPower,
      healingPower:actor.stats.healingPower,defense:actor.stats.defense,
      accuracy:actor.stats.accuracy,evasion:actor.stats.evasion,
      critChance:actor.stats.critChance,critMultiplier:actor.stats.critMultiplier,
      haste:actor.stats.haste},
  });
}
const repository:LoadoutRepository={
  getOwnedLoadout:(accountId,characterId,loadoutId)=>{
    const r=records.get(accountId);
    return r&&r.characterId===characterId&&r.loadoutId===loadoutId?r:undefined;
  },
};
function load(accountId:string,characterId:string) {
  return freezePartyEventBossLoadout({selection:{
    accountId,characterId,loadoutId:'main',expectedRevision:1,
  },repository,eventStartsAtMs:start,eventEndsAtMs:end,nowMs:end-1});
}
const tank=load('a1','c1'),dealer=load('a2','c2'),
  healer=load('a3','c3'),other=load('a4','c4');
assert(tank.actor.role==='tank'&&dealer.actor.role==='damage'&&healer.actor.role==='support',
  'real class identity is retained');
assert(!records.get('a1')!.dungeonUnlocked,'entry does not force dungeon unlock');
rejects(()=>freezePartyEventBossLoadout({
  selection:{accountId:'a1',characterId:'c2',loadoutId:'main',expectedRevision:1},
  repository,eventStartsAtMs:start,eventEndsAtMs:end,nowMs:start+1000,
}), 'party_boss_loadout_not_owned');
rejects(()=>freezePartyEventBossLoadout({
  selection:{accountId:'a1',characterId:'c1',loadoutId:'main',expectedRevision:99},
  repository,eventStartsAtMs:start,eventEndsAtMs:end,nowMs:start+1000,
}), 'party_boss_loadout_revision_mismatch');
rejects(()=>freezePartyEventBossLoadout({
  selection:{accountId:'a1',characterId:'c1',loadoutId:'main',expectedRevision:1},
  repository,eventStartsAtMs:start,eventEndsAtMs:end,nowMs:end,
}), 'party_boss_loadout_window_closed');

const items:VerifiedSupplyItem[]=[
  {itemId:'GREENWOOD_LOG',category:'wood',tier:'common',secondsPerUnit:20,unlocked:true},
  {itemId:'COPPER_ORE',category:'ore',tier:'common',secondsPerUnit:20,unlocked:true},
  {itemId:'DEWLEAF',category:'herb',tier:'common',secondsPerUnit:30,unlocked:true},
];
const orders=buildWeeklyPartySupplyOrders('broken_caravan',weeklyPartyBudget(4,'standard'),items,7)
  .map(order=>({...order,donatedQuantity:0}));
const noPrep=deriveVerifiedPartyBossPreparation(orders);
assert(noPrep.completedRequiredStages===0&&noPrep.outgoingBonus===0,'no free buffs');
const allOrders=orders.map(order=>({...order,donatedQuantity:order.quantity}));
const full=deriveVerifiedPartyBossPreparation(allOrders);
assert(full.completedRequiredStages===3,'all phases give capped baseline buff');
assert(full.completedOptionalPreparations.length===3,'all three preparations active');
assert(full.outgoingBonus>.08&&full.damageReduction>.08&&full.healingBonus>.12,
  'real persistent combat modifiers from supply consumption');
const phase1=deriveVerifiedPartyBossPreparation(allOrders,1);
assert(phase1.completedRequiredStages===1 && phase1.completedOptionalPreparations.length===0,
  'late preparations cannot affect earlier event phases');
const partial=deriveVerifiedPartyBossPreparation(allOrders.map(order=>({
  ...order,donatedQuantity:order.kind==='optional'&&order.preparation==='specialist'
    ?order.quantity-1:order.quantity,
})));
assert(!partial.completedOptionalPreparations.includes('specialist'),
  'partial donation cannot grant a bonus');
rejects(()=>deriveVerifiedPartyBossPreparation([{...allOrders[0]!,donatedQuantity:allOrders[0]!.quantity+1}]),
  'party_boss_invalid_supply_receipt');

const battleInput={
  eventId:'hidden-party-123',family:'broken_caravan' as const,
  difficulty:'standard' as const,seed:11,
  eventStartsAtMs:start,eventEndsAtMs:end,
  nowMs:end+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
  frozen:[tank,dealer,healer,other],orders:allOrders,
};
rejects(()=>resolvePartyEventDayEightBoss({...battleInput,nowMs:end}),
  'party_boss_day_eight_not_ready');
const result=resolvePartyEventDayEightBoss(battleInput);
assert(result.tiers.length>=1 && result.tiers.length<=12,'finite escalating fights');
assert(result.totalBossDamage>0,'boss takes real simulated damage');
assert(result.rewardBand>=1 && result.rewardBand<=6,'shared tiered reward band');
assert(result.preparation.completedRequiredStages===3,'donations applied at fight time');
assert(result.contributions.length===4,'every saved party member participates');
assert(result.contributions.some(c=>c.role==='support'),'support not excluded');
assert(result.contributions.some(c=>c.role==='tank'),'tank not excluded');
const repeat=resolvePartyEventDayEightBoss(battleInput);
assert(repeat.totalBossDamage===result.totalBossDamage
  && repeat.tiersCleared===result.tiersCleared,'deterministic day 8 replay');
const tampered=structuredClone(tank);
tampered.actor.stats.attackPower*=100;
rejects(()=>resolvePartyEventDayEightBoss({...battleInput,frozen:[tampered,dealer,healer,other]}),
  'party_boss_invalid_frozen_loadout');
const withoutBonus=resolvePartyEventDayEightBoss({...battleInput,orders});
assert(withoutBonus.preparation.outgoingBonus===0,
  'without donations boss receives no imaginary preparation advantage');
assert(result.totalBossDamage>=withoutBonus.totalBossDamage,
  'completed preparation must not reduce boss damage');
const two=resolvePartyEventDayEightBoss({...battleInput,frozen:[tank,dealer]});
assert(two.contributions.length===2,'two-person party is supported');
console.log('Party boss v2: Day 8, saved loadouts, escalating fights, supply bonuses, replay and anti-tamper validated');
