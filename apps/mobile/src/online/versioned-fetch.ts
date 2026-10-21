import {Platform} from 'react-native';
import {APP_BUILD_INFO} from '../app-build';
type ReleaseBlock={error:'app_update_required'|'app_maintenance';policy:Record<string,unknown>};
const listeners=new Set<(block:ReleaseBlock)=>void>();
export function onReleaseBlocked(listener:(block:ReleaseBlock)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** Also used by direct Edge requests, which bypass supabase-js. */
export const versionedFetch:typeof fetch=async(input,init)=>{
  const headers=new Headers(input instanceof Request?input.headers:undefined);
  new Headers(init?.headers).forEach((value,key)=>headers.set(key,value));
  headers.set('x-app-version',APP_BUILD_INFO.version);
  headers.set('x-app-platform',Platform.OS==='android'?'android':'other');
  const response=await fetch(input,{...init,headers});
  if(response.status===426||response.status===503){
    try{const block=await response.clone().json();if((block.error==='app_update_required'||block.error==='app_maintenance')&&block.policy)for(const listener of listeners)listener(block);}catch{/* Ordinary service errors remain owned by the caller. */}
  }
  return response;
};
