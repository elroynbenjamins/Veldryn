import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useAuthSession} from './AuthSessionProvider';
import {onlineConfigured} from './supabase';
import {selfProfileExtensionV43,updateProfileExtensionV43,characterShowcaseSelfV1,type ProfileExtensionSelfV43} from './profile-extension-v43';

/** Identity and Showcase are two tabs over one stored row. They share this draft so the
 * dirty flag, the save and the audience preview never disagree with each other. */
export interface ProfileExtensionDraft{
 online:boolean;guest:boolean;ready:boolean;busy:boolean;error:string;notice:string;
 value:ProfileExtensionSelfV43|null;bio:string;dirty:boolean;
 setBio:(text:string)=>void;
 patch:(next:Partial<ProfileExtensionSelfV43>)=>void;
 selectCharacter:(characterId:string)=>Promise<boolean>;
 save:()=>Promise<void>;
 revert:()=>void;
 reload:()=>void;
}

const editableSnapshot=(row:ProfileExtensionSelfV43,bio:string)=>({
 visibility:row.visibility,worldFeedOptOut:row.worldFeedOptOut,selectedCharacterId:row.selectedCharacterId??null,bio,
 favoriteSkillId:row.favoriteSkillId??null,favoriteCompanionId:row.favoriteCompanionId??null,
 achievementShowcaseIds:row.achievementShowcaseIds,collectionShowcase:row.collectionShowcase,
 recordShowcaseIds:row.recordShowcaseIds,masteryShowcaseActionIds:row.masteryShowcaseActionIds,
});

export function useProfileExtensionDraft(fallbackCharacterId?:string):ProfileExtensionDraft{
 const {session}=useAuthSession();
 const guest=!!session?.user.is_anonymous;
 const [value,setValue]=useState<ProfileExtensionSelfV43|null>(null),[savedValue,setSavedValue]=useState<ProfileExtensionSelfV43|null>(null);
 const [bio,setBioState]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const mounted=useRef(true),requestVersion=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const reload=useCallback(async()=>{
  if(!onlineConfigured||!session)return;
  const version=++requestVersion.current;
  setBusy(true);setError('');
  try{
   const row=await selfProfileExtensionV43();
   const selected=row.selectedCharacterId??fallbackCharacterId;
   // Account privacy/bio are shared. The seven showcase slots belong to this hero.
   const showcase=selected?await characterShowcaseSelfV1(selected):null;
   if(!mounted.current||version!==requestVersion.current)return;
   const resolved={...row,...showcase,selectedCharacterId:selected??null};
   setValue(resolved);setSavedValue(resolved);setBioState(row.bio);
  }
  catch{if(mounted.current&&version===requestVersion.current)setError('Unable to load profile settings.')}
  finally{if(mounted.current)setBusy(false)}
 },[session,fallbackCharacterId]);
 useEffect(()=>{setValue(null);setSavedValue(null);setBioState('');setNotice('');setError('');void reload()},[session?.user.id,reload]);

 const setBio=useCallback((text:string)=>{setNotice('');setError('');setBioState(text.slice(0,160))},[]);
 const patch=useCallback((next:Partial<ProfileExtensionSelfV43>)=>{setNotice('');setError('');setValue(current=>current?{...current,...next}:current)},[]);
 const revert=useCallback(()=>{setNotice('');setError('');setValue(savedValue);setBioState(savedValue?.bio??'')},[savedValue]);
 const dirty=!!value&&!!savedValue&&JSON.stringify(editableSnapshot(value,bio))!==JSON.stringify(editableSnapshot(savedValue,savedValue.bio));
 const selectCharacter=useCallback(async(characterId:string)=>{
  if(!value||busy)return false;
  if(dirty){setError('Save or revert your current profile changes before switching showcased characters.');return false;}
  if(value.selectedCharacterId===characterId)return true;
  const version=++requestVersion.current;
  setBusy(true);setError('');setNotice('');
  try{
   const fields=await characterShowcaseSelfV1(characterId);
   if(!mounted.current||version!==requestVersion.current)return false;
   setValue(current=>current?{...current,...fields,selectedCharacterId:characterId}:current);
   return true;
  }catch{
   if(mounted.current&&version===requestVersion.current)setError('Unable to load this character showcase.');
   return false;
  }finally{if(mounted.current&&version===requestVersion.current)setBusy(false)}
 },[value,busy,dirty]);

 const save=useCallback(async()=>{
  if(!value||busy||guest)return;
  setBusy(true);setError('');setNotice('');
  try{
   const row=await updateProfileExtensionV43({visibility:value.visibility,worldFeedOptOut:value.worldFeedOptOut,
    selectedCharacterId:value.selectedCharacterId??fallbackCharacterId??null,bio,
    favoriteSkillId:value.favoriteSkillId,favoriteCompanionId:value.favoriteCompanionId,
    achievementShowcaseIds:value.achievementShowcaseIds,collectionShowcase:value.collectionShowcase,
    recordShowcaseIds:value.recordShowcaseIds,masteryShowcaseActionIds:value.masteryShowcaseActionIds});
   if(!mounted.current)return;
   setValue(row);setSavedValue(row);setBioState(row.bio);setNotice('Profile saved.');
  }catch{if(mounted.current)setError('Unable to save profile settings.')}
  finally{if(mounted.current)setBusy(false)}
 },[value,bio,busy,guest,fallbackCharacterId]);

 return useMemo(()=>({online:onlineConfigured&&!!session,guest,ready:!!value,busy,error,notice,value,bio,dirty,setBio,patch,selectCharacter,save,revert,reload:()=>void reload()}),
  [session,guest,value,busy,error,notice,bio,dirty,setBio,patch,selectCharacter,save,revert,reload]);
}
