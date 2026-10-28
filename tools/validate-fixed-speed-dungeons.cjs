const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../apps/mobile/src/components/coop/DungeonCombatStage.tsx'),'utf8');
assert(!src.includes('playbackSpeed')&&!src.includes('DUNGEON_PLAYBACK_SPEEDS'));
assert(src.includes('playbackAdvanceDelayMs(current,next,1)')&&src.includes('playbackCastDisplayMs(currentBossCast,1)')&&src.includes('playbackVisualDurationMs(fx.durationMs,1)'));
assert(src.includes("run.mode!=='live'&&(!complete||paused)"));
assert(src.includes("if(run.mode!=='live'&&!reduceMotion&&cues.length>1)setPaused(true)"));
assert(src.includes('Replay encounter'));
console.log('PASS: dungeon playback fixed at 1x and Live transport controls disabled');
