import assert from 'node:assert/strict';
import type {QModeRun} from '../../src/server/coop/qmode';
import {liveNodeWaitMs,livePendingCombat,LIVE_DUNGEON_PACING} from '../live-pacing';

assert.equal(LIVE_DUNGEON_PACING.standardVoteMs,8_000);
assert.equal(LIVE_DUNGEON_PACING.eventVoteMs,10_000);
assert.equal(LIVE_DUNGEON_PACING.readyCheckMs,20_000);
assert.equal(liveNodeWaitMs('battle',0),15_000);
assert.equal(liveNodeWaitMs('battle',180_000),30_000);
assert.equal(liveNodeWaitMs('elite',0),25_000);
assert.equal(liveNodeWaitMs('elite',180_000),40_000);
assert.equal(liveNodeWaitMs('boss',0),40_000);
assert.equal(liveNodeWaitMs('boss',180_000),60_000);
assert.equal(liveNodeWaitMs('shrine',180_000),0);
assert.equal(liveNodeWaitMs('camp',180_000),0);

const run={
 lastResolution:{nodeId:'d1-c0',result:{summary:{
  kind:'combat',reason:'victory',durationMs:10_000,
  replayCombatants:[
   {id:'ally',name:'Ally',team:'players',maxHp:100,startHp:100,startShield:0,boss:false},
   {id:'enemy',name:'Enemy',team:'enemies',maxHp:100,startHp:100,startShield:0,boss:false},
  ],
  replayCues:[
   {atMs:0,type:'action',actorId:'ally',actorName:'Ally',targetId:'enemy',targetName:'Enemy',actionKind:'damage',amount:10,states:[{id:'enemy',hp:90,shield:0}]},
   {atMs:5_000,type:'action',actorId:'enemy',actorName:'Enemy',targetId:'ally',targetName:'Ally',actionKind:'damage',amount:5,states:[{id:'ally',hp:95,shield:0}]},
   {atMs:10_000,type:'victory'},
  ],
 }}}
} as unknown as QModeRun;

const beginning=livePendingCombat(run,0,20_000);
assert.equal(beginning?.cues.length,1,'first cue can animate immediately');
assert.equal(beginning?.combatants.length,2,'public starting opponents are visible');
assert.equal('reason' in (beginning??{}),false,'unsettled combat cannot expose victory');
assert.equal('contributions' in (beginning??{}),false,'final contribution totals remain private');
const midpoint=livePendingCombat(run,10_000,20_000);
assert.equal(midpoint?.cues.length,2,'only the first half of simulated cues may be revealed');
const beforeSettlement=livePendingCombat(run,20_000,20_000);
assert.equal(beforeSettlement?.cues.length,2,'terminal cue stays sealed until server settlement');
assert.ok(beforeSettlement?.cues.every(cue=>!['victory','wipe','timeout'].includes(cue.type)));
assert.equal(livePendingCombat(run,1_000,0),undefined,'noncombat rooms do not produce premature battle previews');
console.log('PASS Live dungeon wall-clock pacing and server-gated battle previews');
