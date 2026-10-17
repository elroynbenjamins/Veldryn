import {compareReleaseVersions,parseReleaseNoteRow,shouldAutoShowReleaseNotes} from '../src/core/release-notes';

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
console.log('PASS: release note parsing, version targeting and seen-state rules');
