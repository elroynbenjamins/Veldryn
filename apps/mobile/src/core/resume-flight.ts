/** Collapse foreground/startup notifications until the current settlement finishes. */
export function singleFlight<T>(work:()=>Promise<T>):()=>Promise<T>{
 let flight:Promise<T>|undefined;
 return ()=>{
  if(!flight)flight=Promise.resolve().then(work).finally(()=>{flight=undefined});
  return flight;
 };
}
