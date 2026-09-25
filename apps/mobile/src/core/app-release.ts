export interface AppReleasePolicy{
  channel:string;
  latestVersion:string;
  minimumVersion:string;
  latestBuild?:number;
  minimumBuild?:number;
  forceAfterMs?:number;
  updateTitle:string;
  updateMessage:string;
  androidStoreUrl?:string;
  iosStoreUrl?:string;
  maintenanceMode:boolean;
  maintenanceTitle:string;
  maintenanceMessage:string;
}

export type AppReleaseStatus='ok'|'optional'|'required'|'maintenance';

export interface AppReleaseDecision{
  status:AppReleaseStatus;
  installedVersion:string;
  latestVersion:string;
  minimumVersion:string;
  installedBuild?:number;
  latestBuild?:number;
  minimumBuild?:number;
  reason?:'below_minimum'|'below_minimum_build'|'force_after';
}

function versionParts(version:string){
  const clean=version.trim().replace(/^v/i,'').split('-')[0]??'0';
  return clean.split('.').map(part=>{
    const value=Number.parseInt(part.replace(/\D.*$/,''),10);
    return Number.isFinite(value)?value:0;
  });
}

export function compareAppVersions(left:string,right:string){
  const a=versionParts(left),b=versionParts(right),length=Math.max(a.length,b.length);
  for(let index=0;index<length;index+=1){
    const delta=(a[index]??0)-(b[index]??0);
    if(delta!==0)return delta<0?-1:1;
  }
  return 0;
}

export function evaluateAppRelease(policy:AppReleasePolicy|undefined,installedVersion:string,nowMs=Date.now(),installedBuild?:number):AppReleaseDecision{
  if(!policy)return {status:'ok',installedVersion,latestVersion:installedVersion,minimumVersion:installedVersion,...(installedBuild!==undefined?{installedBuild}:{})};
  const base={installedVersion,latestVersion:policy.latestVersion,minimumVersion:policy.minimumVersion,...(installedBuild!==undefined?{installedBuild}:{}),...(policy.latestBuild!==undefined?{latestBuild:policy.latestBuild}:{}),...(policy.minimumBuild!==undefined?{minimumBuild:policy.minimumBuild}:{})};
  if(policy.maintenanceMode)return {status:'maintenance',...base};
  if(policy.minimumBuild!==undefined&&installedBuild!==undefined&&installedBuild<policy.minimumBuild)return {status:'required',...base,reason:'below_minimum_build'};
  if(compareAppVersions(installedVersion,policy.minimumVersion)<0)return {status:'required',...base,reason:'below_minimum'};
  const behindLatestBuild=policy.latestBuild!==undefined&&installedBuild!==undefined&&installedBuild<policy.latestBuild;
  const behindLatestVersion=compareAppVersions(installedVersion,policy.latestVersion)<0;
  if(policy.forceAfterMs!==undefined&&nowMs>=policy.forceAfterMs&&(behindLatestBuild||behindLatestVersion))return {status:'required',...base,reason:'force_after'};
  if(behindLatestBuild||behindLatestVersion)return {status:'optional',...base};
  return {status:'ok',...base};
}
