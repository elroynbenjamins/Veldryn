/** Pure release-note helpers shared by the startup panel and tests. */
export const releaseNoteCategories=['Loot & Drop Rates','Economy & Gold','Combat & Skills','Crafting & Gathering','Equipment & Companions','Content & Events','UI & Quality of Life','Server & Performance','Bug Fixes'] as const;
export type ReleaseNoteCategory=typeof releaseNoteCategories[number];
export type ReleaseNoteMode='highlights'|'details';
export type ReleaseNoteSection={category:ReleaseNoteCategory;entries:string[]};
export type ReleaseNote={
 version:string;
 title:string;
 highlights:string[];
 publishedAt:string;
 details?:ReleaseNoteSection[];
};

/** Render a release's published date in UTC, without shifting days for device time zones. */
export function formatReleaseNoteDate(publishedAt:string):string|null{
 const match=/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(publishedAt.trim());
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 return `${day} ${monthNames[month-1]} ${year}`;
}

export function compareReleaseVersions(left:string,right:string):number{
 const parts=(value:string)=>value.trim().split('.').map(part=>Number.parseInt(part.replace(/\D.*$/,''),10)||0);
 const a=parts(left),b=parts(right);
 for(let index=0;index<Math.max(a.length,b.length);index++){
  if((a[index]??0)!==(b[index]??0))return (a[index]??0)>(b[index]??0)?1:-1;
 }
 return 0;
}

/** Older clients ignore non-string array entries; exactly one tagged details envelope is allowed. */
export function parseReleaseNoteDetails(value:unknown):ReleaseNoteSection[]{
 if(!Array.isArray(value))return [];
 const envelopes=value.filter(entry=>entry&&typeof entry==='object'&&!Array.isArray(entry)&&entry.kind==='detailed-patch-notes-v1');
 if(envelopes.length!==1||!Array.isArray(envelopes[0].sections))return [];
 const sections:ReleaseNoteSection[]=[];
 for(const category of releaseNoteCategories){
  const entries=envelopes[0].sections.filter((section:unknown)=>section&&typeof section==='object'&&!Array.isArray(section)&&(section as Record<string,unknown>).category===category).flatMap((section:{entries?:unknown})=>Array.isArray(section.entries)?section.entries:[]).filter((entry:unknown):entry is string=>typeof entry==='string').map((entry:string)=>entry.trim().slice(0,500)).filter(Boolean);
  if(entries.length)sections.push({category,entries:[...new Set<string>(entries)].slice(0,100)});
 }
 return sections;
}

export function parseReleaseNoteRow(value:Record<string,unknown>):ReleaseNote|null{
 const version=typeof value.version==='string'?value.version.trim():'';
 if(!/^\d+\.\d+\.\d+$/.test(version))return null;
 const title=typeof value.title==='string'?value.title.trim().slice(0,100):'';
 const highlights=Array.isArray(value.highlights)?value.highlights.filter((entry):entry is string=>typeof entry==='string').map(entry=>entry.trim().slice(0,200)).filter(Boolean).slice(0,8):[];
 if(!title||!highlights.length)return null;
 const publishedAt=typeof value.published_at==='string'?value.published_at:'';
 return {version,title,highlights,publishedAt,details:parseReleaseNoteDetails(value.highlights)};
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
