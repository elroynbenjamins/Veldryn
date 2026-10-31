import assert from 'node:assert/strict';
import {parseAndroidMeminfo,makeAndroidCapture,compareAndroidCaptures} from './android-perf-report.mjs';

const columns=['Flags','IntendedVsync','Vsync','OldestInputEvent','NewestInputEvent','HandleInputStart','AnimationStart','PerformTraversalsStart','DrawStart','SyncQueued','SyncStart','IssueDrawCommandsStart','SwapBuffers','FrameCompleted'];
function rawFrames(ms){
 const records=Array.from({length:150},(_,i)=>{
  const start=1_000_000_000+i*100_000_000;
  const data=Object.fromEntries(columns.map(key=>[key,0]));
  Object.assign(data,{Flags:0,IntendedVsync:start,FrameCompleted:start+ms*1_000_000});
  return columns.map(key=>data[key]).join(',');
 });
 return ['---PROFILEDATA---',columns.join(','),...records,'---PROFILEDATA---'].join('\n');
}
assert.equal(parseAndroidMeminfo(' TOTAL PSS:     204,800     TOTAL RSS: 0'),204800);
assert.equal(parseAndroidMeminfo(' TOTAL   102400   1000   3000'),102400);
assert.equal(parseAndroidMeminfo('no memory data'),null);
const capture=makeAndroidCapture({
 framesRaw:rawFrames(9),memoryRaw:' TOTAL PSS:   204800',scenario:'inventory',
 deviceProfile:'test_phone',build:'1.0.3',hz:90,
});
assert.equal(capture.frames,150);
assert.equal(capture.p95Ms,9);
assert.equal(capture.totalPssMb,200);
assert.equal(capture.overBudgetPercent,0);
assert.ok(!JSON.stringify(capture).includes('auth'),'Capture may contain only aggregates');
assert.throws(()=>makeAndroidCapture({framesRaw:'no valid frames',memoryRaw:'',scenario:'inventory',deviceProfile:'test_phone',build:'1.0.3',hz:90}),/120 valid/);
const sets=(build,p95Ms,jank,pss)=>[0,1,2].map(i=>({...capture,build,p95Ms:p95Ms+i,overBudgetPercent:jank+i,totalPssMb:pss+i,severeJankPercent:1+i}));
const result=compareAndroidCaptures(sets('older',10,1,200),sets('newer',14,6,260));
assert.equal(result.medians.p95Ms.baseline,11);
assert.equal(result.medians.p95Ms.candidate,15);
assert.deepEqual(result.regressionSignals,['p95_frame_time_over_15_percent','jank_over_3_percentage_points','app_pss_over_15_percent']);
const clean=compareAndroidCaptures(sets('older',10,2,200),sets('newer',8,1,190));
assert.deepEqual(clean.regressionSignals,[]);
assert.throws(()=>compareAndroidCaptures(sets('older',10,1,200).slice(0,2),sets('newer',12,4,230)),/three/);
assert.throws(()=>compareAndroidCaptures(sets('older',10,1,200),sets('newer',12,4,230).map(c=>({...c,refreshHz:60}))),/refreshHz/);
assert.throws(()=>compareAndroidCaptures(sets('older',10,1,200),sets('newer',12,4,230).map(c=>({...c,captureMode:'warm'}))),/captureMode/);
console.log('PASS Android frame+PSS capture, comparable run medians and regression signals (no device required)');
