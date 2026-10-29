/** Pure release-note helpers shared by the startup panel and tests. */
export type ReleaseNote={
 version:string;
 title:string;
 highlights:string[];
 publishedAt:string;
};

export function compareReleaseVersions(left:string,right:string):number{
 const parts=(value:string)=>value.trim().split('.').map(part=>Number.parseInt(part.replace(/\D.*$/,''),10)||0);
 const a=parts(left),b=parts(right);
 for(let index=0;index<Math.max(a.length,b.length);index++){
  if((a[index]??0)!==(b[index]??0))return (a[index]??0)>(b[index]??0)?1:-1;
 }
 return 0;
}

export function parseReleaseNoteRow(value:Record<string,unknown>):ReleaseNote|null{
 const version=typeof value.version==='string'?value.version.trim():'';
 if(!/^\d+\.\d+\.\d+$/.test(version))return null;
 const title=typeof value.title==='string'?value.title.trim().slice(0,100):'';
 const highlights=Array.isArray(value.highlights)?value.highlights.filter((entry):entry is string=>typeof entry==='string').map(entry=>entry.trim().slice(0,200)).filter(Boolean).slice(0,8):[];
 if(!title||!highlights.length)return null;
 const publishedAt=typeof value.published_at==='string'?value.published_at:'';
 return {version,title,highlights,publishedAt};
}

export function shouldAutoShowReleaseNotes(notes:readonly ReleaseNote[],installedVersion:string,seen:boolean):boolean{
 return !seen&&notes.some(note=>compareReleaseVersions(note.version,installedVersion)===0);
}

/** Keep a first-install baseline. Pre-existing saves without one are migrated as returning players. */
export function firstInstalledReleaseVersion(stored:string|null,hadCharacterAtLaunch:boolean,currentVersion:string):string{
 if(stored&&/^\d+\.\d+\.\d+$/.test(stored))return stored;
 return hadCharacterAtLaunch?'0.0.0':currentVersion;
}

/** Automatic announcements require an existing installation and an idle startup flow. */
export function shouldAutoAnnounceReleaseNotes({
 firstInstalledVersion,installedVersion,notes,seen,optionalUpdateAvailable,optionalUpdateSeen,startupReady
}:{
 firstInstalledVersion:string|null;
 installedVersion:string;
 notes:readonly ReleaseNote[];
 seen:boolean;
 optionalUpdateAvailable:boolean;
 optionalUpdateSeen:boolean;
 startupReady:boolean;
}):boolean{
 return !!firstInstalledVersion&&compareReleaseVersions(installedVersion,firstInstalledVersion)>0
  &&startupReady&&(shouldAutoShowReleaseNotes(notes,installedVersion,seen)||(optionalUpdateAvailable&&!optionalUpdateSeen));
}
