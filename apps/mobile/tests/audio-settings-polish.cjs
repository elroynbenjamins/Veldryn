'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function pureAudio(){
 const source=read('src/core/audio-preferences.ts');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const m={exports:{}};
 new Function('module','exports',js)(m,m.exports);
 return m.exports;
}
test('existing audio volume settings migrate without losing area defaults',()=>{
 const {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences}=pureAudio();
 assert.deepEqual(AUDIO_LEVEL_VOLUME,{0:0,1:.35,2:.65,3:1});
 assert.deepEqual(DEFAULT_AUDIO_PREFERENCES,{music:2,effects:2,musicContexts:{}});
 assert.deepEqual(parseAudioPreferences('{"music":0,"effects":3}'),{music:0,effects:3,musicContexts:{}});
 assert.deepEqual(parseAudioPreferences('{broken'),DEFAULT_AUDIO_PREFERENCES);
});
test('mute/restore preserves all region choices and both channels independently',()=>{
 const {audioAfterMuteToggle,rememberAudibleAudioLevels,parseAudioPreferences}=pureAudio();
 const original={music:3,effects:1,musicContexts:{sunscar:{enabled:false,track:null},dungeon:{enabled:true,track:'boss'}}};
 let remembered=rememberAudibleAudioLevels({music:2,effects:2,musicContexts:{}},original);
 let muted=audioAfterMuteToggle(original,remembered,'music');
 assert.deepEqual(muted,{...original,music:0});
 remembered=rememberAudibleAudioLevels(remembered,muted);
 muted=parseAudioPreferences(JSON.stringify(muted));
 remembered=parseAudioPreferences(JSON.stringify(remembered));
 assert.deepEqual(audioAfterMuteToggle(muted,remembered,'music'),original);
 assert.deepEqual(audioAfterMuteToggle(original,remembered,'effects'),{...original,effects:0});
});
test('choosing a master level while muted changes the next remembered level',()=>{
 const {audioAfterMuteToggle,rememberAudibleAudioLevels}=pureAudio();
 const previous={music:3,effects:1,musicContexts:{asterfall:{enabled:false,track:null}}};
 let remembered=rememberAudibleAudioLevels({music:2,effects:2,musicContexts:{}},previous);
 const muted=audioAfterMuteToggle(previous,remembered,'music');
 const chosen={...muted,music:1};
 remembered=rememberAudibleAudioLevels(remembered,chosen);
 assert.equal(audioAfterMuteToggle(audioAfterMuteToggle(chosen,remembered,'music'),remembered,'music').music,1);
});
test('Settings uses the single scrollable per-region Music panel',()=>{
 const component=read('src/components/MusicSettingsPanel.tsx');
 const settings=read('src/screens/SettingsScreen.tsx');
 assert.match(settings,/<MusicSettingsPanel language=\{language\}\/>/);
 assert.doesNotMatch(settings,/<AudioSettingsPanel/);
 assert.match(component,/REGIONS\.map\(regionRow\)/);
 assert.match(component,/const REGIONS:readonly MusicContextId\[\]=\['asterfall','sunscar','frostmarch'\]/);
 assert.doesNotMatch(component,/const REGIONS:[^;]*\['town'/);
 assert.match(component,/const MUSIC_CHOICES=MUSIC_CONTEXTS;/);
 assert.match(component,/ACTIVITIES\.map\(regionRow\)/);
 assert.match(component,/minHeight:44/);
 assert.match(component,/accessibilityRole="switch"/);
 assert.match(component,/playMusicPreview\(track\?\?id\)/);
 assert.doesNotMatch(component,/<ScrollView/);
});
test('stored mute memory is race-safe, while context volume edits are serialized',()=>{
 const storage=read('src/storage/audio.ts');
 assert.match(storage,/veldryn\.device\.audio\.last-audible\.v1/);
 assert.match(storage,/AsyncStorage\.multiSet\(/);
 assert.match(storage,/saveQueue=saveQueue\.catch/);
 assert.match(storage,/if\(!loaded\)/);
 assert.match(storage,/resolveTrack\(\)/);
 assert.match(storage,/export function toggleAudioMute\(/);
});
