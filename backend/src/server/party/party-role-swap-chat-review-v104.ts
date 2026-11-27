/** Hidden review: server-owned chat card projection, not a command handler.
 * Only private persisted proposal/consent records and canonical chat linkage
 * may enter this function. User message bodies are never parsed as actions.
 */
import type {RoleV2} from '../combat/v2/build-contract';
export const PARTY_SWAP_CHAT_V104_RELEASED=false;
export const PARTY_SWAP_REQUEST_TTL_MS=300_000;
export interface PartySwapChatProposalV104{
 readonly proposalId:string;readonly partyId:string;readonly messageId:string;
 readonly rosterRevision:number;readonly createdAtMs:number;
 readonly state:'pending'|'completed'|'declined'|'cancelled'|'expired';
 readonly members:readonly {accountId:string;fromRole:RoleV2;toRole:RoleV2;
  fromCharacterId:string;toCharacterId:string;accepted:boolean}[];
 readonly committedRevision?:number;
}
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const roles:readonly RoleV2[]=['tank','damage','support'];
function fail(reason:string):never{throw Error('party_swap_chat_v104_'+reason);}
export function projectPartySwapChatV104(input:{
 readonly proposal:PartySwapChatProposalV104;
 readonly message:{id:string;partyId:string;accountId:string|null;isSystem:boolean};
 readonly viewerAccountId:string;
 readonly activePartyId:string;
 readonly activeAccountIds:readonly string[];
 readonly rosterRevision:number;
 readonly serverNowMs:number;
},qaEnabled=false){
 if(!qaEnabled||PARTY_SWAP_CHAT_V104_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
 const {proposal:p,message:m,viewerAccountId:viewer,activeAccountIds:active,serverNowMs:now}=input;
 if(!p||!m||!validId(p.proposalId)||!validId(p.partyId)||!validId(p.messageId)||
  m.id!==p.messageId||m.partyId!==p.partyId||m.isSystem!==true||m.accountId!==null||
  input.activePartyId!==p.partyId||!validId(viewer)||!Array.isArray(active)||
  active.length<1||active.length>4||!active.every(validId)||new Set(active).size!==active.length||
  !active.includes(viewer))fail('chat_scope_mismatch');
 if(!Number.isSafeInteger(p.rosterRevision)||p.rosterRevision<1||
  !Number.isSafeInteger(input.rosterRevision)||input.rosterRevision<p.rosterRevision||
  !Number.isSafeInteger(p.createdAtMs)||p.createdAtMs<0||
  p.createdAtMs>Number.MAX_SAFE_INTEGER-PARTY_SWAP_REQUEST_TTL_MS||
  !Number.isSafeInteger(now)||now<p.createdAtMs||
  !['pending','completed','declined','cancelled','expired'].includes(p.state)||
  !Array.isArray(p.members)||p.members.length<2||p.members.length>4)fail('invalid_proposal');
 const members:PartySwapChatProposalV104['members']=p.members;
 const ids=new Set<string>(),oldChars=new Set<string>(),newChars=new Set<string>();
 for(const member of members){
  if(!member||!validId(member.accountId)||!validId(member.fromCharacterId)||!validId(member.toCharacterId)||
   !roles.includes(member.fromRole)||!roles.includes(member.toRole)||member.fromRole===member.toRole||
   member.fromCharacterId===member.toCharacterId||typeof member.accepted!=='boolean'||
   ids.has(member.accountId)||oldChars.has(member.fromCharacterId)||newChars.has(member.toCharacterId))fail('invalid_member');
  ids.add(member.accountId);oldChars.add(member.fromCharacterId);newChars.add(member.toCharacterId);
 }
 if([...oldChars].some(id=>newChars.has(id))||
  members.map(x=>x.fromRole).sort().join(',')!==members.map(x=>x.toRole).sort().join(','))fail('invalid_role_exchange');
 if(p.state==='completed'&&(!members.every(x=>x.accepted)||
  p.committedRevision!==p.rosterRevision+1||input.rosterRevision<p.committedRevision))fail('missing_completion_evidence');
 if(p.state!=='completed'&&p.committedRevision!==undefined)fail('unexpected_completion_evidence');
 const expiresAtMs=p.createdAtMs+PARTY_SWAP_REQUEST_TTL_MS;
 const stale=input.rosterRevision!==p.rosterRevision||members.some(x=>!active.includes(x.accountId));
 const status=p.state==='pending'?(now>=expiresAtMs?'expired':stale?'stale':'pending'):p.state;
 const mine=members.find(x=>x.accountId===viewer);
 const canRespond=status==='pending'&&!!mine&&!mine.accepted;
 return Object.freeze({
  kind:'party_role_swap_review_v104' as const,partyId:p.partyId,proposalId:p.proposalId,messageId:p.messageId,
  rosterRevision:p.rosterRevision,status,expiresAtMs,
  members:Object.freeze(members.map(x=>Object.freeze({accountId:x.accountId,fromRole:x.fromRole,toRole:x.toRole,accepted:x.accepted}))),
  acceptedCount:members.filter(x=>x.accepted).length,requiredCount:members.length,
  showAccept:canRespond,showDecline:canRespond,
  // Even an accepted participant may see progress; no action is executable here.
  releaseEnabled:false as const,canExecute:false as const,canPersist:false as const,
 });
}
