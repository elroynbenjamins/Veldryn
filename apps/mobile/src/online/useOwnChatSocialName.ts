import {useEffect,useState} from 'react';
import {ACCOUNT_SOCIAL_IDENTITY_RELEASED} from './social-identity-client-gate';
import {accountSocialNameSelf} from './social-name';
import {subscribePlayerIdentityChanges} from './player-identity-cache';

/** Refetch on chat activation and after the owner saves their Social Name.
 * The account-scoped cleanup prevents stale login responses leaking across users.
 */
export function useOwnChatSocialName(accountId:string|null|undefined,active:boolean){
 const [resolved,setResolved]=useState<{accountId:string;name:string}|null>(null);
 useEffect(()=>{
  let mounted=true,requestVersion=0;
  setResolved(null);
  if(!ACCOUNT_SOCIAL_IDENTITY_RELEASED||!accountId||!active)return()=>{mounted=false};
  const refresh=()=>{
   const version=++requestVersion;
   void accountSocialNameSelf().then(row=>{
    if(mounted&&version===requestVersion)setResolved({accountId,name:row.socialName});
   }).catch(()=>{});
  };
  const unsubscribe=subscribePlayerIdentityChanges(changedId=>{
   if(changedId===accountId)refresh();
  });
  refresh();
  return()=>{mounted=false;requestVersion++;unsubscribe()};
 },[accountId,active]);
 return active&&resolved&&resolved.accountId===accountId?resolved.name:null;
}
