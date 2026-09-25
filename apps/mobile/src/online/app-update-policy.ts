import {supabase} from './supabase';

export const CURRENT_APP_VERSION='0.1.0';

export type AppUpdatePolicy={
  currentVersion:string;
  latestVersion:string;
  minimumVersion:string;
  required:boolean;
  updateAvailable:boolean;
  title:string;
  message:string;
  androidStoreUrl:string;
};

const DEFAULT_STORE_URL='https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn';

function parts(version:string){
  return version.trim().replace(/^v/i,'').split('.').slice(0,3).map(part=>{
    const value=Number.parseInt(part.replace(/\D.*$/,''),10);
    return Number.isFinite(value)?value:0;
  }).concat([0,0,0]).slice(0,3);
}

export function compareAppVersions(left:string,right:string){
  const a=parts(left),b=parts(right);
  for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]?1:-1;}
  return 0;
}

export async function fetchAppUpdatePolicy():Promise<AppUpdatePolicy>{
  let config:Record<string,unknown>={};
  if(supabase){
    try{
      const {data,error}=await supabase.rpc('get_mobile_update_config');
      if(error)throw error;
      if(data&&typeof data==='object'&&!Array.isArray(data))config=data as Record<string,unknown>;
    }catch{
      // Fail open: a transient config outage must never lock players out.
    }
  }
  const read=(key:string,fallback:string)=>typeof config[key]==='string'&&String(config[key]).trim()?String(config[key]):fallback;
  const latestVersion=read('app.mobile.latest_version',CURRENT_APP_VERSION);
  const minimumVersion=read('app.mobile.minimum_version',CURRENT_APP_VERSION);
  return {
    currentVersion:CURRENT_APP_VERSION,
    latestVersion,
    minimumVersion,
    required:compareAppVersions(CURRENT_APP_VERSION,minimumVersion)<0,
    updateAvailable:compareAppVersions(CURRENT_APP_VERSION,latestVersion)<0,
    title:read('app.mobile.update_title','VELDRYN has been updated'),
    message:read('app.mobile.update_message','This version is no longer supported. Update VELDRYN to continue your adventure.'),
    androidStoreUrl:read('app.mobile.android_store_url',DEFAULT_STORE_URL),
  };
}
