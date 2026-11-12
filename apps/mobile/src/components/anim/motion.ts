import {useEffect,useRef,useSyncExternalStore} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Platform} from 'react-native';
import {msUntilNextCycle,type CycleClock} from '../../core/sprite-animation';

/**
 * Shared motion policy for decorative animation.
 *
 * One AppState and one reduce-motion subscription serve every animated component, so a
 * screen full of sprites does not register a listener each. Decorative loops stop while
 * the app is in the background and when either the in-game or the system reduce-motion
 * preference is on.
 */
const listeners=new Set<()=>void>();
let appActive=AppState.currentState!=='background'&&AppState.currentState!=='inactive';
let systemReduceMotion=false;
let subscriptions:{remove():void}[]=[];
const emit=()=>{for(const listener of listeners)listener();};
const setReduced=(value:boolean)=>{if(value!==systemReduceMotion){systemReduceMotion=value;emit();}};
/** System listeners exist only while something is animating, and are released with the last subscriber. */
function start(){
  if(subscriptions.length)return;
  appActive=AppState.currentState!=='background'&&AppState.currentState!=='inactive';
  subscriptions=[
    AppState.addEventListener('change',status=>{
      const next=status==='active';
      if(next!==appActive){appActive=next;emit();}
    }),
    AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced),
  ];
  void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(()=>{});
}
function stop(){
  for(const subscription of subscriptions)subscription.remove();
  subscriptions=[];
}
function subscribe(listener:()=>void){
  start();listeners.add(listener);
  return()=>{listeners.delete(listener);if(!listeners.size)stop();};
}
const snapshot=()=>(appActive?1:0)|(systemReduceMotion?2:0);
const serverSnapshot=()=>1;

/**
 * Loops must run on the native driver on devices. react-native-web has no native driver and
 * plays a "native" loop exactly once, so the web build drives loops from JS instead.
 */
export const LOOP_NATIVE_DRIVER=Platform.OS!=='web';

/** A normalized 0..1 driver: a looping value, a one-shot value, or a slice of either. */
export type Progress=Animated.Value|Animated.AnimatedInterpolation<number>;
/** Clamped interpolation that accepts either kind of driver. */
export function track(progress:Progress,config:{inputRange:number[];outputRange:number[]}):Animated.AnimatedInterpolation<number>{
  return (progress as Animated.Value).interpolate({inputRange:config.inputRange,outputRange:config.outputRange,extrapolate:'clamp'});
}

/** True while the app is in the foreground. */
export function useAppActive():boolean{
  return (useSyncExternalStore(subscribe,snapshot,serverSnapshot)&1)===1;
}

/** Whether decorative motion should run right now. */
export function useMotionEnabled(reduceMotion=false,active=true):boolean{
  const state=useSyncExternalStore(subscribe,snapshot,serverSnapshot);
  return active&&!reduceMotion&&(state&1)===1&&(state&2)===0;
}

/** A 0..1 value that loops on the native driver while enabled and rests at 0 otherwise. */
export function useLoopProgress(durationMs:number,enabled:boolean):Animated.Value{
  const value=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    value.stopAnimation();value.setValue(0);
    if(!enabled||durationMs<=0)return;
    const loop=Animated.loop(Animated.timing(value,{toValue:1,duration:durationMs,easing:Easing.linear,useNativeDriver:LOOP_NATIVE_DRIVER}));
    loop.start();
    return()=>loop.stop();
  },[value,durationMs,enabled]);
  return value;
}

/**
 * Calls `onCompleted` when the running activity crosses a real action boundary, using one
 * timeout per action instead of polling. A boundary that fires late (for example right
 * after the app resumes) re-arms without replaying a stale reaction.
 */
export function useActionCompleted(clock:CycleClock,enabled:boolean,onCompleted:()=>void){
  const callback=useRef(onCompleted);callback.current=onCompleted;
  const {lastClaimAtMs,progressFraction,cycleSeconds}=clock;
  useEffect(()=>{
    if(!enabled)return;
    let timer:ReturnType<typeof setTimeout>|undefined,cancelled=false;
    const arm=()=>{
      const wait=msUntilNextCycle({lastClaimAtMs,progressFraction,cycleSeconds},Date.now());
      if(wait===undefined)return;
      const dueAtMs=Date.now()+wait;
      timer=setTimeout(()=>{
        if(cancelled)return;
        if(Date.now()-dueAtMs<1_500)callback.current();
        arm();
      },wait+40);
    };
    arm();
    return()=>{cancelled=true;if(timer)clearTimeout(timer);};
  },[enabled,lastClaimAtMs,progressFraction,cycleSeconds]);
}

// ---------------------------------------------------------------- shared low-rate ticker
type Tick=()=>void;
const tickers=new Map<number,{subscribers:Set<Tick>;timer?:ReturnType<typeof setInterval>}>();
function syncTicker(intervalMs:number){
  const ticker=tickers.get(intervalMs);
  if(!ticker)return;
  const shouldRun=ticker.subscribers.size>0&&appActive;
  if(shouldRun&&!ticker.timer)ticker.timer=setInterval(()=>{for(const tick of [...ticker.subscribers])tick();},intervalMs);
  else if(!shouldRun&&ticker.timer){clearInterval(ticker.timer);ticker.timer=undefined;}
  if(!ticker.subscribers.size)tickers.delete(intervalMs);
}
let stopWatchingAppState:(()=>void)|undefined;
/**
 * One interval per cadence for every subscriber. Components that animate text or colours
 * on the JS thread update in the same pass, and the interval stops in the background.
 */
export function subscribeSharedTicker(intervalMs:number,tick:Tick):()=>void{
  if(!stopWatchingAppState)stopWatchingAppState=subscribe(()=>{for(const interval of [...tickers.keys()])syncTicker(interval);});
  let ticker=tickers.get(intervalMs);
  if(!ticker){ticker={subscribers:new Set()};tickers.set(intervalMs,ticker);}
  ticker.subscribers.add(tick);
  syncTicker(intervalMs);
  return()=>{
    ticker.subscribers.delete(tick);syncTicker(intervalMs);
    if(!tickers.size&&stopWatchingAppState){stopWatchingAppState();stopWatchingAppState=undefined;}
  };
}
