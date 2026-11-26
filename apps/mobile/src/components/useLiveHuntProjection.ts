import {useMemo,useSyncExternalStore} from 'react';
import {activeCombatHitProjection} from '../core/game';
import type {GameState} from '../core/types';
import {runWhileForeground} from '../online/foreground-tasks';

type Snapshot={clock:number;fight:ReturnType<typeof activeCombatHitProjection>};
type Listener=()=>void;
const inactive:Snapshot={clock:0,fight:undefined};
const inactiveStore={getSnapshot:()=>inactive,subscribe:(_listener:Listener)=>()=>{}};

// Both mounted hunt surfaces receive the same immutable snapshot and cursor.
// An authoritative GameState replacement naturally starts a new projection.
// Weak keys avoid retaining prior characters or state snapshots indefinitely.
const stores=new WeakMap<GameState,ReturnType<typeof createStore>>();
function createStore(state:GameState){
 const clock=Date.now();
 let snapshot:Snapshot={clock,fight:activeCombatHitProjection(state,clock)};
 const listeners=new Set<Listener>();
 let stopForegroundTicks:(()=>void)|undefined;
 const tick=()=>{
  const clock=Math.max(snapshot.clock,Date.now());
  if(clock===snapshot.clock)return;
  snapshot={clock,fight:activeCombatHitProjection(state,clock,snapshot.fight?.cursor)};
  listeners.forEach(listener=>listener());
 };
 return {
  getSnapshot:()=>snapshot,
  subscribe:(listener:Listener)=>{
   listeners.add(listener);
   // Keep one shared replay clock for visible subscribers, and suspend it
   // whenever the app leaves the foreground. Resume catches up on the cursor.
   if(!stopForegroundTicks)stopForegroundTicks=runWhileForeground(tick,750);
   return ()=>{
    listeners.delete(listener);
    if(!listeners.size&&stopForegroundTicks){stopForegroundTicks();stopForegroundTicks=undefined;}
   };
  },
 };
}
function storeFor(state:GameState){
 const existing=stores.get(state);
 if(existing)return existing;
 const store=createStore(state);stores.set(state,store);return store;
}
export function useLiveHuntProjection(state:GameState,active:boolean){
 const store=useMemo(()=>active?storeFor(state):inactiveStore,[state,active]);
 return useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
}
