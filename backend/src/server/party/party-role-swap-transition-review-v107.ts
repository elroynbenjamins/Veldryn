/** Private pure role-swap response planner. Caller must lock and load all
 * records in one transaction. Never applies to live Party state.
 */
import {CLASS_ROLES_V2} from '../combat/v2/build-contract';
import {reviewPartyCharacterSwapV103,type PartyCharacterV103} from './party-roster-character-swap-review-v103';
import {projectPartySwapChatV104,type PartySwapChatProposalV104} from './party-role-swap-chat-review-v104';
export const PARTY_SWAP_TRANSITION_V107_RELEASED=false;
type Scope=Parameters<typeof projectPartySwapChatV104>[0];
export function planPartyRoleSwapResponseV107(input:{
 readonly scope:Scope;
 readonly response:'accept'|'decline';
 readonly current:readonly PartyCharacterV103[];
 readonly ownedCharacters:readonly PartyCharacterV103[];
 readonly minimumLevel:number;
 readonly phase:'lobby'|'ready_check'|'committed_run'|'event_frozen';
},qaEnabled=false){
 if(!qaEnabled||PARTY_SWAP_TRANSITION_V107_RELEASED||process.env.NODE_ENV==='production')
  throw Error('party_swap_transition_v107_unreleased');
 const {scope,response,current,ownedCharacters}=input;
 const p=scope.proposal;
 const view=projectPartySwapChatV104(scope,true);
 if(!((response==='accept'&&view.showAccept)||(response==='decline'&&view.showDecline)))
  throw Error('party_swap_transition_v107_response_not_allowed');
 if(!Array.isArray(current)||!Array.isArray(ownedCharacters)||
  current.length!==scope.activeAccountIds.length||
  new Set(current.map(x=>x.accountId)).size!==current.length||
  current.some(x=>!scope.activeAccountIds.includes(x.accountId)))
  throw Error('party_swap_transition_v107_roster_mismatch');
 const ownedRows:readonly PartyCharacterV103[]=ownedCharacters;
 const currentRows:readonly PartyCharacterV103[]=current;
 const byAccount=new Map(currentRows.map(x=>[x.accountId,x]));
 const owned=new Map(ownedRows.map(x=>[x.characterId,x]));
 if(owned.size!==ownedRows.length)throw Error('party_swap_transition_v107_duplicate_owned');
 const proposedByAccount=new Map<string,PartyCharacterV103>();
 for(const member of p.members){
  const before=byAccount.get(member.accountId),after=owned.get(member.toCharacterId);
  if(!before||before.characterId!==member.fromCharacterId||
   CLASS_ROLES_V2[before.classId]!==member.fromRole||
   !after||after.accountId!==member.accountId||CLASS_ROLES_V2[after.classId]!==member.toRole)
   throw Error('party_swap_transition_v107_character_mismatch');
  proposedByAccount.set(member.accountId,after);
 }
 const proposed=currentRows.map(x=>proposedByAccount.get(x.accountId)??x);
 // Validate the entire candidate now, not only after the last response.
 // Synthetic full consent here checks structure ONLY. It is not persisted
 // or exposed as real consent; actual acceptance is handled below.
 const candidate=reviewPartyCharacterSwapV103({
  partyId:p.partyId,mode:'persistent_party',proposalId:p.proposalId,
  minimumLevel:input.minimumLevel,phase:input.phase,
  rosterRevision:scope.rosterRevision,expectedRevision:p.rosterRevision,
  current:currentRows,proposed,ownedCharacters:ownedRows,
  consents:p.members.map(m=>({accountId:m.accountId,characterId:m.toCharacterId,
   rosterRevision:p.rosterRevision,partyId:p.partyId,proposalId:p.proposalId})),
 },true);
 const members=p.members.map(m=>({...m,accepted:m.accepted||
  (response==='accept'&&m.accountId===scope.viewerAccountId)}));
 const complete=response==='accept'&&members.every(m=>m.accepted);
 const proposal:PartySwapChatProposalV104={...p,members,
  state:response==='decline'?'declined':complete?'completed':'pending',
  ...(complete?{committedRevision:candidate.proposedRevision}:{})};
 return Object.freeze({
  proposal:Object.freeze({...proposal,members:Object.freeze(members.map(m=>Object.freeze(m)))}),
  // Only final unanimous acceptance produces a candidate roster mutation.
  roster:complete?candidate.roster:null,
  proposedRevision:complete?candidate.proposedRevision:scope.rosterRevision,
  refreshRoster:complete,releaseEnabled:false as const,canPersist:false as const,
 });
}
