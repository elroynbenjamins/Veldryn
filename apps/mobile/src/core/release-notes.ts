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
