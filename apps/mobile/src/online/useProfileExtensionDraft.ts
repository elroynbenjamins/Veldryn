import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useAuthSession} from './AuthSessionProvider';
import {onlineConfigured} from './supabase';
import {ACCOUNT_SOCIAL_IDENTITY_RELEASED} from './social-identity-client-gate';
import {
 selfProfileExtensionV43,updateProfileExtensionV43,characterShowcaseSelfV1,updateProfileIdentityV2,
 updateCharacterShowcaseV2,setFeaturedProfileCharacterV2,
 type CharacterShowcaseFieldsV1,type ProfileExtensionSelfV43,
} from './profile-extension-v43';

/** Account identity and per-character showcases have distinct saves and dirty flags.
 * Browsing a hero never changes the featured hero or the active gameplay character. */
export interface ProfileExtensionDraft{
 online:boolean;guest:boolean;ready:boolean;busy:boolean;error:string;notice:string;
 value:ProfileExtensionSelfV43|null;bio:string;dirty:boolean;
 identityDirty:boolean;showcaseDirty:boolean;featuredCharacterId:string|null;
 setBio:(text:string)=>void;
 patch:(next:Partial<ProfileExtensionSelfV43>)=>void;
 selectCharacter:(characterId:string)=>Promise<boolean>;
 setFeatured:()=>Promise<void>;
 saveIdentity:()=>Promise<void>;
 saveShowcase:()=>Promise<void>;
 revertIdentity:()=>void;
 revertShowcase:()=>void;
 revert:()=>void;
 reload:()=>void;
}

const identitySnapshot=(row:ProfileExtensionSelfV43,bio:string)=>({
 visibility:row.visibility,worldFeedOptOut:row.worldFeedOptOut,bio,
});
const showcaseSnapshot=(row:ProfileExtensionSelfV43):CharacterShowcaseFieldsV1=>({
 favoriteSkillId:row.favoriteSkillId??null,
 favoriteCompanionId:row.favoriteCompanionId??null,
 achievementShowcaseIds:row.achievementShowcaseIds,
 collectionShowcase:row.collectionShowcase,
 recordShowcaseIds:row.recordShowcaseIds,
 masteryShowcaseActionIds:row.masteryShowcaseActionIds,
});

/** Existing production v43 RPC remains the only write path until the
 * account-wide Social Name schema and companion binary are released. */
const saveLegacyProfile=(row:ProfileExtensionSelfV43,bio:string,fallbackCharacterId?:string)=>
 updateProfileExtensionV43({
  visibility:row.visibility,worldFeedOptOut:row.worldFeedOptOut,
  selectedCharacterId:row.selectedCharacterId??fallbackCharacterId??null,bio,
  favoriteSkillId:row.favoriteSkillId,favoriteCompanionId:row.favoriteCompanionId,
  achievementShowcaseIds:row.achievementShowcaseIds,collectionShowcase:row.collectionShowcase,
  recordShowcaseIds:row.recordShowcaseIds,masteryShowcaseActionIds:row.masteryShowcaseActionIds,
 });

/** Known validation failures are actionable; unexpected errors stay generic. */
export function showcaseSaveError(cause:unknown):string{
 const message=typeof cause==='object'&&cause!==null&&'message' in cause?String(cause.message):'';
 switch(message){
  case 'ACHIEVEMENT_NOT_UNLOCKED':return 'One of the selected achievements is not unlocked. Remove it and retry.';
  case 'RECORD_NOT_AVAILABLE':return 'One of the selected personal records is unavailable. Remove it and retry.';
  case 'COLLECTION_NOT_OWNED':return 'One of the selected collectibles is not owned. Remove it and retry.';
  default:return 'Unable to save this character showcase.';
 }
}

export function useProfileExtensionDraft(fallbackCharacterId?:string):ProfileExtensionDraft{
 const {session}=useAuthSession();
 const accountId=session?.user.id??'';
 const guest=!!session?.user.is_anonymous;
 const [value,setValue]=useState<ProfileExtensionSelfV43|null>(null),[savedValue,setSavedValue]=useState<ProfileExtensionSelfV43|null>(null);
 const [featuredCharacterId,setFeaturedCharacterId]=useState<string|null>(null);
 const [bio,setBioState]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const mounted=useRef(true),requestVersion=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestVersion.current++}},[]);

 const reload=useCallback(async()=>{
  if(!onlineConfigured||!accountId)return;
  const version=++requestVersion.current;
  setBusy(true);setError('');
  try{
   const row=await selfProfileExtensionV43();
   const selected=row.selectedCharacterId??fallbackCharacterId;
   const showcase=ACCOUNT_SOCIAL_IDENTITY_RELEASED&&selected?await characterShowcaseSelfV1(selected):null;
   if(!mounted.current||version!==requestVersion.current)return;
   const resolved={...row,...showcase,selectedCharacterId:selected??null};
   setFeaturedCharacterId(row.selectedCharacterId??null);
   setValue(resolved);setSavedValue(resolved);setBioState(row.bio);
  }catch{
   if(mounted.current&&version===requestVersion.current)setError('Unable to load profile settings.');
  }finally{
   if(mounted.current&&version===requestVersion.current)setBusy(false);
  }
 },[accountId,fallbackCharacterId]);
 useEffect(()=>{
  requestVersion.current++;
  setValue(null);setSavedValue(null);setFeaturedCharacterId(null);setBioState('');setNotice('');setError('');
  void reload();
 },[reload,guest]);

 const setBio=useCallback((text:string)=>{setNotice('');setError('');setBioState(text.slice(0,160))},[]);
 const patch=useCallback((next:Partial<ProfileExtensionSelfV43>)=>{
  setNotice('');setError('');setValue(current=>current?{...current,...next}:current);
 },[]);
 const revert=useCallback(()=>{
  setNotice('');setError('');setValue(savedValue);setBioState(savedValue?.bio??'');
 },[savedValue]);
 // Each tab only discards its own changes. A pending showcase remains intact
 // when reverting privacy/bio, and an unsaved bio survives a showcase revert.
 const revertIdentity=useCallback(()=>{
  setNotice('');setError('');
  setValue(current=>current&&savedValue?{
   ...current,visibility:savedValue.visibility,worldFeedOptOut:savedValue.worldFeedOptOut,
  }:current);
  if(savedValue)setBioState(savedValue.bio);
 },[savedValue]);
 const revertShowcase=useCallback(()=>{
  setNotice('');setError('');
  setValue(current=>current&&savedValue?{
   ...current,...showcaseSnapshot(savedValue),
   selectedCharacterId:ACCOUNT_SOCIAL_IDENTITY_RELEASED?current.selectedCharacterId:savedValue.selectedCharacterId,
  }:current);
 },[savedValue]);

 const identityDirty=!!value&&!!savedValue&&
  JSON.stringify(identitySnapshot(value,bio))!==JSON.stringify(identitySnapshot(savedValue,savedValue.bio));
 const showcaseDirty=!!value&&!!savedValue&&(
  JSON.stringify(showcaseSnapshot(value))!==JSON.stringify(showcaseSnapshot(savedValue))||
  (!ACCOUNT_SOCIAL_IDENTITY_RELEASED&&value.selectedCharacterId!==savedValue.selectedCharacterId));
 const dirty=identityDirty||showcaseDirty;

 const selectCharacter=useCallback(async(characterId:string)=>{
  if(!value||busy)return false;
  if(!ACCOUNT_SOCIAL_IDENTITY_RELEASED){
   // Legacy editor already supported choosing a featured character. Preserve
   // that draft+Save behavior while the independent V2 showcases are hidden.
   setError('');setNotice('');
   setValue(current=>current?{...current,selectedCharacterId:characterId}:current);
   return true;
  }
  if(showcaseDirty){
   setError('Save or revert this hero’s showcase before opening another hero.');
   return false;
  }
  if(value.selectedCharacterId===characterId)return true;
  const version=++requestVersion.current;
  setBusy(true);setError('');setNotice('');
  try{
   const fields=await characterShowcaseSelfV1(characterId);
   if(!mounted.current||version!==requestVersion.current)return false;
   const merge=(current:ProfileExtensionSelfV43|null)=>
    current?{...current,...fields,selectedCharacterId:characterId}:current;
   setValue(merge);setSavedValue(merge);
   return true;
  }catch{
   if(mounted.current&&version===requestVersion.current)setError('Unable to load this character showcase.');
   return false;
  }finally{
   if(mounted.current&&version===requestVersion.current)setBusy(false);
  }
 },[value,busy,showcaseDirty]);

 const saveIdentity=useCallback(async()=>{
  if(!value||busy||guest||!identityDirty)return;
  const version=requestVersion.current;
  setBusy(true);setError('');setNotice('');
  try{
   const row=ACCOUNT_SOCIAL_IDENTITY_RELEASED
    ?await updateProfileIdentityV2({visibility:value.visibility,worldFeedOptOut:value.worldFeedOptOut,bio})
    :await saveLegacyProfile(value,bio,fallbackCharacterId);
   if(!mounted.current||version!==requestVersion.current)return;
   if(ACCOUNT_SOCIAL_IDENTITY_RELEASED){
    const identity={visibility:row.visibility,worldFeedOptOut:row.worldFeedOptOut,bio:row.bio};
    setValue(current=>current?{...current,...identity}:current);
    setSavedValue(current=>current?{...current,...identity}:current);
   }else{setValue(row);setSavedValue(row);}
   setBioState(row.bio);setNotice(ACCOUNT_SOCIAL_IDENTITY_RELEASED?'Profile identity saved.':'Profile saved.');
  }catch{
   if(mounted.current&&version===requestVersion.current)setError('Unable to save your profile identity.');
  }finally{if(mounted.current&&version===requestVersion.current)setBusy(false)}
 },[value,bio,busy,guest,identityDirty,fallbackCharacterId]);

 const saveShowcase=useCallback(async()=>{
  const characterId=value?.selectedCharacterId;
  if(!value||!characterId||busy||guest||!showcaseDirty)return;
  const version=requestVersion.current;
  setBusy(true);setError('');setNotice('');
  try{
   const result=ACCOUNT_SOCIAL_IDENTITY_RELEASED
    ?await updateCharacterShowcaseV2(characterId,showcaseSnapshot(value))
    :await saveLegacyProfile(value,bio,fallbackCharacterId);
   if(!mounted.current||version!==requestVersion.current)return;
   setValue(current=>current?.selectedCharacterId===characterId?{...current,...result}:current);
   setSavedValue(current=>current?.selectedCharacterId===characterId?{...current,...result}:current);
   if(!ACCOUNT_SOCIAL_IDENTITY_RELEASED)setBioState((result as ProfileExtensionSelfV43).bio);
   setNotice(ACCOUNT_SOCIAL_IDENTITY_RELEASED?'Character showcase saved.':'Profile saved.');
  }catch(cause){
   if(mounted.current&&version===requestVersion.current)setError(showcaseSaveError(cause));
  }finally{if(mounted.current&&version===requestVersion.current)setBusy(false)}
 },[value,bio,busy,guest,showcaseDirty,fallbackCharacterId]);

 const setFeatured=useCallback(async()=>{
  const characterId=value?.selectedCharacterId;
  if(!ACCOUNT_SOCIAL_IDENTITY_RELEASED||!characterId||busy||guest||characterId===featuredCharacterId)return;
  if(showcaseDirty){
   setError('Save or revert this hero’s showcase before featuring it.');
   return;
  }
  const version=requestVersion.current;
  setBusy(true);setError('');setNotice('');
  try{
   const row=await setFeaturedProfileCharacterV2(characterId);
   if(!mounted.current||version!==requestVersion.current)return;
   setFeaturedCharacterId(row.selectedCharacterId??null);
   setNotice('Featured character updated. Your active hero was not switched.');
  }catch{
   if(mounted.current&&version===requestVersion.current)setError('Unable to change your featured character.');
  }finally{if(mounted.current&&version===requestVersion.current)setBusy(false)}
 },[value,busy,guest,featuredCharacterId,showcaseDirty]);

 return useMemo(()=>({
  online:onlineConfigured&&!!accountId,guest,ready:!!value,busy,error,notice,value,bio,
  dirty,identityDirty,showcaseDirty,featuredCharacterId,
  setBio,patch,selectCharacter,setFeatured,saveIdentity,saveShowcase,revertIdentity,revertShowcase,revert,reload:()=>void reload(),
 }),[accountId,guest,value,busy,error,notice,bio,dirty,identityDirty,showcaseDirty,featuredCharacterId,
     setBio,patch,selectCharacter,setFeatured,saveIdentity,saveShowcase,revertIdentity,revertShowcase,revert,reload]);
}
