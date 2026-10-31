const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

const source=fs.readFileSync(path.join(__dirname,'../src/online/useCoopRunSync.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
let nextTimer=0,removed=0;
const timers=new Map(),notifications=[],statuses=[],pending=[];
const schedule=(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;};
const fakeClient={
 channel:()=>({
  on(_event,_filter,handler){notifications.push(handler);return this;},
  subscribe(handler){statuses.push(handler);return this;},
 }),
 removeChannel:async()=>{removed++;},
};
const context={
 exports:{},console,Promise,Error,
 setTimeout:schedule,clearTimeout:id=>timers.delete(id),
 require:name=>name==='react'?React:name==='./supabase'?{supabase:fakeClient}:
  name==='../core/coop-sync-policy'?{
    coopSyncIntervalMs:(mode,urgency,connected)=>urgency==='decision'?(connected?3500:2000):urgency==='combat'?(connected?6000:2500):connected?(mode==='live'?12000:20000):mode==='live'?4000:6000,
  }:(()=>{throw Error('Unexpected dependency: '+name)})(),
};
vm.runInNewContext(js,context,{filename:'useCoopRunSync.js'});
const {useCoopRunSync}=context.exports;
const errors=[],refresh=id=>new Promise(resolve=>pending.push({id,resolve}));
const setError=message=>errors.push(message);
function Harness(props){useCoopRunSync(props);return null;}
const props={runId:'test-run',mode:'live',urgency:'idle',enabled:true,refresh,setError};
const delays=()=>[...timers.values()].map(timer=>timer.delay);
async function run(){
 let renderer;
 await act(async()=>{renderer=create(React.createElement(Harness,props));});
 assert.equal(pending.length,1,'initial run fetch starts immediately');
 await act(async()=>{statuses[0]('SUBSCRIBED');});
 assert.deepEqual(delays(),[],'subscriptions must not start another request during an in-flight fetch');
 await act(async()=>{pending[0].resolve();await Promise.resolve();});
 assert.deepEqual(delays(),[12000],'idle live run uses slow watchdog while subscribed');
 await act(async()=>{notifications[0]();});
 assert.equal(pending.length,2,'realtime change requests latest run immediately');
 assert.deepEqual(delays(),[],'realtime change cancels stale watchdog');
 await act(async()=>{notifications[0]();notifications[0]();});
 assert.equal(pending.length,2,'multiple changes coalesce during a request');
 await act(async()=>{pending[1].resolve();await Promise.resolve();});
 assert.deepEqual(delays(),[0],'a change during the request schedules exactly one follow-up');
 const [timerId,timer]=timers.entries().next().value;
 timers.delete(timerId);
 await act(async()=>{timer.callback();});
 assert.equal(pending.length,3,'queued realtime change was not lost');
 await act(async()=>{pending[2].resolve();await Promise.resolve();});
 assert.deepEqual(delays(),[12000],'watchdog restores after queued refresh');
 await act(async()=>{renderer.update(React.createElement(Harness,{...props,enabled:false}));});
 assert.equal(removed,1,'inactive or hidden run drops its realtime subscription');
 assert.deepEqual(delays(),[],'inactive run cannot keep polling');
 await act(async()=>{notifications[0]();});
 assert.equal(pending.length,3,'stale channel notifications are ignored after cleanup');
 await act(async()=>{renderer.unmount();});
 assert.deepEqual(errors,['','',''],'successful updates clear the sync error');
 console.log('PASS dungeon single-flight, realtime coalescing, watchdog and background cleanup');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
