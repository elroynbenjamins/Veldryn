import {assert} from './test-assert';
import {ballisticTracks,clipDurationMs,completedCycles,frameAtElapsed,frameStarts,heldSteps,msUntilNextCycle,sheetOffsetTrack,windowTrack} from '../src/core/sprite-animation';
import {gatheringSceneBiome,gatheringSceneModel,isGatheringSceneKind,nextFishingPhase} from '../src/core/gathering-scene';
import {huntStrikePresentation} from '../src/core/hunt-strike-presentation';
import {DUNGEON_COMBAT_CLASS_FX} from '../src/core/dungeon-combat-fx';
import {GATHERING} from '../src/content/skills';
import {createCharacter,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {activeGatheringRuntimeProjection} from '../src/core/balance-projection';

const increasing=(values:readonly number[])=>values.every((value,index)=>index===0||value>values[index-1]);

// ---- frame stepping ------------------------------------------------------------------
const mining=[230,170,70,120,120,210];
assert.equal(clipDurationMs(mining),920,'mining swing stays inside the 700-1,100 ms target');
const starts=frameStarts(mining);
assert.equal(starts.length,mining.length+1);assert.equal(starts[0],0);assert.equal(starts[starts.length-1],1);
const offsets=sheetOffsetTrack(mining,96);
assert.ok(increasing(offsets.inputRange),'native interpolation needs strictly increasing inputs');
assert.equal(offsets.inputRange.length,offsets.outputRange.length);
assert.deepEqual([...new Set(offsets.outputRange)],[0,-96,-192,-288,-384,-480],'every frame is held at a whole-frame offset, never tweened');
for(let i=0;i<offsets.outputRange.length;i+=2)assert.equal(offsets.outputRange[i],offsets.outputRange[i+1],'a frame holds one value across its whole window');
assert.ok(offsets.inputRange[0]>=0&&offsets.inputRange[offsets.inputRange.length-1]<=1.001);
assert.equal(frameAtElapsed(mining,0),0);assert.equal(frameAtElapsed(mining,470),3,'impact frame begins at 470 ms');
assert.equal(frameAtElapsed(mining,920),0,'looping clips wrap');assert.equal(frameAtElapsed(mining,5_000,false),5,'one-shot clips rest on the last frame');
let rejected=false;try{heldSteps([0],[1,2]);}catch{rejected=true;}
assert.ok(rejected,'a value without a start is rejected');

// ---- particles & windows -------------------------------------------------------------
const chip=ballisticTracks({at:.51,life:.3,dx:-8,dy:-9,gravity:11},2);
for(const part of [chip.x,chip.y,chip.opacity]){assert.ok(increasing(part.inputRange));assert.equal(part.inputRange.length,part.outputRange.length);}
assert.equal(chip.opacity.outputRange[0],0,'particles are hidden before the impact');
assert.equal(chip.opacity.outputRange[chip.opacity.outputRange.length-1],0,'particles are hidden again for the rest of the loop');
assert.ok(chip.x.outputRange.every(value=>Number.isInteger(value)&&value%2===0),'particles move in whole art pixels');
const blink=windowTrack(.2,.26,.5);
assert.ok(increasing(blink.inputRange));assert.deepEqual([...new Set(blink.outputRange)],[0,.5]);

// ---- action boundaries come from the settlement clock --------------------------------
const clock={lastClaimAtMs:1_000_000,progressFraction:.25,cycleSeconds:16};
assert.equal(msUntilNextCycle(clock,1_000_000),12_000,'banked progress shortens the first action');
assert.equal(msUntilNextCycle(clock,1_012_000),16_000,'a boundary that is now belongs to the finished action');
assert.equal(msUntilNextCycle(clock,1_013_000),15_000);
assert.equal(completedCycles(clock,1_011_999),0);assert.equal(completedCycles(clock,1_012_000),1);assert.equal(completedCycles(clock,1_028_000),2);
assert.equal(msUntilNextCycle({lastClaimAtMs:0,cycleSeconds:0},10),undefined,'no cycle, no schedule');
assert.equal(msUntilNextCycle({lastClaimAtMs:Number.NaN,cycleSeconds:10},10),undefined);

// The scene's completion cue must agree with what settlement actually grants.
const t0=1_700_000_000_000;
let state=startGathering(createCharacter(newGame(t0),'WAYFINDER','Tester'),'MEADOW_PERCH_POOL',t0);
const runtime=activeGatheringRuntimeProjection(state);
assert.ok(runtime&&runtime.cycleSeconds>0,'active fishing exposes its action time');
const fishingClock={lastClaimAtMs:state.activity!.lastClaimAtMs,progressFraction:state.activity!.progressFraction,cycleSeconds:runtime!.cycleSeconds};
const firstBoundary=t0+msUntilNextCycle(fishingClock,t0)!;
assert.equal(previewActivityReward(state,firstBoundary-1_500).kills,0,'no catch is resolved before the first boundary');
assert.equal(previewActivityReward(state,firstBoundary+1_500).kills,1,'the first boundary is exactly one resolved fishing action');
assert.equal(completedCycles(fishingClock,firstBoundary+1_500),1);
assert.equal(previewActivityReward(state,firstBoundary+Math.round(runtime!.cycleSeconds*1000)+1_500).kills,2);

// ---- scene selection -----------------------------------------------------------------
assert.equal(gatheringSceneBiome('SUNSCAR'),'sunscar');assert.equal(gatheringSceneBiome('FROSTMARCH'),'frostmarch');assert.equal(gatheringSceneBiome('ASHLANDS'),'ashlands');
assert.equal(gatheringSceneBiome('IRONWOOD'),'asterfall');assert.equal(gatheringSceneBiome(undefined),'asterfall','unknown regions use the generic temperate scene');
assert.ok(isGatheringSceneKind('mining')&&isGatheringSceneKind('woodcutting')&&isGatheringSceneKind('fishing'));
assert.ok(!isGatheringSceneKind('herbalism')&&!isGatheringSceneKind('combat')&&!isGatheringSceneKind(undefined));
assert.deepEqual(gatheringSceneModel({kind:'mining',targetId:'FROSTIRON_VEIN'}),{kind:'mining',biome:'frostmarch',itemId:'FROSTIRON',cavePool:false});
assert.deepEqual(gatheringSceneModel({kind:'fishing',targetId:'CAVE_LOACH_POOL'}),{kind:'fishing',biome:'asterfall',itemId:'CAVE_LOACH',cavePool:true});
assert.equal(gatheringSceneModel({kind:'combat',targetId:'MOSS_RAT'}),undefined);
assert.equal(gatheringSceneModel({kind:'mining',targetId:'GREENWOOD_TREE'}),undefined,'a node is never shown under the wrong skill');
assert.equal(gatheringSceneModel(null),undefined);
for(const node of GATHERING.filter(entry=>isGatheringSceneKind(entry.skillId))){
  const model=gatheringSceneModel({kind:node.skillId,targetId:node.id});
  assert.ok(model,`every ${node.skillId} node resolves a scene: ${node.id}`);
}

// ---- a catch is only ever shown for a completed action -------------------------------
assert.equal(nextFishingPhase('wait','clipEnded'),'wait','waiting never turns into a catch on its own');
assert.equal(nextFishingPhase('wait','actionCompleted'),'pull');
assert.equal(nextFishingPhase('pull','clipEnded'),'cast');assert.equal(nextFishingPhase('cast','clipEnded'),'wait');
assert.equal(nextFishingPhase('cast','actionCompleted'),'cast');assert.equal(nextFishingPhase('pull','actionCompleted'),'pull');

// ---- class strikes stay quick --------------------------------------------------------
for(const profile of Object.values(DUNGEON_COMBAT_CLASS_FX)){
  const strike=huntStrikePresentation(profile);
  assert.ok(strike.travelMs>0&&strike.travelMs<strike.attackMs,`${profile.classId}: the strike lands inside its own animation`);
  assert.ok(strike.travelMs/strike.attackMs>.03&&strike.travelMs/strike.attackMs<.97);
  const [min,max]=strike.projectile==='bolt'?[400,650]:strike.projectile==='arrow'?[350,550]:[250,450];
  assert.ok(strike.attackMs>=min&&strike.attackMs<=max,`${profile.classId}: ${strike.attackMs} ms is inside the ${min}-${max} ms target`);
  assert.equal(strike.accent,profile.damageAccent);
}
assert.equal(huntStrikePresentation(DUNGEON_COMBAT_CLASS_FX.WAYFINDER).projectile,'arrow');
assert.equal(huntStrikePresentation(DUNGEON_COMBAT_CLASS_FX.HEXWEAVER).projectile,'bolt');
assert.equal(huntStrikePresentation(DUNGEON_COMBAT_CLASS_FX.IRONWARDEN).projectile,undefined);
assert.equal(huntStrikePresentation(undefined).impactFx,'slash','an unknown class falls back to a plain melee strike');

console.log('PASS pixel animation: held frame stepping, pixel-snapped particles, settlement-clock action cues, scene selection, earned fishing catch, class strike timing');
