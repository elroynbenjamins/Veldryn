import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useAuthSession} from './AuthSessionProvider';
import {onlineConfigured} from './supabase';
import {selfProfileExtensionV43,updateProfileExtensionV43,type ProfileExtensionSelfV43} from './profile-extension-v43';

/** Identity and Showcase are two tabs over one stored row. They share this draft so the
 * dirty flag, the save and the audience preview never disagree with each other. */
export interface ProfileExtensionDraft{
 online:boolean;guest:boolean;ready:boolean;busy:boolean;error:string;notice:string;
 value:ProfileExtensionSelfV43|null;bio:string;dirty:boolean;
 setBio:(text:string)=>void;
 patch:(next:Partial<ProfileExtensionSelfV43>)=>void;
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
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const reload=useCallback(async()=>{
  if(!onlineConfigured||!session)return;
  setBusy(true);setError('');
  try{const row=await selfProfileExtensionV43();if(!mounted.current)return;setValue(row);setSavedValue(row);setBioState(row.bio)}
  catch{if(mounted.current)setError('Unable to load profile settings.')}
  finally{if(mounted.current)setBusy(false)}
 },[session]);
 useEffect(()=>{setValue(null);setSavedValue(null);setBioState('');setNotice('');setError('');void reload()},[session?.user.id,reload]);

 const setBio=useCallback((text:string)=>{setNotice('');setError('');setBioState(text.slice(0,160))},[]);
 const patch=useCallback((next:Partial<ProfileExtensionSelfV43>)=>{setNotice('');setError('');setValue(current=>current?{...current,...next}:current)},[]);
 const revert=useCallback(()=>{setNotice('');setError('');setValue(savedValue);setBioState(savedValue?.bio??'')},[savedValue]);

 const dirty=!!value&&!!savedValue&&JSON.stringify(editableSnapshot(value,bio))!==JSON.stringify(editableSnapshot(savedValue,savedValue.bio));
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

 return useMemo(()=>({online:onlineConfigured&&!!session,guest,ready:!!value,busy,error,notice,value,bio,dirty,setBio,patch,save,revert,reload:()=>void reload()}),
  [session,guest,value,busy,error,notice,bio,dirty,setBio,patch,save,revert,reload]);
}
