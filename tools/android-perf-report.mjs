import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseAndroidFrameSamples,summarizeAndroidFrames} from './summarize-android-frames.mjs';

const allowedLabel=/^[A-Za-z0-9_.-]{1,64}$/;
const median=values=>{const list=[...values].sort((a,b)=>a-b);return list.length%2?list[(list.length-1)/2]:(list[list.length/2-1]+list[list.length/2])/2;};
const round=(n,precision=2)=>Number(n.toFixed(precision));

/** Android meminfo varies by SDK; never persist raw dumps or package IDs. */
export function parseAndroidMeminfo(raw){
 const pss=raw.match(/^\s*TOTAL PSS:\s*([0-9,]+)\b/im);
 if(pss)return Number(pss[1].replaceAll(',',''));
 // Older Android: the app's own TOTAL row's first column is PSS (KB).
 const total=raw.match(/^\s*TOTAL\s+([0-9,]+)\s+[0-9,]+\s+[0-9,]+/im);
 return total?Number(total[1].replaceAll(',','')):null;
}
export function makeAndroidCapture({framesRaw,memoryRaw,scenario,deviceProfile,build,hz,captureMode='cold'}){
 if(![scenario,deviceProfile,build].every(value=>typeof value==='string'&&allowedLabel.test(value)))throw new Error('Capture labels must be 1–64 alphanumeric, dot, underscore or dash characters.');
 if(!['cold','warm'].includes(captureMode))throw Error('Capture mode must be cold or warm.');
 const samples=parseAndroidFrameSamples(framesRaw),stats=summarizeAndroidFrames(samples,hz);
 if(stats.frames<120)throw new Error('At least 120 valid captured frames are required; repeat a 30–60s screen scenario.');
 const pssKb=parseAndroidMeminfo(memoryRaw);
 return {
  schemaVersion:1,scenario,deviceProfile,build,captureMode,
  refreshHz:stats.refreshHz,frames:stats.frames,
  p50Ms:round(stats.p50Ms),p95Ms:round(stats.p95Ms),p99Ms:round(stats.p99Ms),
  overBudgetPercent:round(stats.overBudgetPercent),
  severeJankPercent:round(100*stats.severelyOverBudgetFrames/stats.frames),
  totalPssMb:pssKb===null?null:round(pssKb/1024),
 };
}
function validateCaptures(captures,label){
 if(!Array.isArray(captures)||captures.length<3)throw new Error(label+' requires at least three capture summaries.');
 const first=captures[0];
 for(const c of captures){
  if(!c||c.schemaVersion!==1||c.frames<120||![c.p95Ms,c.overBudgetPercent,c.severeJankPercent].every(x=>Number.isFinite(x)&&x>=0))
   throw new Error(label+' has an invalid or undersampled capture.');
  if(c.scenario!==first.scenario||c.deviceProfile!==first.deviceProfile||c.refreshHz!==first.refreshHz||c.build!==first.build||c.captureMode!==first.captureMode)
   throw new Error(label+' captures must have matching scenario/device/refresh rate/build.');
 }
 return first;
}
export function compareAndroidCaptures(baseline,candidate){
 const old=validateCaptures(baseline,'baseline'),next=validateCaptures(candidate,'candidate');
 for(const key of ['scenario','deviceProfile','refreshHz','captureMode'])if(old[key]!==next[key])throw new Error('Cannot compare different '+key+'; repeat on the same device and refresh rate.');
 const metrics=['p95Ms','overBudgetPercent','severeJankPercent','totalPssMb'];
 const averages={};
 for(const key of metrics){
  const left=baseline.map(v=>v[key]),right=candidate.map(v=>v[key]);
  if([...left,...right].some(v=>v===null||!Number.isFinite(v)))continue;
  averages[key]={baseline:round(median(left)),candidate:round(median(right))};
 }
 const flags=[];
 if(averages.p95Ms?.baseline>0&&averages.p95Ms.candidate>averages.p95Ms.baseline*1.15)flags.push('p95_frame_time_over_15_percent');
 if(averages.overBudgetPercent&&averages.overBudgetPercent.candidate>averages.overBudgetPercent.baseline+3)flags.push('jank_over_3_percentage_points');
 if(averages.totalPssMb?.baseline>0&&averages.totalPssMb.candidate>averages.totalPssMb.baseline*1.15)flags.push('app_pss_over_15_percent');
 return {schemaVersion:1,scenario:old.scenario,deviceProfile:old.deviceProfile,refreshHz:old.refreshHz,captureMode:old.captureMode,
  baselineBuild:old.build,candidateBuild:next.build,baselineRuns:baseline.length,candidateRuns:candidate.length,
  medians:averages,regressionSignals:flags,
  note:'Indicative only. Confirm reproductions on the same device with a consistent test save, screen path and duration. No automatic production release gates.'};
}
function values(args,name){const out=[];for(let i=0;i<args.length;i++)if(args[i]==='--'+name)out.push(args[i+1]);return out;}
function one(args,key){const result=values(args,key);if(result.length!==1||!result[0]||result[0].startsWith('--'))throw new Error('Expected exactly one --'+key);return result[0];}
function main(){
 const [action,...args]=process.argv.slice(2);
 if(action==='capture'){
  const output=one(args,'out');
  const result=makeAndroidCapture({
   framesRaw:fs.readFileSync(one(args,'frames'),'utf8'),memoryRaw:fs.readFileSync(one(args,'memory'),'utf8'),
   scenario:one(args,'scenario'),deviceProfile:one(args,'device-profile'),
   build:one(args,'build'),hz:Number(one(args,'hz')),captureMode:values(args,'capture-mode')[0]??'cold',
  });
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log('Saved privacy-minimal Android capture: '+output);
 }else if(action==='compare'){
  const baseline=values(args,'baseline').map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
  const candidate=values(args,'candidate').map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
  const result=compareAndroidCaptures(baseline,candidate);
  console.log(JSON.stringify(result,null,2));
  const output=values(args,'out');
  if(output.length){if(output.length!==1)throw new Error('Only one --out supported.');fs.writeFileSync(output[0],JSON.stringify(result,null,2)+'\n',{flag:'wx'});}
 }else throw new Error('Usage: node tools/android-perf-report.mjs capture --frames FILE --memory FILE --scenario inventory --device-profile phone_a --build 1.0.3 --hz 120 --out summary.json | compare --baseline A.json --baseline B.json --baseline C.json --candidate D.json --candidate E.json --candidate F.json [--out result.json]');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{main();}catch(error){console.error('Android profile error: '+error.message);process.exitCode=1;}
}
