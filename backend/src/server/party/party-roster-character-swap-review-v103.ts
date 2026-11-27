/** Hidden review only: account-stable, atomic lobby character selection.
 * No storage write, ready-check mutation, combat authorization or class change.
 * All ownership, current revisions and consent rows must be loaded by a future
 * private transaction; never trust a client-supplied snapshot or approval.
 */
import {CLASS_ROLES_V2,type ClassIdV2} from '../combat/v2/build-contract';
export const PARTY_ROSTER_SWAP_V103_RELEASED=false;
export interface PartyCharacterV103{
 readonly accountId:string;readonly characterId:string;readonly classId:ClassIdV2;
}
export interface PartySwapConsentV103{
 readonly accountId:string;readonly characterId:string;readonly rosterRevision:number;
}
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v);
function fail(reason:string):never{throw Error('party_swap_v103_'+reason);}
function checkRoster(rows:readonly PartyCharacterV103[],size:number){
 if(!Array.isArray(rows)||rows.length!==size||
  rows.some(r=>!r||!id(r.accountId)||!id(r.characterId)||
   !Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,r.classId))||
  new Set(rows.map(r=>r.accountId)).size!==size||
  new Set(rows.map(r=>r.characterId)).size!==size)fail('invalid_roster');
}
export function reviewPartyCharacterSwapV103(input:{
 readonly partyId:string;
 readonly mode:'dungeon'|'party_event';
 readonly phase:'lobby'|'ready_check'|'committed_run'|'event_frozen';
 readonly rosterRevision:number;
 readonly expectedRevision:number;
 readonly current:readonly PartyCharacterV103[];
 readonly proposed:readonly PartyCharacterV103[];
 readonly ownedCharacters:readonly PartyCharacterV103[];
 readonly consents:readonly PartySwapConsentV103[];
},qaEnabled=false){
 if(!qaEnabled||PARTY_ROSTER_SWAP_V103_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 if(!input||!id(input.partyId)||!['dungeon','party_event'].includes(input.mode)||
  !Number.isSafeInteger(input.rosterRevision)||input.rosterRevision<1||
  input.rosterRevision>=Number.MAX_SAFE_INTEGER||
  input.expectedRevision!==input.rosterRevision)fail('stale_or_invalid_revision');
 if(input.phase!=='lobby')fail('roster_locked');
 const size=input.current.length;
 if(size<2||size>4||(input.mode==='dungeon'&&size!==4))fail('invalid_party_size');
 checkRoster(input.current,size);checkRoster(input.proposed,size);
 const current=new Map(input.current.map(r=>[r.accountId,r]));
 if(input.proposed.some(r=>!current.has(r.accountId)))fail('membership_changed');
 if(!Array.isArray(input.ownedCharacters)||!Array.isArray(input.consents))fail('missing_verified_sources');
 const owned=new Map<string,PartyCharacterV103>();
 for(const row of input.ownedCharacters){
  if(!row||!id(row.accountId)||!id(row.characterId)||
   !Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,row.classId)||owned.has(row.characterId))
   fail('invalid_ownership_source');
  owned.set(row.characterId,row);
 }
 for(const row of [...input.current,...input.proposed]){
  const source=owned.get(row.characterId);
  if(!source||source.accountId!==row.accountId||source.classId!==row.classId)fail('character_not_owned');
 }
 const changed=input.proposed.filter(r=>current.get(r.accountId)!.characterId!==r.characterId);
 if(!changed.length)fail('no_change');
 const approved=new Map<string,PartySwapConsentV103>();
 for(const row of input.consents){
  if(!row||!id(row.accountId)||!id(row.characterId)||
   row.rosterRevision!==input.rosterRevision||approved.has(row.accountId))fail('invalid_consent');
  approved.set(row.accountId,row);
 }
 if(approved.size!==changed.length||changed.some(r=>approved.get(r.accountId)?.characterId!==r.characterId))
  fail('consent_missing_or_mismatched');
 if(input.mode==='dungeon'){
  const roles=input.proposed.map(r=>CLASS_ROLES_V2[r.classId]);
  if(roles.filter(r=>r==='tank').length!==1||roles.filter(r=>r==='damage').length!==2||
   roles.filter(r=>r==='support').length!==1||
   new Set(input.proposed.filter(r=>CLASS_ROLES_V2[r.classId]==='damage').map(r=>r.classId)).size!==2)
   fail('invalid_dungeon_roles');
 }
 const proposedByAccount=new Map(input.proposed.map(r=>[r.accountId,r]));
 return Object.freeze({
  partyId:input.partyId,previousRevision:input.rosterRevision,
  proposedRevision:input.rosterRevision+1,
  roster:Object.freeze(input.current.map(r=>Object.freeze({...proposedByAccount.get(r.accountId)!}))),
  changedAccounts:Object.freeze(changed.map(r=>r.accountId).sort()),
  requiresFreshReadyCheck:true as const,requiresFreshLoadouts:true as const,
  releaseEnabled:false as const,canPersist:false as const,canAuthorizeCombat:false as const,
 });
}
