/** Device-local audio levels and per-area music choices. No native imports. */
export type AudioLevel=0|1|2|3;
export const MUSIC_CONTEXTS=['asterfall','sunscar','frostmarch','dungeon','boss','world_boss'] as const;
export type MusicContextId=typeof MUSIC_CONTEXTS[number];
export interface MusicContextPreference{enabled:boolean;track:MusicContextId|null;}
export interface AudioPreferences{
 music:AudioLevel;
 effects:AudioLevel;
 /** Unspecified areas play their own default theme. */
 musicContexts:Partial<Record<MusicContextId,MusicContextPreference>>;
}
export const AUDIO_LEVEL_VOLUME:Readonly<Record<AudioLevel,number>>={0:0,1:.35,2:.65,3:1};
export const DEFAULT_AUDIO_PREFERENCES:AudioPreferences={music:2,effects:2,musicContexts:{}};
const level=(value:unknown,fallback:AudioLevel):AudioLevel=>value===0||value===1||value===2||value===3?value:fallback;
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const isContext=(value:unknown):value is MusicContextId=>typeof value==='string'&&(MUSIC_CONTEXTS as readonly string[]).includes(value);

/** V1 settings migrate without losing volume; retired Town selections fall back to their current region or activity; unknown and corrupt values are ignored. */
export function parseAudioPreferences(raw:string|null):AudioPreferences{
 if(!raw)return {...DEFAULT_AUDIO_PREFERENCES,musicContexts:{}};
 try{
  const value:unknown=JSON.parse(raw);
  if(!record(value))return {...DEFAULT_AUDIO_PREFERENCES,musicContexts:{}};
  const contexts:AudioPreferences['musicContexts']={};
  const stored=record(value.musicContexts)?value.musicContexts:{};
  for(const id of MUSIC_CONTEXTS){
   const entry=stored[id];
   if(!record(entry))continue;
   const enabled=entry.enabled!==false;
   const track=isContext(entry.track)?entry.track:null;
   if(!enabled||track!==null)contexts[id]={enabled,track};
  }
  return {music:level(value.music,DEFAULT_AUDIO_PREFERENCES.music),effects:level(value.effects,DEFAULT_AUDIO_PREFERENCES.effects),musicContexts:contexts};
 }catch{return {...DEFAULT_AUDIO_PREFERENCES,musicContexts:{}};}
}
export function musicContextPreference(prefs:AudioPreferences,context:MusicContextId):MusicContextPreference{
 return prefs.musicContexts[context]??{enabled:true,track:null};
}
/** A muted context stays silent, even while a scene override is mounted. */
export function resolvePreferredMusicTrack(context:MusicContextId|null,prefs:AudioPreferences):MusicContextId|null{
 if(context===null)return null;
 const choice=musicContextPreference(prefs,context);
 return choice.enabled?(choice.track??context):null;
}

/** Restore only audio channels: independent per-area preferences are never replaced. */
export type AudioChannel='music'|'effects';
export function rememberAudibleAudioLevels(previous:AudioPreferences,next:AudioPreferences):AudioPreferences{
 return {...next,
  music:next.music>0?next.music:previous.music||DEFAULT_AUDIO_PREFERENCES.music,
  effects:next.effects>0?next.effects:previous.effects||DEFAULT_AUDIO_PREFERENCES.effects,
 };
}
export function audioAfterMuteToggle(current:AudioPreferences,remembered:AudioPreferences,channel:AudioChannel):AudioPreferences{
 return {...current,[channel]:current[channel]===0?(remembered[channel]||DEFAULT_AUDIO_PREFERENCES[channel]):0};
}
