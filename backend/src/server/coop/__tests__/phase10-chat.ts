import { strict as assert } from 'node:assert';
import type { ChatRepository, SendChatInput } from '../../chat/send-message';
import { PartyChatAuthorizer } from '../party-chat';
const messages:Array<SendChatInput&{body:string}>=[];
const repository:ChatRepository={isMuted:async()=>({muted:false}),canAccessChannel:async()=>true,getRateLimitState:async()=>({messagesLast10Seconds:0,messagesLast60Seconds:0,duplicateMessagesLast60Seconds:0,accountAgeMinutes:100}),getFilterRules:async()=>[],getAllowlist:async()=>[],insertMessage:async input=>{messages.push(input);return{id:`m${messages.length}`,createdAt:'now'};},logModeration:async()=>{},addStrikePoints:async()=>{}};
async function main(){
 const live=new PartyChatAuthorizer({partyId:'run-live',mode:'live',channelEpoch:1,activeAccountIds:['a','b']});const oldChannel=live.channelId();assert.equal((await live.send(repository,'a','Ready')).ok,true);live.remove('b');assert.equal(live.canAccess('b',oldChannel),false);assert.equal(live.channelId(),'run-live:2');assert.equal((await live.send(repository,'b','still here')).ok,false);
 const qmode=new PartyChatAuthorizer({partyId:'run-q',mode:'qmode',channelEpoch:1,activeAccountIds:['a']});assert.equal((await qmode.send(repository,'a','hello')).ok,false);assert.equal(messages.length,1);console.log('coop phase10 chat OK');
}
void main().catch(error=>{console.error(error);throw error;});
