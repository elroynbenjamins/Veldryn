/** Device-local sound levels. Pure so it can be tested without native modules. */
export type AudioLevel=0|1|2|3;
export interface AudioPreferences{music:AudioLevel;effects:AudioLevel;}
export const AUDIO_LEVEL_VOLUME:Readonly<Record<AudioLevel,number>>={0:0,1:.35,2:.65,3:1};
export const DEFAULT_AUDIO_PREFERENCES:AudioPreferences={music:2,effects:2};

const level=(v:unknown,fallback:AudioLevel):AudioLevel=>v===0||v===1||v===2||v===3?v:fallback;
/** Corrupt or missing stored values fall back to the defaults instead of throwing. */
export function parseAudioPreferences(raw:string|null):AudioPreferences{
 if(!raw)return {...DEFAULT_AUDIO_PREFERENCES};
 try{
  const v=JSON.parse(raw) as Partial<AudioPreferences>|null;
  return {music:level(v?.music,DEFAULT_AUDIO_PREFERENCES.music),effects:level(v?.effects,DEFAULT_AUDIO_PREFERENCES.effects)};
 }catch{return {...DEFAULT_AUDIO_PREFERENCES};}
}
