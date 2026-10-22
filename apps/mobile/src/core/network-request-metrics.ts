/**
 * In-memory network diagnostics for Admin QA. Stores aggregate counts only:
 * never URLs, query parameters, identities, payloads, or auth tokens.
 * Websocket frames, native purchases and non-Supabase traffic aren't counted.
 */
export interface NetworkRequestSummary{route:string;operation:string;count:number;failures:number;totalMs:number;maxMs:number;}
const buckets=new Map<string,NetworkRequestSummary>();
let activeRoute='Startup';
let enabled=false;
const LIMIT=160;
const SAFE_ROUTES=new Set(['Startup','Home','Character','Skills','World','Inventory','More','Guild','Friends','Social','Party','Combat','Coop','Events','Profile','ProfileCustomize','Settings','Collections','Other']);
export function enableNetworkRequestMetrics(value:boolean){enabled=value;}
export function networkRequestMetricsEnabled(){return enabled;}
export function setNetworkMetricsRoute(route:string){activeRoute=SAFE_ROUTES.has(route)?route:'Other';}
export function networkRequestCategory(url:string):string{
 // Parse only the endpoint name; never retain the incoming URL or parameters.
 const rpcSegment=url.includes('/rest/v1/rpc/')?'/rest/v1/rpc/':url.includes('/functions/v1/')?'/functions/v1/':'';
 if(rpcSegment){
  const after=url.slice(url.indexOf(rpcSegment)+rpcSegment.length);
  const name=after.split(/[/?#]/)[0];
  if(/^[a-zA-Z0-9_-]+$/.test(name))return (rpcSegment.includes('functions')?'function:':'rpc:')+name;
 }
 if(url.includes('/auth/v1/'))return 'auth';
 if(url.includes('/rest/v1/'))return 'rest:table';
 if(url.includes('/storage/v1/'))return 'storage';
 return 'other';
}
export function recordNetworkRequest(operation:string,elapsedMs:number,successful:boolean,route=activeRoute){
 if(!enabled)return;
 const safeRoute=SAFE_ROUTES.has(route)?route:'Other';
 const safeOperation=/^(rpc:|function:)[a-zA-Z0-9_-]+$/.test(operation)||['auth','rest:table','storage','other'].includes(operation)?operation:'other';
 const key=safeRoute+'|'+safeOperation;
 let row=buckets.get(key);
 if(!row){
  if(buckets.size>=LIMIT)buckets.delete(buckets.keys().next().value!);
  row={route:safeRoute,operation:safeOperation,count:0,failures:0,totalMs:0,maxMs:0};
  buckets.set(key,row);
 }
 const elapsed=Math.max(0,Math.min(600_000,Math.round(Number(elapsedMs)||0)));
 row.count++;row.totalMs+=elapsed;row.maxMs=Math.max(row.maxMs,elapsed);
 if(!successful)row.failures++;
}
export function networkRequestSnapshot(){
 const rows=[...buckets.values()].map(row=>({...row}));
 const count=rows.reduce((sum,row)=>sum+row.count,0),failures=rows.reduce((sum,row)=>sum+row.failures,0);
 return {count,failures,rows:rows.sort((a,b)=>b.count-a.count||a.route.localeCompare(b.route))};
}
export function resetNetworkRequestMetrics(){buckets.clear();}
