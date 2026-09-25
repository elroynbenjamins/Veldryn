import {Linking,Platform} from 'react-native';
import {supabase} from './supabase';

declare const process:{env:Record<string,string|undefined>};

export type AppVersionPolicy={
  latestVersion:string;
  minimumVersion:string;
  forceAfterMs?:number;
  title:string;
  message:string;
  maintenanceMode:boolean;
  maintenanceMessage:string;
};

export type VersionGateResult={
  currentVersion:string;
  policy:AppVersionPolicy|null;
  updateRequired:boolean;
  updateAvailable:boolean;
  maintenanceMode:boolean;
};

const CURRENT_APP_VERSION=process.env.EXPO_PUBLIC_APP_VERSION?.trim()||'0.1.0';
const DEFAULT_TITLE='VELDRYN has been updated';
const DEFAULT_MESSAGE='This version is no longer supported. Update to continue your adventure.';
const ANDROID_PACKAGE='com.elroybenjamins.veldryn';

function parts(value:string){
  return value.trim().split('.').map(part=>Number.parseInt(part.replace(/\D.*$/,''),10)||0);
}
export function compareVersions(a:string,b:string){
  const left=parts(a),right=parts(b),length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++){const av=left[i]??0,bv=right[i]??0;if(av!==bv)return av>bv?1:-1;}
  return 0;
}

export async function fetchAppVersionGate():Promise<VersionGateResult>{
  if(!supabase)return {currentVersion:CURRENT_APP_VERSION,policy:null,updateRequired:false,updateAvailable:false,maintenanceMode:false};
  const {data,error}=await supabase.from('app_release_policy').select('latest_version,minimum_version,force_after,title,message,maintenance_mode,maintenance_message').eq('platform',Platform.OS==='android'?'android':'other').maybeSingle();
  if(error||!data)return {currentVersion:CURRENT_APP_VERSION,policy:null,updateRequired:false,updateAvailable:false,maintenanceMode:false};
  const policy:AppVersionPolicy={
    latestVersion:String(data.latest_version??CURRENT_APP_VERSION),
    minimumVersion:String(data.minimum_version??CURRENT_APP_VERSION),
    forceAfterMs:data.force_after?Date.parse(String(data.force_after)):undefined,
    title:String(data.title??DEFAULT_TITLE),
    message:String(data.message??DEFAULT_MESSAGE),
    maintenanceMode:Boolean(data.maintenance_mode),
    maintenanceMessage:String(data.maintenance_message??'VELDRYN is temporarily unavailable while maintenance is completed.'),
  };
  const belowMinimum=compareVersions(CURRENT_APP_VERSION,policy.minimumVersion)<0;
  const forcedByDate=compareVersions(CURRENT_APP_VERSION,policy.latestVersion)<0&&!!policy.forceAfterMs&&Date.now()>=policy.forceAfterMs;
  return {
    currentVersion:CURRENT_APP_VERSION,
    policy,
    updateRequired:belowMinimum||forcedByDate,
    updateAvailable:compareVersions(CURRENT_APP_VERSION,policy.latestVersion)<0,
    maintenanceMode:policy.maintenanceMode,
  };
}

export async function openStoreListing(){
  if(Platform.OS!=='android')return;
  const market=`market://details?id=${ANDROID_PACKAGE}`;
  const web=`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  try{await Linking.openURL(market);}catch{await Linking.openURL(web);}
}
