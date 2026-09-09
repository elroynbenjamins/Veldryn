import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Settings,SettingsStore} from '../core/chat';
/** Separate account-scoped preference key. Never overwrite the game's save or auth tokens. */
export const asyncStorageSettings:SettingsStore={
 async load(accountId){
  const raw=await AsyncStorage.getItem(`veldryn.chat.pilot.v1:${encodeURIComponent(accountId)}`);
  if(!raw)return null;
  const value:unknown=JSON.parse(raw);
  if(!value||typeof value!=='object')throw new Error('Invalid chat settings');
  const v=value as Partial<Settings>;
  if(v.schemaVersion!==1||!Array.isArray(v.tray)||v.tray.some(id=>typeof id!=='string')||typeof v.worldOptIn!=='boolean')throw new Error('Invalid chat settings');
  return v as Settings;
 },
 async save(accountId,settings){await AsyncStorage.setItem(`veldryn.chat.pilot.v1:${encodeURIComponent(accountId)}`,JSON.stringify(settings));}
};
