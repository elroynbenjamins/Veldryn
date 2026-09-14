import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const backend=path.join(root,'backend');
export const project=fs.readFileSync(path.join(backend,'supabase/.temp/project-ref'),'utf8').trim();
export const url=`https://${project}.supabase.co`;
/** Keys stay in process memory. Callers must never log the returned object. */
export function projectKeys(){
 const raw=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','projects','api-keys','--project-ref',project,'--output','json'],{cwd:backend,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
 const parsed=JSON.parse(raw),rows=Array.isArray(parsed)?parsed:parsed.apiKeys??parsed.api_keys??parsed.keys;
 if(!Array.isArray(rows))throw new Error(`Unrecognized key listing fields: ${Object.keys(parsed).join(', ')}`);
 const anon=rows.find(row=>row.name==='anon'||row.type==='publishable'),service=rows.find(row=>row.name==='service_role');
 if(!anon?.api_key||!service?.api_key)throw new Error('Project keys unavailable');
 return {anon:anon.api_key,service:service.api_key};
}
export async function api(pathname,key,{token=key,method='GET',body}={}){
 const response=await fetch(url+pathname,{method,headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={message:text}};
 return {ok:response.ok,status:response.status,data};
}
