/** Private hidden host mapping from V128 SQL. The SQL result must be loaded
 * for the verified session actor, never accepted from a client request.
 * No database connection, route or production authority in this module.
 */
import {CLASS_ROLES_V2,type ClassIdV2} from '../combat/v2/build-contract';
export const PARTY_RECRUITMENT_CHAT_V128_RELEASED=false;
type Session={readonly accountId:string;readonly partyId:string};
type Status='pending'|'completed'|'declined'|'cancelled'|'expired'|'stale';
type Action='accept'|'decline';
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(v);
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function fail(reason:string):never{throw Error('party_recruit_chat_session_v128_'+reason);}
function gate(qa:boolean){
 if(!qa||PARTY_RECRUITMENT_CHAT_V128_RELEASED||process.env.NODE_ENV==='production')fail('unreleased');
}
export function projectRecruitmentChatCardV128(input:{
 readonly session:Session;readonly sqlProjection:unknown;
 readonly names:Readonly<Record<string,string>>;
 readonly title:string;
 readonly describe:(classId:ClassIdV2,combatLevel:number)=>string;
 readonly snapshotRevision:number;readonly serverNowMs:number;
},qaEnabled=false){
 gate(qaEnabled);
 const {session,sqlProjection:p}=input;
 if(p===null)return null;
 if(!session||!id(session.accountId)||!id(session.partyId)||!record(p)||
  p.viewerAccountId!==session.accountId||p.partyId!==session.partyId||p.kind!=='recruitment_request'||
  p.releaseEnabled!==false||!id(p.id)||!id(p.messageId)||!id(p.applicantAccountId)||
  !rev(p.rosterRevision)||p.sourceRevision!==1||!rev(input.snapshotRevision)||
  !Number.isSafeInteger(input.serverNowMs)||input.serverNowMs<0||
  typeof p.expiresAtMs!=='number'||!Number.isSafeInteger(p.expiresAtMs)||p.expiresAtMs<0||
  typeof p.classId!=='string'||!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,p.classId)||
  CLASS_ROLES_V2[p.classId as ClassIdV2]!==p.role||
  !rev(p.combatLevel)||typeof p.status!=='string'||
  !['pending','completed','declined','cancelled','expired','stale'].includes(p.status)||
  !Array.isArray(p.allowedActions)||
  (p.status==='pending'?(p.allowedActions.length!==2||p.allowedActions[0]!=='accept'||p.allowedActions[1]!=='decline'):
   p.allowedActions.length!==0))
  throw Error('party_recruit_chat_session_v128_invalid_projection');
 const name=Object.prototype.hasOwnProperty.call(input.names,p.applicantAccountId)?input.names[p.applicantAccountId]:undefined;
 if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('party_recruit_chat_session_v128_missing_name');
 const status:Status=p.status==='pending'&&input.serverNowMs>=p.expiresAtMs?'expired':p.status as Status;
 const actions:readonly Action[]=Object.freeze(status==='pending'?['accept','decline']:[]);
 const summary=input.describe(p.classId as ClassIdV2,p.combatLevel);
 const card=Object.freeze({kind:'recruitment_request' as const,id:p.id,partyId:session.partyId,messageId:p.messageId,
  title:input.title,summary,status,expiresAtMs:p.expiresAtMs,allowedActions:actions,applicantName:name});
 return Object.freeze({card,activeSnapshot:Object.freeze({accountId:session.accountId,partyId:session.partyId,
  snapshotRevision:input.snapshotRevision,rosterRevision:p.rosterRevision,serverNowMs:input.serverNowMs,
  requests:Object.freeze(status==='pending'?[Object.freeze({card,sourceRevision:1})]:[])}),
  releaseEnabled:false as const});
}
/** Translate a mobile intent to the existing V128 SQL argument contract.
 * Actor is exclusively from the verified host session. This is not a write. */
export function recruitmentChatSqlArgumentsV128(session:Session,body:unknown,qaEnabled=false){
 gate(qaEnabled);
 if(!session||!id(session.accountId)||!id(session.partyId)||!record(body)||
  Object.keys(body).some(k=>!['requestId','cardId','partyId','messageId','action','rosterRevision','sourceRevision'].includes(k))||
  body.partyId!==session.partyId||!id(body.requestId)||!id(body.cardId)||!id(body.messageId)||
  !rev(body.rosterRevision)||body.sourceRevision!==1||(body.action!=='accept'&&body.action!=='decline'))
  throw Error('party_recruit_chat_session_v128_invalid_intent');
 return Object.freeze({p_actor:session.accountId,p_request_id:body.requestId,p_party:session.partyId,
  p_application:body.cardId,p_message:body.messageId,p_roster_revision:body.rosterRevision,
  p_source_revision:1,p_decision:body.action});
}
