export type AppVersionPolicy={latestVersion:string;minimumVersion:string;forceAfterMs?:number;title:string;message:string;maintenanceMode:boolean;maintenanceMessage:string};
export function compareVersions(a:string,b:string){
  const parts=(s:string)=>s.trim().split('.').map(part=>Number.parseInt(part.replace(/\D.*$/,''),10)||0);
  const left=parts(a),right=parts(b);
  for(let i=0;i<Math.max(left.length,right.length);i++){const difference=(left[i]??0)-(right[i]??0);if(difference)return difference>0?1:-1;}
  return 0;
}
export function requiredAppVersion(policy:AppVersionPolicy,now=Date.now()){
  return policy.forceAfterMs!==undefined&&now>=policy.forceAfterMs&&compareVersions(policy.latestVersion,policy.minimumVersion)>0?policy.latestVersion:policy.minimumVersion;
}
export function evaluateAppPolicy(currentVersion:string,policy:AppVersionPolicy|null,now=Date.now()){
  return {currentVersion,policy,updateRequired:!!policy&&compareVersions(currentVersion,requiredAppVersion(policy,now))<0,updateAvailable:!!policy&&compareVersions(currentVersion,policy.latestVersion)<0,maintenanceMode:policy?.maintenanceMode??false};
}
export function appPolicyFromRow(data:Record<string,unknown>):AppVersionPolicy{
  if(![data.latest_version,data.minimum_version].every(value=>typeof value==='string'&&/^\d+\.\d+\.\d+$/.test(value)))throw new Error('invalid_release_policy');
  const forceAfterMs=data.force_after?Date.parse(String(data.force_after)):undefined;
  if(forceAfterMs!==undefined&&!Number.isFinite(forceAfterMs))throw new Error('invalid_release_policy');
  return {latestVersion:String(data.latest_version),minimumVersion:String(data.minimum_version),forceAfterMs,title:String(data.title??data.update_title??'VELDRYN has been updated'),message:String(data.message??data.update_message??'This version is no longer supported. Update to continue your adventure.'),maintenanceMode:data.maintenance_mode===true,maintenanceMessage:String(data.maintenance_message??'VELDRYN is temporarily unavailable while maintenance is completed.')};
}
