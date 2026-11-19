import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {useEffect,useState} from 'react';
import {MUSIC_TRACK_ASSETS,SOUND_EFFECT_ASSETS,type MusicTrackId,type SoundEffectId} from '../theme/audio-assets';

/**
 * Game audio: original synthesized effects and music (tools/audio/generate-game-audio.py).
 *
 * - Device-local levels (not synced game settings): Music and Effects, Off/Low/Medium/High.
 * - The native module loads lazily and every call is guarded, so a binary without
 *   expo-audio, or a device that refuses playback, is simply silent.
 * - Respects the phone's silent mode, never records, never plays in the background,
 *   and mixes with other apps' audio.
 */
import {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences,type AudioPreferences} from '../core/audio-preferences';
export {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences};
export type {AudioLevel,AudioPreferences} from '../core/audio-preferences';
const KEY='veldryn.device.audio.v1';
/** The same effect retriggered faster than this is dropped (e.g. a burst of hits). */
const MIN_GAP_MS=70;
const MUSIC_BASE=.55,FADE_MS=450;

type AudioModule=typeof import('expo-audio');
type Player=ReturnType<AudioModule['createAudioPlayer']>;
let native:AudioModule|null|undefined,modeSet=false;
function audioModule():AudioModule|null{
 if(native!==undefined)return native;
 try{native=require('expo-audio') as AudioModule;}catch{native=null;}
 return native;
}
function ensureMode(m:AudioModule){
 if(modeSet)return;modeSet=true;
 try{void m.setAudioModeAsync({playsInSilentMode:false,interruptionMode:'mixWithOthers',allowsRecording:false,shouldPlayInBackground:false}).catch(()=>{});}catch{/* optional */}
}

let prefs:AudioPreferences={...DEFAULT_AUDIO_PREFERENCES},loaded=false;
const listeners=new Set<(value:AudioPreferences)=>void>();
export async function loadAudioPreferences():Promise<AudioPreferences>{
 if(loaded)return prefs;
 try{prefs=parseAudioPreferences(await AsyncStorage.getItem(KEY));}catch{/* defaults */}
 loaded=true;notify();return prefs;
}
export async function setAudioPreferences(next:AudioPreferences):Promise<void>{
 prefs={...next};loaded=true;notify();applyMusicVolume();
 if(prefs.music===0)stopMusicPlayer();else if(wantedTrack)startTrack(wantedTrack);
 try{await AsyncStorage.setItem(KEY,JSON.stringify(prefs));}catch{/* applies this session */}
}
function notify(){for(const l of listeners)l(prefs);}
// Load saved levels as early as possible so the first sounds already respect them.
void loadAudioPreferences();
export function audioPreferences():AudioPreferences{return prefs;}

// ------------------------------------------------------------------ effects
const effectPlayers=new Map<SoundEffectId,Player>();
const lastPlayed=new Map<SoundEffectId,number>();
/** Fire-and-forget. Never throws, never blocks presentation. */
export function playSound(id:SoundEffectId,gain=1):void{
 if(prefs.effects===0||AppState.currentState!=='active')return;
 const now=Date.now();
 if(now-(lastPlayed.get(id)??0)<MIN_GAP_MS)return;
 lastPlayed.set(id,now);
 const m=audioModule();if(!m)return;
 try{
  ensureMode(m);
  let player=effectPlayers.get(id);
  if(!player){player=m.createAudioPlayer(SOUND_EFFECT_ASSETS[id].source);effectPlayers.set(id,player);}
  player.volume=Math.max(0,Math.min(1,AUDIO_LEVEL_VOLUME[prefs.effects]*SOUND_EFFECT_ASSETS[id].volume*gain));
  void Promise.resolve(player.seekTo(0)).catch(()=>{});
  player.play();
 }catch{/* unsupported device or missing native module */}
}

// ------------------------------------------------------------------ music
let wantedTrack:MusicTrackId|null=null,musicPlayer:Player|null=null,playingTrack:MusicTrackId|null=null;
let fadeTimer:ReturnType<typeof setInterval>|undefined;
const isForeground=()=>AppState.currentState==='active';
const musicVolume=()=>AUDIO_LEVEL_VOLUME[prefs.music]*MUSIC_BASE;
function applyMusicVolume(){try{if(musicPlayer)musicPlayer.volume=musicVolume();}catch{/* ignore */}}
function stopMusicPlayer(){
 if(fadeTimer){clearInterval(fadeTimer);fadeTimer=undefined;}
 try{musicPlayer?.pause();musicPlayer?.remove();}catch{/* ignore */}
 musicPlayer=null;playingTrack=null;
}
function fade(player:Player,from:number,to:number,done?:()=>void){
 if(fadeTimer)clearInterval(fadeTimer);
 const steps=Math.max(1,Math.round(FADE_MS/40));let i=0;
 fadeTimer=setInterval(()=>{
  i++;try{player.volume=from+(to-from)*Math.min(1,i/steps);}catch{/* ignore */}
  if(i>=steps){clearInterval(fadeTimer);fadeTimer=undefined;done?.();}
 },40);
}
function startTrack(track:MusicTrackId){
 // Never start before saved preferences load: a player who turned music off must not hear it at launch.
 if(!loaded){void loadAudioPreferences().then(()=>{if(wantedTrack===track)startTrack(track);});return;}
 if(prefs.music===0||!isForeground())return;
 if(playingTrack===track&&musicPlayer){try{musicPlayer.play();}catch{/* ignore */}return;}
 const m=audioModule();if(!m)return;
 try{
  ensureMode(m);
  const previous=musicPlayer;
  const next=m.createAudioPlayer(MUSIC_TRACK_ASSETS[track].source);
  next.loop=true;next.volume=0;next.play();
  musicPlayer=next;playingTrack=track;
  if(previous){try{previous.pause();previous.remove();}catch{/* ignore */}}
  fade(next,0,musicVolume());
 }catch{musicPlayer=null;playingTrack=null;}
}
/** Ask for a music track; null stops music. Repeated calls with the same track are no-ops. */
function applyTrack(track:MusicTrackId|null):void{
 wantedTrack=track;
 watchAppState(track!==null);
 if(track===null){
  const player=musicPlayer;
  if(player)fade(player,musicVolume(),0,()=>{if(musicPlayer===player)stopMusicPlayer();});
  return;
 }
 if(track!==playingTrack)startTrack(track);
}

// Screens push a temporary track (a boss fight over the region theme) and pop it on exit.
let baseTrack:MusicTrackId|null=null,nextOverrideId=1;
const overrides:{id:number;track:MusicTrackId}[]=[];
function resolveTrack(){applyTrack(overrides.length?overrides[overrides.length-1].track:baseTrack);}
/** The app's background music for the current place (region theme, town). */
export function setBaseMusic(track:MusicTrackId|null):void{baseTrack=track;resolveTrack();}
/** While mounted, play `track` over the base music; restores the previous track on unmount. */
export function useMusicOverride(track:MusicTrackId|null|undefined):void{
 useEffect(()=>{
  if(!track)return;
  const entry={id:nextOverrideId++,track};overrides.push(entry);resolveTrack();
  return()=>{const i=overrides.findIndex(o=>o.id===entry.id);if(i>=0)overrides.splice(i,1);resolveTrack();};
 },[track]);
}

// Pause music in the background and resume it on return. Subscribed only while a
// track is wanted, so screens and tests that never play music leave no listener behind.
let appStateSubscription:{remove():void}|undefined;
function watchAppState(on:boolean){
 if(on&&!appStateSubscription)appStateSubscription=AppState.addEventListener('change',state=>{
  try{
   if(state!=='active')musicPlayer?.pause();
   else if(wantedTrack&&prefs.music>0){if(musicPlayer&&playingTrack===wantedTrack)musicPlayer.play();else startTrack(wantedTrack);}
  }catch{/* ignore */}
 });
 else if(!on&&appStateSubscription){appStateSubscription.remove();appStateSubscription=undefined;}
}

export function useAudioPreferences():[AudioPreferences,(next:AudioPreferences)=>void]{
 const [value,setValue]=useState(prefs);
 useEffect(()=>{listeners.add(setValue);void loadAudioPreferences().then(setValue);return()=>{listeners.delete(setValue);};},[]);
 return [value,next=>{void setAudioPreferences(next);}];
}
