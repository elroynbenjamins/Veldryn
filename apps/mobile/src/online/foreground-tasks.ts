import {AppState} from 'react-native';

// Run once when the app is visible, then optionally repeat until it leaves the foreground.
// An asynchronous result can use isCurrent() to discard work from an earlier visit.
export function runWhileForeground(task:(isCurrent:()=>boolean)=>void,intervalMs?:number){
  let generation=0,visible=false;
  let timer:ReturnType<typeof setInterval>|undefined;
  function stop(){
    visible=false;
    generation++;
    if(timer!==undefined){clearInterval(timer);timer=undefined;}
  }
  function start(){
    if(visible)return;
    visible=true;
    const visit=generation;
    const run=()=>task(()=>visible&&generation===visit);
    if(intervalMs!==undefined)timer=setInterval(run,intervalMs);
    run();
  }
  const listener=AppState.addEventListener('change',status=>{
    if(status==='active')start();else stop();
  });
  if(AppState.currentState==='active'||AppState.currentState==null)start();
  return ()=>{stop();listener.remove();};
}
