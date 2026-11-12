/**
 * Frame-based animation math shared by the gathering scenes and combat effects.
 *
 * Every animated layer is driven by one normalized progress value (0..1) per loop. The
 * tracks produced here are "held" steps, so a native-driven interpolation jumps from one
 * sprite frame (or one whole art pixel) to the next instead of tweening between them.
 * Nothing in this module touches React, timers, combat or rewards.
 */
export interface StepTrack{inputRange:number[];outputRange:number[]}

/** Gap between a step's last held sample and the next step, in normalized progress. */
const STEP_EPSILON=1e-4;

export function clipDurationMs(durationsMs:readonly number[]):number{
  let total=0;
  for(const duration of durationsMs)total+=Math.max(1,duration);
  return total;
}

/** Normalized start of every frame, plus a closing 1. */
export function frameStarts(durationsMs:readonly number[]):number[]{
  const total=clipDurationMs(durationsMs),starts:number[]=[];
  let elapsed=0;
  for(const duration of durationsMs){starts.push(elapsed/total);elapsed+=Math.max(1,duration);}
  starts.push(1);
  return starts;
}

/** Holds `values[i]` from `starts[i]` until just before `starts[i+1]`. */
export function heldSteps(starts:readonly number[],values:readonly number[]):StepTrack{
  if(!values.length||starts.length<values.length)throw new Error('heldSteps needs a start for every value');
  const inputRange:number[]=[],outputRange:number[]=[];
  for(let index=0;index<values.length;index++){
    const from=Math.max(0,Math.min(1,starts[index]));
    const until=Math.max(from,Math.min(1,index+1<starts.length?starts[index+1]:1));
    const previous=inputRange.length?inputRange[inputRange.length-1]:-1;
    const start=Math.max(from,previous+STEP_EPSILON);
    const end=index===values.length-1?Math.max(start+STEP_EPSILON,until):Math.max(start+STEP_EPSILON/2,until-STEP_EPSILON);
    inputRange.push(start,end);outputRange.push(values[index],values[index]);
  }
  return {inputRange,outputRange};
}

/** Horizontal sheet offset per frame (frames are laid out left to right). */
export function sheetOffsetTrack(durationsMs:readonly number[],frameWidth:number):StepTrack{
  return heldSteps(frameStarts(durationsMs),durationsMs.map((_,frame)=>frame===0?0:-frame*frameWidth));
}

/** Frame shown at `elapsedMs`; looping clips wrap, one-shot clips rest on their last frame. */
export function frameAtElapsed(durationsMs:readonly number[],elapsedMs:number,loop=true):number{
  const total=clipDurationMs(durationsMs);
  if(!durationsMs.length)return 0;
  let cursor=loop?((elapsedMs%total)+total)%total:Math.max(0,elapsedMs);
  for(let frame=0;frame<durationsMs.length;frame++){
    cursor-=Math.max(1,durationsMs[frame]);
    if(cursor<0)return frame;
  }
  return durationsMs.length-1;
}

export interface BallisticParticle{
  /** Normalized progress at which the particle appears. */
  at:number;
  /** How long it stays visible, in normalized progress. */
  life:number;
  /** Launch velocity in art pixels over the particle's life. */
  dx:number;dy:number;
  /** Downward pull in art pixels over the particle's life. */
  gravity:number;
}
export interface ParticleTracks{x:StepTrack;y:StepTrack;opacity:StepTrack}

/**
 * A short arc sampled onto whole art pixels. The particle is invisible outside its life,
 * so one looping progress value can replay it on every swing without any JS work.
 */
export function ballisticTracks(particle:BallisticParticle,unit:number,samples=6):ParticleTracks{
  const start=Math.max(STEP_EPSILON*4,Math.min(.98,particle.at));
  const end=Math.min(1-STEP_EPSILON*4,start+Math.max(.01,particle.life));
  const starts=[0],x=[0],y=[0],opacity=[0];
  for(let sample=0;sample<samples;sample++){
    const t=sample/(samples-1);
    starts.push(start+(end-start)*sample/samples);
    x.push(Math.round(particle.dx*t)*unit);
    y.push(Math.round(particle.dy*t+particle.gravity*t*t)*unit);
    opacity.push(1);
  }
  starts.push(end);x.push(0);y.push(0);opacity.push(0);
  starts.push(1);
  return {x:heldSteps(starts,x),y:heldSteps(starts,y),opacity:heldSteps(starts,opacity)};
}

/** Visible only between two normalized points of a loop (for blinks, flashes and pops). */
export function windowTrack(from:number,to:number,value=1):StepTrack{
  const a=Math.max(STEP_EPSILON*4,Math.min(.98,from)),b=Math.min(1-STEP_EPSILON*4,Math.max(a+.005,to));
  return heldSteps([0,a,b,1],[0,value,0]);
}

export interface CycleClock{lastClaimAtMs:number;progressFraction?:number;cycleSeconds:number}

/**
 * Milliseconds until the running activity completes its next action, from the same
 * timestamps the settlement uses. Returns undefined when no cycle can be scheduled.
 */
export function msUntilNextCycle(clock:CycleClock,nowMs:number):number|undefined{
  const cycleMs=clock.cycleSeconds*1000;
  if(!Number.isFinite(cycleMs)||cycleMs<=0||!Number.isFinite(clock.lastClaimAtMs))return undefined;
  const banked=Math.max(0,Math.min(1,clock.progressFraction??0))*cycleMs;
  const elapsed=Math.max(0,nowMs-clock.lastClaimAtMs)+banked;
  const remaining=cycleMs-(elapsed%cycleMs);
  // A boundary that is effectively "now" belongs to the action that just completed.
  return remaining<1?cycleMs:remaining;
}

/** Number of whole actions completed at `nowMs` since the last claim. */
export function completedCycles(clock:CycleClock,nowMs:number):number{
  const cycleMs=clock.cycleSeconds*1000;
  if(!Number.isFinite(cycleMs)||cycleMs<=0)return 0;
  const banked=Math.max(0,Math.min(1,clock.progressFraction??0))*cycleMs;
  return Math.floor((Math.max(0,nowMs-clock.lastClaimAtMs)+banked)/cycleMs);
}
