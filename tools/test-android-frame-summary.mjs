import assert from 'node:assert/strict';
import {parseAndroidFrameSamples,summarizeAndroidFrames} from './summarize-android-frames.mjs';
const columns=['Flags','IntendedVsync','Vsync','OldestInputEvent','NewestInputEvent','HandleInputStart','AnimationStart','PerformTraversalsStart','DrawStart','SyncQueued','SyncStart','IssueDrawCommandsStart','SwapBuffers','FrameCompleted','DequeueBufferDuration','QueueBufferDuration','GpuCompleted'];
const frame=(ms,i,flags=0)=>{
 const start=1_000_000_000+i*100_000_000;
 const fields=Object.fromEntries(columns.map(column=>[column,0]));
 fields.Flags=flags;fields.IntendedVsync=start;fields.FrameCompleted=start+ms*1_000_000;
 return columns.map(column=>fields[column]).join(',');
};
const raw=['Graphics info for pid 123','---PROFILEDATA---',columns.join(','),
 frame(8,0),frame(16,1),frame(18,2),frame(35,3),frame(40,4),frame(1,5,1),
 'broken,row','---PROFILEDATA---','some other unrelated section'].join('\n');
const parsed=parseAndroidFrameSamples(raw);
assert.deepEqual(parsed,[8,16,18,35,40],'only valid non-flagged frame rows are included');
const result=summarizeAndroidFrames(parsed,60);
assert.equal(result.frames,5);
assert.equal(result.p50Ms,18);
assert.equal(result.p95Ms,40);
assert.equal(result.overBudgetFrames,3);
assert.equal(result.severelyOverBudgetFrames,2);
assert.equal(summarizeAndroidFrames(parsed,120).overBudgetFrames,4,'frame budget follows actual display refresh');
assert.deepEqual(parseAndroidFrameSamples('no profile data'),[]);
assert.throws(()=>summarizeAndroidFrames([],0),/Refresh rate/);
assert.equal(summarizeAndroidFrames([],60).overBudgetPercent,0);
console.log('PASS Android frame profiler: escaped/invalid rows, p50/p95, severe jank, 60/120 Hz and empty captures');
