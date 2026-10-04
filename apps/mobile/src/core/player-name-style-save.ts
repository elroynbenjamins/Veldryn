import type {OnlineSnapshot} from './online-game-repository';
import {normalizePlayerNameStyle,type PlayerNameStylePreference} from './player-name-style';

export type SavePlayerNameStyle=(style:PlayerNameStylePreference)=>Promise<PlayerNameStylePreference>;

interface NameStyleWriterPort{
  session:()=>Promise<{accountId:string;accessToken:string}|null>;
  write:(style:PlayerNameStylePreference,accessToken:string)=>Promise<PlayerNameStylePreference>;
}

/** Capture the intended account's token so a mutable auth client cannot redirect the write. */
export async function writePlayerNameStyleForAccount(accountId:string,style:PlayerNameStylePreference,port:NameStyleWriterPort){
  const session=await port.session();
  if(!session||session.accountId!==accountId)throw new Error('Account changed while saving.');
  return port.write(normalizePlayerNameStyle(style),session.accessToken);
}

interface NameStyleSavePort{
  accountId:string;
  isCurrent:()=>boolean;
  write:(style:PlayerNameStylePreference)=>Promise<PlayerNameStylePreference>;
  refresh:()=>Promise<OnlineSnapshot>;
  accept:(snapshot:OnlineSnapshot)=>void;
}

/** A cosmetic save never submits a local gameplay snapshot or changes entitlements. */
export async function saveAndRefreshPlayerNameStyle(style:PlayerNameStylePreference,port:NameStyleSavePort):Promise<PlayerNameStylePreference>{
  const assertCurrent=()=>{if(!port.isCurrent())throw new Error('Account changed while saving.');};
  assertCurrent();
  const saved=normalizePlayerNameStyle(await port.write(normalizePlayerNameStyle(style)));
  assertCurrent();
  const snapshot=await port.refresh();
  assertCurrent();
  if(snapshot.accountId!==port.accountId)throw new Error('Account changed while saving.');
  const confirmed=normalizePlayerNameStyle(snapshot.state.account.playerNameStyle);
  if(JSON.stringify(confirmed)!==JSON.stringify(saved))throw new Error('Your name style was saved, but your profile has not refreshed yet. Please retry.');
  port.accept(snapshot);
  return confirmed;
}
