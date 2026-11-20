import {assert} from './test-assert';
import {backgroundMusicFor} from '../src/core/music-context';
import {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences} from '../src/core/audio-preferences';
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
  else{musicBytes+=size;assert.ok(size<700_000,'Music loop too large: '+name+' '+size);assert.ok(rows[name].seconds>=20,'Music loop too short to avoid fatigue: '+name);}
 }
 assert.equal(fs.readdirSync('assets/audio/'+kind).filter(f=>f.endsWith('.mp3')).length,Object.keys(rows).length,'Untracked '+kind+' files');
}
assert.ok(sfxBytes<600_000,'Effects budget exceeded: '+sfxBytes);
assert.ok(musicBytes<4_000_000,'Music budget exceeded: '+musicBytes);
for(const required of ['ui_tap','reward_collect','level_up','rare_drop','unlock','hit','crit','heal','shield','interrupt','phase','cast','down','victory','defeat','craft_complete','upgrade_success','upgrade_fail','mine_hit','chop_hit','fish_splash','gather_yield','boss_entrance','boss_telegraph','boss_special','guard_break','role_moment','world_hp_drop','killing_blow','honor','tonic'])
 assert.ok(required in manifest.sfx,'Missing required effect '+required);
for(const track of ['town','asterfall','sunscar','frostmarch','dungeon','boss','world_boss'])assert.ok(track in manifest.music,'Missing music '+track);

// Two selected tracks were composed/rendered using original synthesis only.
for(const [track,selection] of Object.entries({town:'Lanterns at Hearth',asterfall:'First Light'})){
 assert.equal(manifest.music[track]?.selection,selection,'Wrong approved soundtrack for '+track);
 assert.equal(manifest.music[track]?.rights_status,'original-synthesis-no-third-party-samples',
   'Unexpected sample provenance for '+track);
}

// Every combat impact kind has a sound.
const burst=fs.readFileSync('src/components/CombatImpactBurst.tsx','utf8');
for(const kind of ['damage','critical','heal','shield','interrupt','phase','cast','down'])
 assert.ok(new RegExp(kind+":'[a-z_]+'").test(burst.slice(burst.indexOf('IMPACT_SOUND'))),'No sound for impact '+kind);

// Music follows the player.
assert.equal(backgroundMusicFor({screen:'Home',regionId:'SUNSCAR',hasCharacter:true}),'town');
assert.equal(backgroundMusicFor({screen:'Combat',regionId:undefined,hasCharacter:true}),'asterfall');
assert.equal(backgroundMusicFor({screen:'Dungeon',regionId:'SUNSCAR',hasCharacter:true}),'dungeon');
assert.equal(backgroundMusicFor({screen:'World',regionId:'SUNSCAR',hasCharacter:false}),'town','Character creation uses the town theme');

// Preferences: defaults on, corrupt values never throw.
assert.deepEqual(parseAudioPreferences(null),DEFAULT_AUDIO_PREFERENCES);
assert.deepEqual(parseAudioPreferences('{"music":0,"effects":3}'),{music:0,effects:3});
for(const bad of ['{"music":7}','not json','null','[]'])assert.deepEqual(parseAudioPreferences(bad),DEFAULT_AUDIO_PREFERENCES,'Corrupt audio prefs fall back: '+bad);
assert.equal(AUDIO_LEVEL_VOLUME[0],0);assert.ok(AUDIO_LEVEL_VOLUME[3]<=1);

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
