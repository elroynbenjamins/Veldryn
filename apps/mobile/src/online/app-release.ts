import Constants from 'expo-constants';
import type {AppReleasePolicy} from '../core/app-release';
import {supabase} from './supabase';

declare const process:{env:Record<string,string|undefined>};

type ReleaseRow={
  channel:string;
  latest_version:string;
  minimum_version:string;
  latest_build:number|null;
  minimum_build:number|null;
  force_after:string|null;
  update_title:string;
  update_message:string;
  android_store_url:string|null;
  ios_store_url:string|null;
  maintenance_mode:boolean;
  maintenance_title:string;
  maintenance_message:string;
};

export const appReleaseChannel=process.env.EXPO_PUBLIC_RELEASE_CHANNEL?.trim()||'production';
export const currentAppVersion=()=>Constants.expoConfig?.version?.trim()||'0.0.0';
export const currentAppBuild=()=>{const raw=Constants.platform?.android?.versionCode??Constants.platform?.ios?.buildNumber;const parsed=raw===null||raw===undefined?undefined:Number(raw);return parsed!==undefined&&Number.isFinite(parsed)?parsed:undefined;};

export async function fetchAppReleasePolicy(channel=appReleaseChannel):Promise<AppReleasePolicy|undefined>{
  if(!supabase)return undefined;
  const {data,error}=await supabase.from('app_release_policy').select('channel,latest_version,minimum_version,latest_build,minimum_build,force_after,update_title,update_message,android_store_url,ios_store_url,maintenance_mode,maintenance_title,maintenance_message').eq('channel',channel).maybeSingle();
  if(error)throw error;
  const row=data as ReleaseRow|null;
  if(!row)return undefined;
  return {
    channel:row.channel,
    latestVersion:row.latest_version,
    minimumVersion:row.minimum_version,
    ...(row.latest_build!==null?{latestBuild:Number(row.latest_build)}:{}),
    ...(row.minimum_build!==null?{minimumBuild:Number(row.minimum_build)}:{}),
    ...(row.force_after?{forceAfterMs:Date.parse(row.force_after)}:{}),
    updateTitle:row.update_title,
    updateMessage:row.update_message,
    ...(row.android_store_url?{androidStoreUrl:row.android_store_url}:{}),
    ...(row.ios_store_url?{iosStoreUrl:row.ios_store_url}:{}),
    maintenanceMode:row.maintenance_mode,
    maintenanceTitle:row.maintenance_title,
    maintenanceMessage:row.maintenance_message,
  };
}
