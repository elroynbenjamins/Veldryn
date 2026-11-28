import {compareReleaseVersions,firstInstalledReleaseVersion,formatReleaseNoteDate,parseReleaseNoteRow,shouldAutoAnnounceReleaseNotes,shouldAutoShowReleaseNotes} from '../src/core/release-notes';

function assert(condition:unknown,message:string){if(!condition)throw new Error(message)}
assert(compareReleaseVersions('0.9.10','0.9.9')===1,'Version comparison must be numeric');
assert(compareReleaseVersions('1.0','1.0.0')===0,'Missing version components must default to zero');
assert(compareReleaseVersions('0.9.5','1.0.0')===-1,'Older versions must compare lower');
const note=parseReleaseNoteRow({version:'0.9.5',title:'Update',highlights:['Better crafting','Welcome back'],published_at:'2026-10-15T00:00:00Z'});
assert(note?.highlights.length===2,'Valid release notes should be retained');
assert(formatReleaseNoteDate(note?.publishedAt??'')==='15 Oct 2026','Release timestamps should show a compact publication date');
assert(formatReleaseNoteDate('2026-11-19')==='19 Nov 2026','Date-only publications should display consistently');
assert(formatReleaseNoteDate('2026-02-30T00:00:00Z')===null,'Invalid dates must stay hidden');
assert(formatReleaseNoteDate('')===null,'Missing dates must not invent publication dates');

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

const detailed=parseReleaseNoteRow({version:'1.0.14',title:'Balance',published_at:'2026-11-28',highlights:['Balance changes',{kind:'detailed-patch-notes-v1',sections:[{category:'Economy & Gold',entries:['Sell value: 250 → 150 gold','Sell value: 250 → 150 gold',null]},{category:'Loot & Drop Rates',entries:['Drop chance: 5% → 3%']},{category:'Unknown',entries:['Do not show']},{category:'Bug Fixes',entries:[]}]}]});
assert(detailed?.highlights.length===1,'Details must not leak into highlights');
assert(detailed?.details?.length===2,'Only valid non-empty categories should be rendered');
assert(detailed?.details?.[0]?.category==='Loot & Drop Rates','Categories must be consistently ordered');
assert(detailed?.details?.[1]?.entries.length===1,'Duplicate or invalid entries must be ignored');
assert(note?.details?.length===0,'Legacy notes should fall back to highlights');
const malformed=parseReleaseNoteRow({version:'1.0.14',title:'Balance',highlights:['Fix',{kind:'detailed-patch-notes-v1',sections:null}]});
assert(malformed?.details?.length===0,'Malformed details must not prevent highlights from displaying');
const duplicate=parseReleaseNoteRow({version:'1.0.14',title:'Balance',highlights:['Fix',{kind:'detailed-patch-notes-v1',sections:[]},{kind:'detailed-patch-notes-v1',sections:[]}]});
assert(duplicate?.details?.length===0,'Ambiguous details envelopes must be ignored');
