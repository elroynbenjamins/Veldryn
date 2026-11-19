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

test('four existing audio levels and corrupt saves retain their compatible meaning',()=>{
 const {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences}=pureAudio();
 assert.deepEqual(AUDIO_LEVEL_VOLUME,{0:0,1:.35,2:.65,3:1});
 assert.deepEqual(DEFAULT_AUDIO_PREFERENCES,{music:2,effects:2});
 assert.deepEqual(parseAudioPreferences('{"music":0,"effects":3}'),{music:0,effects:3});
 assert.deepEqual(parseAudioPreferences('{broken'),DEFAULT_AUDIO_PREFERENCES);
});

test('mute and restore remember each channel independently even across a save/load cycle',()=>{
 const {audioAfterMuteToggle,rememberAudibleAudioLevels,parseAudioPreferences}=pureAudio();
 const original={music:3,effects:1};
 let remembered=rememberAudibleAudioLevels({music:2,effects:2},original);
 let levels=audioAfterMuteToggle(original,remembered,'music');
 assert.deepEqual(levels,{music:0,effects:1});
 remembered=rememberAudibleAudioLevels(remembered,levels);
 levels=parseAudioPreferences(JSON.stringify(levels));
 remembered=parseAudioPreferences(JSON.stringify(remembered));
 levels=audioAfterMuteToggle(levels,remembered,'music');
 assert.deepEqual(levels,original);
 levels=audioAfterMuteToggle(levels,remembered,'effects');
 assert.deepEqual(levels,{music:3,effects:0});
 levels=audioAfterMuteToggle(levels,remembered,'effects');
 assert.deepEqual(levels,original);
});

test('direct level choices while muted update the next restored level',()=>{
 const {audioAfterMuteToggle,rememberAudibleAudioLevels}=pureAudio();
 const previous={music:3,effects:1};
 let remembered=rememberAudibleAudioLevels({music:2,effects:2},previous);
 const muted=audioAfterMuteToggle(previous,remembered,'music');
 const chosen={...muted,music:1};
 remembered=rememberAudibleAudioLevels(remembered,chosen);
 assert.equal(audioAfterMuteToggle(audioAfterMuteToggle(chosen,remembered,'music'),remembered,'music').music,1);
});

test('sound panel uses compact accessible four-step choices and theme-native pixel icons',()=>{
 const component=read('src/components/AudioSettingsPanel.tsx');
 const settings=read('src/screens/SettingsScreen.tsx');
 assert.match(component,/LEVELS:readonly AudioLevel\[\]=\[0,1,2,3\]/);
 assert.match(component,/accessibilityRole="button"/);
 assert.match(component,/accessibilityState=\{\{selected\}\}/);
 assert.match(component,/minHeight:44/);
 assert.match(component,/minHeight:58/);
 assert.match(component,/GLYPHS:Record<Channel/);
 assert.match(component,/useGameTheme\(\)/);
 assert.match(component,/channel==='effects'&&level>0\)playSound\('ui_confirm'\)/);
 assert.match(component,/toggleAudioMute\(channel\)/);
 assert.match(settings,/<AudioSettingsPanel translate=\{a\}\/>/);
 assert.doesNotMatch(settings,/setAudio\(\{\.\.\.audio,/);
});

test('mute memory persists and new controls are localized',()=>{
 const storage=read('src/storage/audio.ts');
 const translations=read('src/i18n/recent-screens.ts');
 assert.match(storage,/veldryn\.device\.audio\.last-audible\.v1/);
 assert.match(storage,/AsyncStorage\.multiSet\(/);
 assert.match(storage,/persistence=persistence\.catch/);
 assert.match(storage,/if\(loaded\)return prefs;/);
 assert.match(translations,/"Mute": \[/);
 assert.match(translations,/"Restore": \[/);
});
