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
import {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences,resolvePreferredMusicTrack,rememberAudibleAudioLevels,audioAfterMuteToggle,type AudioPreferences,type AudioChannel,type MusicContextId} from '../core/audio-preferences';
import type {ItemRarity} from '../core/item-rarity';
import {rarityRevealDelayMs,rarityRevealSound} from '../core/rarity-reveal-sound';
export {AUDIO_LEVEL_VOLUME,DEFAULT_AUDIO_PREFERENCES,parseAudioPreferences};
export type {AudioLevel,AudioPreferences} from '../core/audio-preferences';
const KEY='veldryn.device.audio.v1';
const REMEMBERED_KEY='veldryn.device.audio.last-audible.v1';
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

let prefs:AudioPreferences={...DEFAULT_AUDIO_PREFERENCES,musicContexts:{}},loaded=false;
let preferenceLoad:Promise<AudioPreferences>|undefined;
let remembered:AudioPreferences={...DEFAULT_AUDIO_PREFERENCES,musicContexts:{}};
let saveQueue:Promise<void>=Promise.resolve();
const listeners=new Set<(value:AudioPreferences)=>void>();
export function loadAudioPreferences():Promise<AudioPreferences>{
 if(loaded)return Promise.resolve(prefs);
 if(preferenceLoad)return preferenceLoad;
 // Startup, Settings and music share the same pair of storage reads.
 // Defer the first read until module initialization has completed.
 preferenceLoad=Promise.resolve().then(async()=>{
  try{
   const [stored,lastAudible]=await Promise.all([AsyncStorage.getItem(KEY),AsyncStorage.getItem(REMEMBERED_KEY)]);
   // A user choice made while the initial read was pending must win.
   if(!loaded){
    prefs=parseAudioPreferences(stored);
    remembered=rememberAudibleAudioLevels(parseAudioPreferences(lastAudible),prefs);
   }
  }catch{/* defaults */}
  if(!loaded){loaded=true;notify();resolveTrack();}
  return prefs;
 }).finally(()=>{preferenceLoad=undefined;});
 return preferenceLoad;
}
export async function setAudioPreferences(next:AudioPreferences):Promise<void>{
 prefs=parseAudioPreferences(JSON.stringify(next));
 remembered=rememberAudibleAudioLevels(remembered,prefs);
 loaded=true;notify();
 // Resolve current *context* again; the user may have muted or remapped it.
 resolveTrack();
 applyMusicVolume();
 if(prefs.music===0){stopMusicPreview();stopMusicPlayer();}
 if(prefs.effects===0)releaseEffectPlayers();
 const serialized=JSON.stringify(prefs),savedAudible=JSON.stringify(remembered);
 // Serialize rapid changes; never restore an older context/volume over the last tap.
 saveQueue=saveQueue.catch(()=>{}).then(()=>AsyncStorage.multiSet([[KEY,serialized],[REMEMBERED_KEY,savedAudible]])).then(()=>{},()=>{});
 await saveQueue;
}
/** One-tap mute remembers the previous audible level; area remapping stays intact. */
export function toggleAudioMute(channel:AudioChannel):AudioPreferences[AudioChannel]{
 const next=audioAfterMuteToggle(prefs,remembered,channel);
 void setAudioPreferences(next);
 return next[channel];
}
function notify(){for(const l of listeners)l(prefs);}
// Load saved levels as early as possible so the first sounds already respect them.
void loadAudioPreferences();
export function audioPreferences():AudioPreferences{return prefs;}

// ------------------------------------------------------------------ effects
const effectPlayers=new Map<SoundEffectId,Player>();
const lastPlayed=new Map<SoundEffectId,number>();
// Keep hot effects ready without retaining every native decoder for the whole session.
// Never cut a recently triggered sound: the authored maximum duration is 3.5s.
const EFFECT_CACHE_TARGET=12,EFFECT_IDLE_MS=4_000;
let effectSubscription:{remove():void}|undefined;
function releasePlayer(player:Player){
 try{player.pause();}catch{/* ignore */}
 try{player.remove();}catch{/* ignore */}
}
function releaseEffectPlayers(){
 for(const player of effectPlayers.values())releasePlayer(player);
 effectPlayers.clear();lastPlayed.clear();
 effectSubscription?.remove();effectSubscription=undefined;
}
function watchEffects(){
 if(!effectSubscription)effectSubscription=AppState.addEventListener('change',state=>{if(state!=='active')releaseEffectPlayers();});
}
function trimIdleEffects(now:number){
 if(effectPlayers.size<EFFECT_CACHE_TARGET)return;
 const candidates=[...effectPlayers.keys()].sort((a,b)=>(lastPlayed.get(a)??0)-(lastPlayed.get(b)??0));
 for(const id of candidates){
  if(effectPlayers.size<EFFECT_CACHE_TARGET)break;
  const player=effectPlayers.get(id)!;
  if(now-(lastPlayed.get(id)??0)<EFFECT_IDLE_MS)continue;
  // A delayed native decoder may still be playing despite the elapsed guard.
  try{if(player.playing)continue;}catch{continue;}
  effectPlayers.delete(id);lastPlayed.delete(id);releasePlayer(player);
 }
}
/** Fire-and-forget. Never throws, never blocks presentation. */
export function playSound(id:SoundEffectId,gain=1):void{
 if(!loaded||prefs.effects===0||AppState.currentState!=='active')return;
 const now=Date.now();
 if(now-(lastPlayed.get(id)??0)<MIN_GAP_MS)return;
 lastPlayed.set(id,now);
 const m=audioModule();if(!m)return;
 try{
  ensureMode(m);
  let player=effectPlayers.get(id);
  if(!player){trimIdleEffects(now);player=m.createAudioPlayer(SOUND_EFFECT_ASSETS[id].source);effectPlayers.set(id,player);watchEffects();}
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
 if(musicPlayer)releasePlayer(musicPlayer);
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
 if(!loaded){void loadAudioPreferences();return;}
 if(prefs.music===0||!isForeground())return;
 if(playingTrack===track&&musicPlayer){try{musicPlayer.play();}catch{/* ignore */}return;}
 const m=audioModule();if(!m)return;
 const previous=musicPlayer;
 let next:Player|undefined;
 try{
  ensureMode(m);
  next=m.createAudioPlayer(MUSIC_TRACK_ASSETS[track].source);
  next.loop=true;next.volume=0;next.play();
 }catch{
  // A failed replacement must not orphan either the partial native player or
  // the existing track. Keep the old track available for the next retry.
  if(next)releasePlayer(next);
  return;
 }
 musicPlayer=next;playingTrack=track;
 if(previous)releasePlayer(previous);
 fade(next,0,musicVolume());
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
 if(track===playingTrack&&musicPlayer){
  // Cancel an in-flight mute fade if the same scene becomes audible again.
  if(fadeTimer){clearInterval(fadeTimer);fadeTimer=undefined;}
  applyMusicVolume();
  if(prefs.music>0&&isForeground())try{musicPlayer.play();}catch{/* ignore */}
 }else startTrack(track);
}

// Screens push a temporary track (a boss fight over the region theme) and pop it on exit.
let baseTrack:MusicContextId|null=null,nextOverrideId=1;
const overrides:{id:number;context:MusicContextId;track:MusicTrackId}[]=[];
let previewTrack:MusicTrackId|null=null,previewTimer:ReturnType<typeof setTimeout>|undefined;
function resolveTrack(){
 // Do not select a default track before the saved context remaps/mutes arrive.
 if(!loaded){void loadAudioPreferences();return;}
 const active=overrides[overrides.length-1];
 applyTrack(previewTrack??resolvePreferredMusicTrack(active?.context??baseTrack,prefs,active?.track));
}
/** Audition any packaged theme for a few seconds, regardless of the area's mute state. */
export function playMusicPreview(track:MusicTrackId):void{
 if(!loaded||prefs.music===0||!isForeground())return;
 if(previewTimer)clearTimeout(previewTimer);
 const sameTrack=playingTrack===track&&musicPlayer!==null;
 previewTrack=track;resolveTrack();
 if(sameTrack&&musicPlayer)try{void Promise.resolve(musicPlayer.seekTo(0)).catch(()=>{});}catch{/* ignore */}
 previewTimer=setTimeout(()=>{previewTimer=undefined;previewTrack=null;resolveTrack();},8000);
}
/** Returning to other Settings sections must restore the correct scene immediately. */
export function stopMusicPreview():void{
 if(previewTimer){clearTimeout(previewTimer);previewTimer=undefined;}
 if(previewTrack!==null){previewTrack=null;resolveTrack();}
}
/** The app's background music for the current place (region theme, town). */
export function setBaseMusic(track:MusicContextId|null):void{baseTrack=track;resolveTrack();}
/** While mounted, play `track` over the base music; restores the previous track on unmount. */
export function useMusicOverride(context:MusicContextId|null|undefined,encounterDefault?:MusicTrackId):void{
 useEffect(()=>{
  if(!context)return;
  const entry={id:nextOverrideId++,context,track:encounterDefault??context};overrides.push(entry);resolveTrack();
  return()=>{const i=overrides.findIndex(o=>o.id===entry.id);if(i>=0)overrides.splice(i,1);resolveTrack();};
 },[context,encounterDefault]);
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

/**
 * Plays the Epic / Legendary / Mythic stinger once the rarity reveal has landed.
 * Nothing plays below Epic, or if the reveal closes before the stinger is due.
 */
export function useRarityRevealSound(rarity:ItemRarity|null|undefined,revealKey:unknown,{reduceMotion,after=0}:{reduceMotion:boolean;after?:number}){
  useEffect(()=>{
    const sound=rarityRevealSound(rarity);if(!sound)return;
    const timer=setTimeout(()=>playSound(sound),rarityRevealDelayMs({reduceMotion,after}));
    return()=>clearTimeout(timer);
  },[revealKey,rarity]); // eslint-disable-line react-hooks/exhaustive-deps
}
