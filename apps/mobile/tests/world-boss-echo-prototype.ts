/** Offline World Boss Echo allocator v7 tests — no API, currency or player writes. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {matchWorldBossEchoesPrototype,type WorldBossEchoCandidatePrototype} from '../../../backend/src/server/combat/world-boss-echo-prototype';
import {createWorldBossEventPrototype,applyWorldBossAttemptPrototype} from '../../../backend/src/server/combat/world-boss-event-prototype';
import type {WorldBossSnapshotPrototype} from '../../../backend/src/server/combat/world-boss-event-prototype';

const NOW=1794315600000;
const DAY=24*60*60*1000;
const initiator:WorldBossSnapshotPrototype={
 snapshotId:'primary-ironwarden',ownerAccountId:'my-account',
 resolvedCombatant:launchPlayer('Ironwarden',25)
};
function c(account:string,klass:string,bracket:1|2|3|4|5=3,uses=0,ageDays=1):WorldBossEchoCandidatePrototype{
 return {snapshotId:'snapshot:'+account+':'+klass,ownerAccountId:account,
  resolvedCombatant:{...launchPlayer(klass,25),id:'WB_PLAYER_'+account+':'+klass},
  bracket,uses,updatedAtUtcMs:NOW-ageDays*DAY,eligible:true};
}
const request=(seed:string,candidates:WorldBossEchoCandidatePrototype[],overrides:Record<string,unknown>={})=>({
 seed,accountId:'my-account',atUtcMs:NOW,initiator,bracket:3 as const,candidateEchoes:candidates,...overrides
});
const empty=matchWorldBossEchoesPrototype(request('empty',[]));
assert.equal(empty.squad.length,4,'NPC backfill must permit a four-member party');
assert.equal(empty.npcSlots,3,'no Echo population => three NPC substitutes');
assert.equal(empty.selectedRealEchoIds.length,0,'NPCs never count as borrowed real Echoes');
assert.deepEqual(empty.squad.map(x=>x.resolvedCombatant.role),['tank','damage','damage','support'],
 'when initiator is a Tank the remaining slots are two Damage and one Support');
assert.ok(empty.squad.slice(1).every(x=>x.npc),'every fallback must be explicitly labelled NPC');
assert.equal(new Set(empty.squad.map(x=>x.resolvedCombatant.id)).size,4);
assert.equal(new Set(empty.squad.map(x=>x.ownerAccountId)).size,4);
const repeat=matchWorldBossEchoesPrototype(request('empty',[]));
assert.deepEqual(empty,repeat,'same snapshots and seed must select an identical squad');

const all=[
 c('damage-a','Wayfinder'),c('damage-b','Ravager'),c('support-a','Dawnkeeper'),
 c('damage-c','Knife Dancer',3,3),c('damage-d','Hexweaver',4,0),
];
const full=matchWorldBossEchoesPrototype(request('full',all));
assert.equal(full.npcSlots,0,'eligible player Echoes should be preferred over NPCs');
assert.equal(full.selectedRealEchoIds.length,3,'initiator must not count as a borrowed Echo');
assert.equal(new Set(full.squad.map(x=>x.ownerAccountId)).size,4);
assert.ok(full.squad.every(x=>x.resolvedCombatant.team==='players'));
assert.ok(full.squad.every(x=>Math.abs((all.find(c=>c.snapshotId===x.snapshotId)?.bracket??3)-3)<=1));
assert.ok(full.selectedRealEchoIds.every(x=>!x.includes('damage-d')),
 'matched bracket real Echoes should precede weaker/stronger adjacent bracket when sufficient');

const sameOwner=[c('shared','Wayfinder'),c('shared','Ravager'),c('support-a','Dawnkeeper')];
const onePerOwner=matchWorldBossEchoesPrototype(request('one-per-owner',sameOwner));
assert.equal(onePerOwner.npcSlots,1,'same player cannot fill both Damage slots');
assert.equal(new Set(onePerOwner.squad.map(x=>x.ownerAccountId)).size,4);

const stale=[
 c('old','Wayfinder',3,0,9),
 c('new','Wayfinder',3,0,1),
 c('out-of-bracket','Ravager',1,0,1),
 c('disabled','Dawnkeeper',3,0,1)
];
stale[3].eligible=false;
const filtered=matchWorldBossEchoesPrototype(request('filter',stale));
assert.ok(filtered.selectedRealEchoIds.includes('snapshot:new:Wayfinder'));
assert.ok(!filtered.selectedRealEchoIds.includes('snapshot:old:Wayfinder'));
assert.ok(!filtered.selectedRealEchoIds.includes('snapshot:out-of-bracket:Ravager'));
assert.equal(filtered.npcSlots,2);

const lowUses=matchWorldBossEchoesPrototype(request('fairness',[
 c('overused','Dawnkeeper',3,20),c('underused','Stonecaller',3,1)
]));
assert.ok(lowUses.selectedRealEchoIds.includes('snapshot:underused:Stonecaller'),
 'least-used eligible Echo wins inside the same power bracket');
const differentSeeds=new Set<string>();
for(let seed=0;seed<18;seed++){
 const matched=matchWorldBossEchoesPrototype(request('seed:'+seed,[
  c('supp-1','Dawnkeeper'),c('supp-2','Stonecaller')
 ]));
 differentSeeds.add(matched.squad.find(x=>x.resolvedCombatant.role==='support')!.snapshotId);
}
assert.equal(differentSeeds.size,2,'tie-breaking should rotate suitable Echo owners across seeds');

// Equal-priority pools larger than two must be sampled across ALL candidates.
// CombatRng currently emits a half-range value; Echo selection rescales it.
const rotatedEchoes=new Set<string>();
const wideSupportPool=Array.from({length:8},(_,i)=>c('rotation-'+i,'Stonecaller'));
for(let seed=0;seed<128;seed++){
 const matched=matchWorldBossEchoesPrototype(request('wide-tie:'+seed,wideSupportPool));
 rotatedEchoes.add(matched.squad.find(x=>x.resolvedCombatant.role==='support')!.snapshotId);
}
assert.ok(rotatedEchoes.size>=6,
 'equal-priority 8-player pool must rotate beyond the first two owners');
assert.deepEqual(
 matchWorldBossEchoesPrototype(request('order-independent',wideSupportPool)),
 matchWorldBossEchoesPrototype(request('order-independent',[...wideSupportPool].reverse())),
 'candidate DB return order must not control tie-breaking'
);

const supportFirst:WorldBossSnapshotPrototype={
 snapshotId:'primary-support',ownerAccountId:'my-account',
 resolvedCombatant:launchPlayer('Dawnkeeper')
};
const supportParty=matchWorldBossEchoesPrototype(request('support',[
 c('t1','Ironwarden'),c('d1','Wayfinder'),c('d2','Ravager')
],{initiator:supportFirst}));
assert.equal(supportParty.npcSlots,0);
assert.deepEqual(supportParty.squad.map(x=>x.resolvedCombatant.role),['support','tank','damage','damage']);

const event=createWorldBossEventPrototype({
 eventId:'ECHO_TEST_EVENT',boss:'sunscar',startsAtUtcMs:NOW-100,endsAtUtcMs:NOW+DAY,maxHp:500000
});
const battle=applyWorldBossAttemptPrototype(event,{
 accountId:'my-account',characterId:'primary',requestId:'echo-event-attack',
 atUtcMs:NOW,order:'break_armor',squad:full.squad,
});
assert.equal(battle.receipt.snapshotIds.length,4,'exact Echo identities stored in receipt');
assert.equal(battle.receipt.snapshotIds[0],initiator.snapshotId);
assert.ok(battle.receipt.replay.events.length>0,'matched squad executes actual scripted combat');
assert.equal(battle.event.revision,1,'exactly one committed simulated battle');
const npcBattle=applyWorldBossAttemptPrototype(event,{
 accountId:'my-account',characterId:'primary',requestId:'npc-event-attack',
 atUtcMs:NOW,order:'steady_assault',squad:empty.squad,
});
assert.equal(npcBattle.receipt.snapshotIds.length,4,'NPC fallback works in the isolated receipt prototype');

console.log('WB_ECHO_PROTOTYPE='+JSON.stringify({
 testOnly:true,npcBackfill:empty.npcSlots,
 realEchoMatches:full.selectedRealEchoIds.length,supportedInitiatorRoles:3,
 seedTieCandidates:differentSeeds.size,
 eventDamageVerified:npcBattle.receipt.rawCombatDamage>=npcBattle.receipt.worldHpCredited,
 liveMatchmaking:false,backendWrites:0
}));
