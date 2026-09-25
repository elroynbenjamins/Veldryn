export interface AppReleasePolicy{
  channel:string;
  latestVersion:string;
  minimumVersion:string;
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
  reason?:'below_minimum'|'force_after';
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

export function evaluateAppRelease(policy:AppReleasePolicy|undefined,installedVersion:string,nowMs=Date.now()):AppReleaseDecision{
  if(!policy)return {status:'ok',installedVersion,latestVersion:installedVersion,minimumVersion:installedVersion};
  const base={installedVersion,latestVersion:policy.latestVersion,minimumVersion:policy.minimumVersion};
  if(policy.maintenanceMode)return {status:'maintenance',...base};
  if(compareAppVersions(installedVersion,policy.minimumVersion)<0)return {status:'required',...base,reason:'below_minimum'};
  if(policy.forceAfterMs!==undefined&&nowMs>=policy.forceAfterMs&&compareAppVersions(installedVersion,policy.latestVersion)<0)return {status:'required',...base,reason:'force_after'};
  if(compareAppVersions(installedVersion,policy.latestVersion)<0)return {status:'optional',...base};
  return {status:'ok',...base};
}
