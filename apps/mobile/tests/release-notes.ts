import {compareReleaseVersions,firstInstalledReleaseVersion,parseReleaseNoteRow,shouldAutoAnnounceReleaseNotes,shouldAutoShowReleaseNotes} from '../src/core/release-notes';

function assert(condition:unknown,message:string){if(!condition)throw new Error(message)}
assert(compareReleaseVersions('0.9.10','0.9.9')===1,'Version comparison must be numeric');
assert(compareReleaseVersions('1.0','1.0.0')===0,'Missing version components must default to zero');
assert(compareReleaseVersions('0.9.5','1.0.0')===-1,'Older versions must compare lower');
const note=parseReleaseNoteRow({version:'0.9.5',title:'Update',highlights:['Better crafting','Welcome back'],published_at:'2026-10-15T00:00:00Z'});
assert(note?.highlights.length===2,'Valid release notes should be retained');
assert(parseReleaseNoteRow({version:'broken',title:'Update',highlights:['Fix']})===null,'Invalid versions must be ignored');
assert(parseReleaseNoteRow({version:'0.9.5',title:'Update',highlights:[]})===null,'Empty notes must not cause an automatic popup');
assert(shouldAutoShowReleaseNotes(note?[note]:[],'0.9.5',false),'Installed release should be announced once');
assert(!shouldAutoShowReleaseNotes(note?[note]:[],'0.9.5',true),'Seen release must not reopen');
assert(!shouldAutoShowReleaseNotes(note?[note]:[],'0.9.4',false),'An update not yet installed is optional, never an auto announcement');


const freshInstall=firstInstalledReleaseVersion(null,false,'1.0.3');
const existingInstall=firstInstalledReleaseVersion(null,true,'1.0.3');
assert(freshInstall==='1.0.3','Fresh installs must record their current release as the baseline');
assert(existingInstall==='0.0.0','Legacy returning players must retain release eligibility');
assert(firstInstalledReleaseVersion('1.0.2',false,'1.0.3')==='1.0.2','Existing first-install version must be preserved');
const announcement=(firstInstalledVersion:string|null,startupReady:boolean,optionalUpdateAvailable=false)=>shouldAutoAnnounceReleaseNotes({
 firstInstalledVersion,installedVersion:'1.0.3',
 notes:[{version:'1.0.3',title:'Update',highlights:['Fixes'],publishedAt:''}],
 seen:false,optionalUpdateAvailable,optionalUpdateSeen:false,startupReady
});
assert(!announcement(freshInstall,true),'Brand-new players must not see automatic Whats New');
assert(announcement(existingInstall,true),'Returning players from older installations may see notes');
assert(announcement('1.0.2',true),'An upgraded player should see new release notes');
assert(!announcement('1.0.2',false),'Other startup popups and reward settlement must finish first');
assert(!shouldAutoAnnounceReleaseNotes({
 firstInstalledVersion:freshInstall,installedVersion:'1.0.3',notes:[],seen:true,
 optionalUpdateAvailable:true,optionalUpdateSeen:false,startupReady:true
}),'Optional-update prompts must not auto-show for fresh installations');
assert(!shouldAutoAnnounceReleaseNotes({
 firstInstalledVersion:'1.0.2',installedVersion:'1.0.3',notes:[],seen:true,
 optionalUpdateAvailable:true,optionalUpdateSeen:true,startupReady:true
}),'Dismissed optional updates must not auto-show again');
console.log('PASS: release note parsing, player eligibility and popup priority');
