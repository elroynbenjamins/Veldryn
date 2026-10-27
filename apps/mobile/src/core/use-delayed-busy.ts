import {useCallback,useEffect,useRef,useState} from 'react';

/**
 * Buckets a rapidly-changing numeric input into coarser steps so dependent
 * useMemo/useEffect only re-run when the bucket crosses a boundary. For
 * example, bucketing `nowMs` to 5000 keeps time-dependent memoization stable
 * for 5s at a time, which is enough resolution for stat/preview displays
 * while cutting a per-second recompute of expensive projections 5x.
 */
export function bucketedMs(value:number,bucketMs:number):number{
 if(!(bucketMs>0)||!Number.isFinite(value))return value;
 return Math.floor(value/bucketMs)*bucketMs;
}

/**
 * Defers synchronous-heavy work to the frame AFTER the current render/paint,
 * so a button's pressed state animates and the modal's dismiss transitions
 * before the JS thread engages a long compute (e.g. claimActivity simulating
 * thousands of encounters, bulk inventory operations). Falls back to the next
 * microtask if neither requestAnimationFrame nor setImmediate are available.
 */
export function scheduleAfterPaint(work:()=>void|Promise<void>){
 if(typeof requestAnimationFrame==='function'){
  requestAnimationFrame(()=>{if(typeof queueMicrotask==='function')queueMicrotask(()=>{void work()});else Promise.resolve().then(work)});
  return;
 }
 if(typeof setImmediate==='function'){setImmediate(()=>{void work()});return;}
 setTimeout(work,0);
}


/**
 * Suppresses the visible busy state of fast-completing async actions so a
 * subsecond request does not flash a spinner. The spinner is only exposed
 * after `delayMs` has elapsed while the action is still running.
 *
 * `visible` is the loading flag you render to the user.
 * `active` is the raw in-flight flag you use to guard against double-submits.
 * `run(work)` wraps an async callback with the delayed flag + guard.
 */
export function useDelayedBusy(delayMs=250){
 const [visible,setVisible]=useState(false);
 const activeRef=useRef(false);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timerRef.current!==null)clearTimeout(timerRef.current);activeRef.current=false;},[]);
 const run=useCallback(async <T,>(work:()=>Promise<T>|T):Promise<T|undefined>=>{
  if(activeRef.current)return undefined;
  activeRef.current=true;
  if(timerRef.current!==null)clearTimeout(timerRef.current);
  timerRef.current=setTimeout(()=>{if(activeRef.current)setVisible(true);},Math.max(0,delayMs));
  try{return await work();}
  finally{
   activeRef.current=false;
   if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null;}
   setVisible(false);
  }
 },[delayMs]);
 return {visible,isActive:()=>activeRef.current,run} as const;
}
