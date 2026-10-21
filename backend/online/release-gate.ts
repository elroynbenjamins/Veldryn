import {appPolicyFromRow,compareVersions,requiredAppVersion} from '../../apps/mobile/src/core/app-release-policy';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-app-version,x-app-platform','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'};
const json=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
/** Legacy binaries have no version header. Their compatibility baseline is 0.1.0;
 * raising the minimum above that baseline rejects them, including missing headers.
 * Version headers are compatibility metadata, not proof of binary integrity.
 */
export function withReleaseGate(handler:(request:Request)=>Promise<Response>,loadPolicies:()=>Promise<Record<string,unknown>[]>,now=Date.now){
  return async(request:Request):Promise<Response>=>{
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(!request.headers.get('authorization')?.match(/^Bearer (\S+)$/i))return json({error:'auth_required'},401);
    try{
      const platform=request.headers.get('x-app-platform');
      const rows=(await loadPolicies()).filter(row=>!platform||!['android','other'].includes(platform)||row.platform===platform);
      if(!rows.length)throw new Error('release_policy_unavailable');
      const version=request.headers.get('x-app-version')??'0.1.0';
      for(const row of rows){
        const policy=appPolicyFromRow(row);
        if(policy.maintenanceMode)return json({error:'app_maintenance',policy:row},503);
        if(!/^\d+\.\d+\.\d+$/.test(version)||compareVersions(version,requiredAppVersion(policy,now()))<0)return json({error:'app_update_required',policy:row},426);
      }
    }catch{return json({error:'release_policy_unavailable'},503);}
    const response=await handler(request);
    const headers=new Headers(response.headers);Object.entries(cors).forEach(([key,value])=>headers.set(key,value));
    return new Response(response.body,{status:response.status,headers});
  };
}
export function releasePolicyLoader(url:string,publicKey:string){
  return async()=>{
    // No stale allow-cache: a new minimum takes effect on the next request.
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{
      // The control table deliberately grants SELECT to anon/authenticated,
      // but not service_role. Use its public read policy, never broader grants.
      const response=await fetch(`${url}/rest/v1/app_release_policy?select=*`,{headers:{apikey:publicKey},signal:controller.signal});
      if(!response.ok)throw new Error('release_policy_unavailable');
      const rows=await response.json();if(!Array.isArray(rows))throw new Error('release_policy_unavailable');return rows as Record<string,unknown>[];
    }finally{clearTimeout(timer);}
  };
}
