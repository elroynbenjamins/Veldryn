import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useState} from 'react';

/**
 * Device-local haptic feedback for big combat moments.
 *
 * Stored on the device (not in the synced game settings) because vibration is a
 * per-device preference and the server validates game settings against a fixed
 * key list. Defaults to ON. The native module is loaded lazily and every call is
 * guarded, so a binary without expo-haptics simply stays silent.
 */
export type HapticMoment='impact'|'heavy'|'success'|'warning';

const KEY='veldryn.device.haptics.v1';
let enabled=true,loaded=false;
const listeners=new Set<(value:boolean)=>void>();

type HapticsModule=typeof import('expo-haptics');
let native:HapticsModule|null|undefined;
function hapticsModule():HapticsModule|null{
 if(native!==undefined)return native;
 try{native=require('expo-haptics') as HapticsModule;}catch{native=null;}
 return native;
}

export async function loadHapticsPreference():Promise<boolean>{
 if(loaded)return enabled;
 try{const raw=await AsyncStorage.getItem(KEY);if(raw==='off')enabled=false;}catch{/* default on */}
 loaded=true;
 for(const listener of listeners)listener(enabled);
 return enabled;
}

export async function setHapticsPreference(value:boolean):Promise<void>{
 enabled=value;loaded=true;
 for(const listener of listeners)listener(enabled);
 try{await AsyncStorage.setItem(KEY,value?'on':'off');}catch{/* preference still applies this session */}
}

export function hapticsEnabled():boolean{return enabled;}

/** Fire-and-forget. Never throws, never blocks presentation. */
export function playHaptic(moment:HapticMoment):void{
 if(!enabled)return;
 const h=hapticsModule();
 if(!h)return;
 try{
  const done=moment==='success'?h.notificationAsync(h.NotificationFeedbackType.Success)
   :moment==='warning'?h.notificationAsync(h.NotificationFeedbackType.Warning)
   :h.impactAsync(moment==='heavy'?h.ImpactFeedbackStyle.Heavy:h.ImpactFeedbackStyle.Medium);
  void Promise.resolve(done).catch(()=>{});
 }catch{/* unsupported device */}
}

export function useHapticsPreference():[boolean,(value:boolean)=>void]{
 const [value,setValue]=useState(enabled);
 useEffect(()=>{
  listeners.add(setValue);
  void loadHapticsPreference().then(setValue);
  return()=>{listeners.delete(setValue);};
 },[]);
 return [value,next=>{void setHapticsPreference(next);}];
}
