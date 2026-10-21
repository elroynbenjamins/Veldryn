import {Linking,Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase,supabasePublicEndpoint} from './supabase';
import {APP_BUILD_INFO} from '../app-build';
import {appPolicyFromRow,evaluateAppPolicy,type AppVersionPolicy} from '../core/app-release-policy';
export {compareVersions,requiredAppVersion} from '../core/app-release-policy';
export type {AppVersionPolicy};
export type VersionGateResult=ReturnType<typeof evaluateAppPolicy>&{verificationFailed?:boolean};
const platform=Platform.OS==='android'?'android':'other';
const cacheKey=`veldryn.release-policy.v1:${supabasePublicEndpoint}:${platform}:${APP_BUILD_INFO.releaseChannel}`;
let cachedPolicy:AppVersionPolicy|null=null;
let policyRevision=0;
let pending:Promise<VersionGateResult>|undefined;

export async function rememberAppPolicy(row:Record<string,unknown>):Promise<VersionGateResult>{
  const policy=appPolicyFromRow(row);
  ++policyRevision;
  cachedPolicy=policy;
  try{await AsyncStorage.setItem(cacheKey,JSON.stringify(row));}catch{/* In-memory enforcement still applies if device storage is unavailable. */}
  return evaluateAppPolicy(APP_BUILD_INFO.version,policy);
}
async function check():Promise<VersionGateResult>{
  if(!cachedPolicy){try{const raw=await AsyncStorage.getItem(cacheKey);if(raw)cachedPolicy=appPolicyFromRow(JSON.parse(raw));}catch{/* Invalid/unreadable cache requires an online check. */}}
  const controller=new AbortController();
  const revision=policyRevision;
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    if(!supabase)throw new Error('online_unavailable');
    let result=await supabase.from('app_release_policy').select('*').eq('platform',platform).abortSignal(controller.signal).maybeSingle();
    if(result.error?.code==='42703')result=await supabase.from('app_release_policy').select('*').eq('channel',APP_BUILD_INFO.releaseChannel).abortSignal(controller.signal).maybeSingle();
    if(result.error||!result.data)throw new Error('release_policy_unavailable');
    // A server rejection arriving during this read is newer enforcement evidence.
    if(revision!==policyRevision)return evaluateAppPolicy(APP_BUILD_INFO.version,cachedPolicy);
    return await rememberAppPolicy(result.data);
  }catch{return {...evaluateAppPolicy(APP_BUILD_INFO.version,cachedPolicy),verificationFailed:true};}
  finally{clearTimeout(timeout);}
}
export function fetchAppVersionGate():Promise<VersionGateResult>{
  if(!pending)pending=check().finally(()=>{pending=undefined;});
  return pending;
}
export async function openStoreListing(){
  if(Platform.OS!=='android')return;
  const id='com.elroybenjamins.veldryn';
  try{await Linking.openURL(`market://details?id=${id}`);}catch{await Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`);}
}
