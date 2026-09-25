declare const process:{env:Record<string,string|undefined>};

export interface AppReleaseControl{
  latestVersion:string;
  minimumVersion:string;
  forceAfter?:string;
  storeUrl:string;
  updateTitle:string;
  updateMessage:string;
  maintenanceMode:boolean;
  maintenanceMessage:string;
}

export interface AppReleaseDecision{
  currentVersion:string;
  updateAvailable:boolean;
  mandatory:boolean;
  maintenance:boolean;
  control:AppReleaseControl|null;
}

export const currentAppVersion=process.env.EXPO_PUBLIC_APP_VERSION?.trim()||'0.1.0';
const releaseControlUrl=process.env.EXPO_PUBLIC_RELEASE_CONTROL_URL?.trim()||'';

function parts(version:string){
  return version.trim().replace(/^v/i,'').split('.').map(part=>{
    const value=Number.parseInt(part.replace(/\D.*$/,''),10);
    return Number.isFinite(value)?value:0;
  });
}

export function compareAppVersions(left:string,right:string){
  const a=parts(left),b=parts(right),length=Math.max(a.length,b.length);
  for(let i=0;i<length;i++){const av=a[i]??0,bv=b[i]??0;if(av!==bv)return av>bv?1:-1;}
  return 0;
}

function validControl(value:unknown):AppReleaseControl|null{
  if(!value||typeof value!=='object')return null;
  const row=value as Record<string,unknown>;
  const latestVersion=String(row.latestVersion??'').trim();
  const minimumVersion=String(row.minimumVersion??'').trim();
  const storeUrl=String(row.storeUrl??'').trim();
  if(!latestVersion||!minimumVersion||!storeUrl)return null;
  return {
    latestVersion,
    minimumVersion,
    forceAfter:row.forceAfter?String(row.forceAfter):undefined,
    storeUrl,
    updateTitle:String(row.updateTitle??'VELDRYN has been updated'),
    updateMessage:String(row.updateMessage??'This version is no longer supported. Update to continue your adventure.'),
    maintenanceMode:Boolean(row.maintenanceMode),
    maintenanceMessage:String(row.maintenanceMessage??'VELDRYN is temporarily unavailable while maintenance is completed.'),
  };
}

export async function fetchAppReleaseDecision(now=Date.now()):Promise<AppReleaseDecision>{
  if(!releaseControlUrl)return {currentVersion:currentAppVersion,updateAvailable:false,mandatory:false,maintenance:false,control:null};
  const response=await fetch(`${releaseControlUrl}${releaseControlUrl.includes('?')?'&':'?'}t=${now}`,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`Release control returned ${response.status}.`);
  const control=validControl(await response.json());
  if(!control)throw new Error('Release control is invalid.');
  const updateAvailable=compareAppVersions(currentAppVersion,control.latestVersion)<0;
  const belowMinimum=compareAppVersions(currentAppVersion,control.minimumVersion)<0;
  const forceAt=control.forceAfter?Date.parse(control.forceAfter):Number.NaN;
  const forceLatest=updateAvailable&&Number.isFinite(forceAt)&&now>=forceAt;
  return {currentVersion:currentAppVersion,updateAvailable,mandatory:belowMinimum||forceLatest,maintenance:control.maintenanceMode,control};
}
