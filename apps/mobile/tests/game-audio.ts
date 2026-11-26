import {assert} from './test-assert';
import {dungeonMusicFor,dungeonBossMusicFor,worldBossMusicFor} from '../src/core/encounter-music';
import {backgroundMusicFor} from '../src/core/music-context';
import {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences,resolvePreferredMusicTrack,MUSIC_CONTEXTS,MUSIC_TRACKS} from '../src/core/audio-preferences';
import {highestRarity,rarityRevealDelayMs,rarityRevealSound} from '../src/core/rarity-reveal-sound';
const fs=require('fs') as {readFileSync(path:string,encoding:'utf8'):string;statSync(path:string):{size:number};existsSync(path:string):boolean;readdirSync(path:string):string[]};

// Manifest, generated asset map and files stay in sync.
const manifest=JSON.parse(fs.readFileSync('assets/audio/manifest.json','utf8')) as {sfx:Record<string,{seconds:number;volume:number}>;music:Record<string,{seconds:number;selection?:string;rights_status?:string}>};
const assetMap=fs.readFileSync('src/theme/audio-assets.ts','utf8');
let sfxBytes=0,musicBytes=0;
for(const [kind,rows] of [['sfx',manifest.sfx],['music',manifest.music]] as const){
 for(const name of Object.keys(rows)){
  const file='assets/audio/'+kind+'/'+name+'.mp3';
  assert.ok(fs.existsSync(file),'Missing audio file '+file);
  assert.ok(assetMap.includes("require('../../assets/audio/"+kind+'/'+name+".mp3')"),'Asset map misses '+file);
  const size=fs.statSync(file).size;
  if(kind==='sfx'){sfxBytes+=size;assert.ok(size<80_000,'Effect too large: '+name+' '+size);assert.ok(rows[name].seconds<=(name.startsWith('rarity_')?3.5:3),'Effect too long: '+name);}
  else{musicBytes+=size;assert.ok(size<1_500_000,'Music loop too large: '+name+' '+size);assert.ok(rows[name].seconds>=20,'Music loop too short to avoid fatigue: '+name);}
 }
 assert.equal(fs.readdirSync('assets/audio/'+kind).filter(f=>f.endsWith('.mp3')).length,Object.keys(rows).length,'Untracked '+kind+' files');
}
assert.ok(sfxBytes<600_000,'Effects budget exceeded: '+sfxBytes);
assert.ok(musicBytes<10_500_000,'Music budget exceeded: '+musicBytes);
for(const required of ['ui_tap','reward_collect','level_up','rare_drop','unlock','hit','crit','heal','shield','interrupt','phase','cast','down','victory','defeat','craft_complete','upgrade_success','upgrade_fail','mine_hit','chop_hit','fish_splash','gather_yield','boss_entrance','boss_telegraph','boss_special','guard_break','role_moment','world_hp_drop','killing_blow','honor','tonic'])
 assert.ok(required in manifest.sfx,'Missing required effect '+required);
for(const track of MUSIC_TRACKS)assert.ok(track in manifest.music,'Missing music '+track);

// Asterfall is the selected original-synthesis track.
for(const [track,selection] of Object.entries({asterfall:'First Light'})){
 assert.equal(manifest.music[track]?.selection,selection,'Wrong approved soundtrack for '+track);
 assert.equal(manifest.music[track]?.rights_status,'original-synthesis-no-third-party-samples',
   'Unexpected sample provenance for '+track);
}

// Preserve the exact selected recordings and documented permission status.
for(const [track,selection] of Object.entries({
 sunscar:'Evening Oasis V3',frostmarch:'Soft Snowfall V2',
 dungeon:'Midnight Machinery V9 — extended original instruments',
 boss:'Break the Sigil V9 — extended original instruments',
 world_boss:'Eclipse Protocol V9 — extended original instruments',
})){
 assert.equal(manifest.music[track]?.selection,selection,'Wrong approved soundtrack for '+track);
 assert.equal(manifest.music[track]?.rights_status,'creator-permission-received-owner-approved','Unexpected sample permission status for '+track);
}
for(const track of ['dungeon','boss','world_boss'])assert.ok(manifest.music[track].seconds>=95,'Extended battle track is unexpectedly short: '+track);

// Exact encounter defaults, legacy preferences, and manual remaps are independent.
assert.equal(MUSIC_TRACKS.length,13);
assert.equal(dungeonMusicFor('EXP_001'),'dungeon');
assert.equal(dungeonMusicFor('EXP_003'),'dungeon_A');
assert.equal(dungeonMusicFor('EXP_005'),'dungeon_B');
assert.equal(dungeonMusicFor('EVENT_FROSTFALL_AURORA_HOLLOW'),'frostfall_dungeon');
assert.equal(dungeonBossMusicFor('EVENT_FROSTFALL_AURORA_HOLLOW','BOSS_EXP_ROOT'),'frostfall_dungeon');
assert.equal(dungeonBossMusicFor('EXP_001','BOSS_EXP_BELL'),'boss_A');
assert.equal(dungeonBossMusicFor('EXP_003',undefined,'The Buried Heliarch'),'boss_B');
assert.equal(dungeonBossMusicFor('EXP_005','BOSS_EXP_CANTOR'),'boss');
assert.equal(worldBossMusicFor('hollowroot'),'world_boss');
assert.equal(worldBossMusicFor('sunscar'),'world_boss_A');
assert.equal(worldBossMusicFor('frostmarch'),'world_boss_B');
assert.equal(worldBossMusicFor('unknown'),'world_boss');
assert.equal(resolvePreferredMusicTrack('dungeon',DEFAULT_AUDIO_PREFERENCES,'dungeon_A'),'dungeon_A');
const alternate=parseAudioPreferences('{"musicContexts":{"dungeon":{"enabled":true,"track":"boss_B"},"boss":{"enabled":false,"track":null}}}');
assert.equal(resolvePreferredMusicTrack('dungeon',alternate,'dungeon_A'),'boss_B');
assert.equal(resolvePreferredMusicTrack('boss',alternate,'boss_A'),null);
assert.deepEqual(parseAudioPreferences(JSON.stringify(alternate)),alternate);
for(const [id,selection] of Object.entries({boss_A:'Shatter the Crown',boss_B:'No Retreat',dungeon_A:'Iron Cathedral',dungeon_B:'Clockwork Descent',frostfall_dungeon:'Bells of the Frozen Citadel',world_boss_A:'Heavenfall Engine',world_boss_B:'Last Light of Eternity'})){
 assert.equal(manifest.music[id]?.selection,selection);
 assert.equal(manifest.music[id]?.rights_status,'creator-permission-received-owner-approved');
}
// Every combat impact kind has a sound.
const burst=fs.readFileSync('src/components/CombatImpactBurst.tsx','utf8');
for(const kind of ['damage','critical','heal','shield','interrupt','phase','cast','down'])
 assert.ok(new RegExp(kind+":'[a-z_]+'").test(burst.slice(burst.indexOf('IMPACT_SOUND'))),'No sound for impact '+kind);

// Music follows the player.
for(const [regionId,expected] of [['ASTERFALL','asterfall'],['SUNSCAR','sunscar'],['FROSTMARCH','frostmarch']] as const){
 for(const screen of ['Home','World','Combat','Skills','Inventory','Account','Settings']){
  assert.equal(backgroundMusicFor({screen,regionId,hasCharacter:true}),expected,screen+' follows '+regionId);
 }
}
assert.equal(backgroundMusicFor({screen:'Combat',regionId:undefined,hasCharacter:true}),'asterfall');
assert.equal(backgroundMusicFor({screen:'Dungeon',regionId:'SUNSCAR',hasCharacter:true}),'dungeon');
assert.equal(backgroundMusicFor({screen:'Coop',regionId:'FROSTMARCH',hasCharacter:true}),'dungeon');
assert.equal(backgroundMusicFor({screen:'World',regionId:'SUNSCAR',hasCharacter:false}),'asterfall','Before character selection use the starting region theme');

// Preferences: defaults on, corrupt values never throw.
assert.deepEqual(parseAudioPreferences(null),DEFAULT_AUDIO_PREFERENCES);
assert.deepEqual(parseAudioPreferences('{"music":0,"effects":3}'),{music:0,effects:3,musicContexts:{}},'Existing v1 volume settings migrate');
for(const bad of ['{"music":7}','not json','null','[]'])assert.deepEqual(parseAudioPreferences(bad),DEFAULT_AUDIO_PREFERENCES,'Corrupt audio prefs fall back: '+bad);
assert.equal(AUDIO_LEVEL_VOLUME[0],0);assert.ok(AUDIO_LEVEL_VOLUME[3]<=1);
assert.equal(MUSIC_CONTEXTS.length,6,'Every existing theme has a configurable context');
const customized=parseAudioPreferences(JSON.stringify({
 music:2,effects:1,musicContexts:{
  sunscar:{enabled:false,track:'boss'},
  dungeon:{enabled:true,track:'frostmarch'},
  town:{enabled:false,track:'town'},
  asterfall:{enabled:true,track:'town'},
  unknown:{enabled:false,track:'town'},
  frostmarch:{enabled:true,track:'invalid'},
 }
}));
assert.equal(resolvePreferredMusicTrack('sunscar',customized),null,'Muted region stays silent');
assert.equal(resolvePreferredMusicTrack('dungeon',customized),'frostmarch','Dungeon can play another theme');
assert.equal(resolvePreferredMusicTrack('asterfall',customized),'asterfall','Retired Town remap falls back to the current region');
assert.ok(!('town' in customized.musicContexts),'Retired Town context is discarded');
assert.ok(!('asterfall' in customized.musicContexts),'Retired enabled remap is removed');
assert.ok(!('town' in manifest.music),'Retired Town asset must not be bundled');
assert.equal(resolvePreferredMusicTrack('boss',customized),'boss','Untouched activity uses default');
assert.equal(resolvePreferredMusicTrack(null,customized),null,'No scene stays silent');
assert.ok(!('unknown' in customized.musicContexts),'Unknown contexts are rejected');
assert.ok(!('frostmarch' in customized.musicContexts),'Invalid track resets to default');
assert.deepEqual(parseAudioPreferences(JSON.stringify(customized)),customized,'Preferences round-trip safely');
assert.deepEqual(parseAudioPreferences('{"musicContexts":{"sunscar":{"enabled":false,"track":"not_a_track"}}}').musicContexts,
 {sunscar:{enabled:false,track:null}},'Corrupt track cannot play unexpected audio');

// Rarity reveal stingers: Epic and up only, escalating, and played after the reveal has landed.
assert.equal(rarityRevealSound('rare'),null);assert.equal(rarityRevealSound(undefined),null);
assert.equal(rarityRevealSound('epic'),'rarity_epic');assert.equal(rarityRevealSound('legendary'),'rarity_legendary');assert.equal(rarityRevealSound('mythic'),'rarity_mythic');
for(const id of ['rarity_epic','rarity_legendary','rarity_mythic'])assert.ok(id in manifest.sfx,'Missing rarity stinger '+id);
assert.ok(manifest.sfx.rarity_epic.seconds<manifest.sfx.rarity_legendary.seconds&&manifest.sfx.rarity_legendary.seconds<manifest.sfx.rarity_mythic.seconds,'Stingers escalate with rarity');
assert.equal(highestRarity(['rare','mythic','epic']),'mythic');assert.equal(highestRarity([]),null);
assert.ok(rarityRevealDelayMs({reduceMotion:false})>=400,'Stinger waits for the reveal animation');
assert.ok(rarityRevealDelayMs({reduceMotion:true})<rarityRevealDelayMs({reduceMotion:false}),'Reduced motion has no animation to wait for');
assert.equal(rarityRevealDelayMs({reduceMotion:false,after:900})-rarityRevealDelayMs({reduceMotion:false}),900);
for(const file of ['src/components/RewardPopup.tsx','src/components/ForgeResultFeedback.tsx','src/components/ForgeClaimAllSummaryModal.tsx'])
 assert.ok(fs.readFileSync(file,'utf8').includes('useRarityRevealSound('),file+' plays the rarity stinger');
assert.ok(!fs.readFileSync('src/components/ForgeResultFeedback.tsx','utf8').includes("playSound('rare_drop')"),'Forge reveal uses the rarity stinger, not the generic drop chime');

// Native module is only touched lazily inside the guarded engine.
for(const file of ['src/components/GameButton.tsx','src/components/RewardPopup.tsx','src/components/WorldBossBattleStage.tsx'])
 assert.ok(!fs.readFileSync(file,'utf8').includes("from 'expo-audio'"),file+' must go through storage/audio');
assert.ok(fs.readFileSync('src/storage/audio.ts','utf8').includes("require('expo-audio')"),'expo-audio loads lazily');
console.log('PASS: '+Object.keys(manifest.sfx).length+' effects ('+Math.round(sfxBytes/1024)+' KB) and '+Object.keys(manifest.music).length+' music loops ('+Math.round(musicBytes/1024)+' KB), wiring, music context and preferences');
