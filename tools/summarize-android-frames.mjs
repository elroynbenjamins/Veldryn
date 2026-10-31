import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

/** Parse Android SurfaceFlinger/Choreographer gfxinfo frame timestamps, in nanoseconds. */
export function parseAndroidFrameSamples(raw){
 const lines=raw.split(/\r?\n/);
 const samples=[];
 let inside=false,columns=[];
 for(const source of lines){
  const line=source.trim();
  if(line==='---PROFILEDATA---'){inside=!inside;columns=[];continue;}
  if(!inside||!line)continue;
  if(line.startsWith('Flags,')){columns=line.split(',');continue;}
  if(!columns.length)continue;
  const parts=line.split(',');
  if(parts.length!==columns.length)continue;
  const flag=Number(parts[columns.indexOf('Flags')]);
  const start=Number(parts[columns.indexOf('IntendedVsync')]);
  const end=Number(parts[columns.indexOf('FrameCompleted')]);
  if(flag!==0||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||start<=0)continue;
  const ms=(end-start)/1e6;
  if(ms>0&&ms<60000)samples.push(ms);
 }
 return samples;
}
export function summarizeAndroidFrames(samples,hz=60){
 if(!Number.isFinite(hz)||hz<24||hz>240)throw new Error('Refresh rate must be 24–240 Hz.');
 const values=[...samples].filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
 const budget=1000/hz;
 const percentile=p=>values[Math.max(0,Math.ceil(p*values.length)-1)]??0;
 const missed=values.filter(ms=>ms>budget).length;
 const severe=values.filter(ms=>ms>budget*2).length;
 return {
  frames:values.length,refreshHz:hz,frameBudgetMs:budget,
  p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),
  overBudgetFrames:missed,severelyOverBudgetFrames:severe,
  overBudgetPercent:values.length?100*missed/values.length:0,
 };
}
function main(){
 const args=process.argv.slice(2);
 const file=args[0],hzIndex=args.indexOf('--hz'),hz=hzIndex>=0?Number(args[hzIndex+1]):60;
 if(!file||file.startsWith('-')){console.error('Usage: node tools/summarize-android-frames.mjs FRAMESTATS.txt [--hz 60|90|120]');process.exitCode=2;return;}
 const samples=parseAndroidFrameSamples(readFileSync(file,'utf8'));
 const result=summarizeAndroidFrames(samples,hz);
 if(!result.frames){console.error('No valid gfxinfo frame rows. Did you use "adb shell dumpsys gfxinfo PACKAGE framestats" after opening the app?');process.exitCode=1;return;}
 console.log('Android UI frame stats (observed; not a synthetic benchmark):');
 console.log(JSON.stringify({...result,p50Ms:+result.p50Ms.toFixed(2),p95Ms:+result.p95Ms.toFixed(2),p99Ms:+result.p99Ms.toFixed(2),frameBudgetMs:+result.frameBudgetMs.toFixed(2),overBudgetPercent:+result.overBudgetPercent.toFixed(1)},null,2));
 console.log('Note: use the screen refresh rate actually configured on this device; gfxinfo is app-wide and may include unrelated screens.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main();
