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
 assert.match(component,/const MUSIC_CHOICES=MUSIC_TRACKS;/);
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

test('native audio resource lifecycle: shared startup read, saved remap, idle trim, mute and background cleanup',async()=>{
 const vm=require('node:vm'),preferences=pureAudio(),players=[],listeners=new Set(),reads=[],timers=new Map();
 let clock=10000,sequence=0,failSource;
 const effectIds=Array.from({length:15},(_,i)=>'effect_'+i);
 const appState={currentState:'active',addEventListener:(_event,fn)=>{listeners.add(fn);return {remove:()=>listeners.delete(fn)};}};
 function changeApp(state){appState.currentState=state;for(const fn of [...listeners])fn(state);}
 const storage={getItem:key=>new Promise(resolve=>reads.push({key,resolve})),multiSet:async()=>{}};
 const native={setAudioModeAsync:async()=>{},createAudioPlayer:source=>{
  const player={source,playing:false,removed:0,volume:0,loop:false,play(){if(source===failSource)throw Error('native play failed');this.playing=true;},pause(){this.playing=false;},remove(){this.removed++;},seekTo:async()=>{}};
  players.push(player);return player;
 }};
 const assets={
  SOUND_EFFECT_ASSETS:Object.fromEntries(effectIds.map(id=>[id,{source:id,volume:1}])),
  MUSIC_TRACK_ASSETS:Object.fromEntries(preferences.MUSIC_TRACKS.map(id=>[id,{source:id}])),
 };
 const deps={'@react-native-async-storage/async-storage':storage,'react-native':{AppState:appState},'react':{},'expo-audio':native,'../theme/audio-assets':assets,'../core/audio-preferences':preferences,'../core/rarity-reveal-sound':{}};
 const sandbox={exports:{},require:name=>deps[name]??{},Date:{now:()=>clock},Promise,console,
  setInterval:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),
  setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(ts.transpileModule(read('src/storage/audio.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,sandbox);
 const audio=sandbox.exports;
 const first=audio.loadAudioPreferences(),second=audio.loadAudioPreferences();assert.equal(first,second);
 audio.setBaseMusic('asterfall');audio.playSound(effectIds[0]);assert.equal(players.length,0,'Nothing plays before saved preferences arrive');
 await Promise.resolve();assert.equal(reads.length,2,'One read pair even with concurrent consumers');
 const saved={music:2,effects:2,musicContexts:{asterfall:{enabled:true,track:'boss_B'}}};
 reads.forEach(row=>row.resolve(row.key.includes('last-audible')?null:JSON.stringify(saved)));
 await first;
 assert.deepEqual(players.map(p=>p.source),['boss_B'],'First native player uses saved context instead of default track');
 const original=players[0];
 const tick=()=>{for(const fn of [...timers.values()])fn();};
 tick();
 await audio.setAudioPreferences({...saved,music:1});
 for(let i=0;i<15;i++)tick();
 assert.ok(Math.abs(original.volume-.35*.55)<1e-8,'Fade-in settles at the most recent volume, not the original target');
 await audio.setAudioPreferences({...saved,music:3});
 assert.ok(Math.abs(original.volume-.55)<1e-8,'Volume changes after fade apply immediately');
 const mutedContext={...saved,music:3,musicContexts:{asterfall:{enabled:false,track:null}}};
 await audio.setAudioPreferences(mutedContext);tick();
 const fadingVolume=original.volume;
 await audio.setAudioPreferences({...mutedContext,effects:1});tick();
 assert.ok(original.volume<fadingVolume,'An unrelated settings change must not restart or amplify a muted context fade');
 await audio.setAudioPreferences(saved);
 assert.equal(original.removed,0,'Re-enabling the same context cancels the pending fade-out');
 assert.ok(Math.abs(original.volume-.65*.55)<1e-8,'Restored context uses current master volume');
 failSource='sunscar';audio.setBaseMusic('sunscar');
 const failed=players.at(-1);assert.equal(failed.source,'sunscar');assert.equal(failed.removed,1);assert.equal(original.removed,0,'A failed replacement retains the existing track');
 failSource=undefined;audio.setBaseMusic('sunscar');assert.equal(original.removed,1);
 for(const id of effectIds)audio.playSound(id);
 const cached=()=>players.filter(p=>p.source.startsWith('effect_')&&!p.removed);
 assert.equal(cached().length,15,'Never cut a recent burst merely to reach the idle target');
 const protect=cached()[0];for(const p of cached().slice(1))p.playing=false;
 clock+=5000;audio.playSound(effectIds[14]);
 assert.equal(cached().length,12,'Next playback reclaims idle excess');
 assert.equal(protect.removed,0,'Still-playing decoder is never evicted by age alone');
 changeApp('background');assert.equal(cached().length,0,'Background releases all sound effect players');
 changeApp('active');audio.playSound(effectIds[1]);assert.equal(cached().length,1);
 await audio.setAudioPreferences({...saved,effects:0});assert.equal(cached().length,0,'Muting immediately releases sound resources');
 audio.playSound(effectIds[2]);assert.equal(cached().length,0);
 await audio.setAudioPreferences({...saved,effects:2});
 failSource=effectIds[2];audio.playSound(effectIds[2]);assert.equal(cached().length,0,'Failed sound decoder is disposed');
 await audio.setAudioPreferences({...saved,music:0,effects:0});assert.equal(timers.size,0,'Master mute clears the music fade');
});
