/** V65 request/protocol fixture; no network, server, or boss fight. */
import {assert} from './test-assert';
import {
 makeWorldBossActionBodyV65,decodeWorldBossActionFeedbackV65,
 WORLD_BOSS_V65_MOBILE_ACTIONS_LIVE,
 type WorldBossActionChoiceV65,
} from '../src/core/world-boss-action-request-v65';

const ID='REQUEST_V65_RETRY_01';
const CHARACTER='20000000-0000-4000-8000-000000000065';
const reject=(input:unknown)=>{
 let bad=false;
 try{makeWorldBossActionBodyV65(input as WorldBossActionChoiceV65);}
 catch{bad=true;}
 assert.ok(bad,'unsafe mobile action must reject');
};
function main(){
 assert.equal(WORLD_BOSS_V65_MOBILE_ACTIONS_LIVE,false);
 const raid:{action:'raid';requestId:string;order:'hold_line'}={
  action:'raid',requestId:ID,order:'hold_line',
 };
 const encoded=makeWorldBossActionBodyV65(raid);
 assert.equal(encoded,JSON.stringify(raid));
 assert.equal(makeWorldBossActionBodyV65(raid),encoded,
  'same idempotency request must encode exactly the same on retry');
 assert.equal(Object.keys(JSON.parse(encoded)).includes('eventId'),false);
 assert.equal(Object.keys(JSON.parse(encoded)).includes('accountId'),false);
 assert.equal(Object.keys(JSON.parse(encoded)).includes('bossId'),false);
 const supply=makeWorldBossActionBodyV65({
  action:'donation',requestId:ID,characterId:CHARACTER,
  recipeId:'T1_FORTIFICATIONS',
 });
 assert.equal(JSON.parse(supply).characterId,CHARACTER);
 assert.equal(JSON.parse(supply).recipeId,'T1_FORTIFICATIONS');
 assert.equal(makeWorldBossActionBodyV65({action:'claim',requestId:ID}),
  JSON.stringify({action:'claim',requestId:ID}));

 reject({...raid,eventId:'30000000-0000-4000-8000-000000000065'});
 reject({...raid,accountId:'10000000-0000-4000-8000-000000000065'});
 reject({...raid,damage:999999});
 reject({...raid,order:'god_mode'});
 reject({action:'claim',requestId:ID,amount:10000});
 reject({action:'claim',requestId:'short'});
 reject(JSON.parse('{"action":"claim","requestId":"'+ID+
  '","__proto__":"unsafe"}'));
 reject({action:'donation',requestId:ID,characterId:CHARACTER,
  recipeId:'T1_FORTIFICATIONS',quantity:900000});
 reject({action:'donation',requestId:ID,characterId:'invalid',
  recipeId:'T1_FORTIFICATIONS'});
 reject(null);

 const accepted=decodeWorldBossActionFeedbackV65(200,{
  status:'accepted',action:'raid',receipt:{status:'reserved',ordinal:1,repeated:false},
 });
 assert.deepEqual(accepted,{kind:'accepted',action:'raid',
  next:'refresh_server_status'});
 assert.equal(decodeWorldBossActionFeedbackV65(200,{
  status:'accepted',action:'raid',receipt:null,
 }).kind,'unavailable');
 assert.equal(decodeWorldBossActionFeedbackV65(200,{
  status:'accepted',action:'malicious',receipt:{},
 }).kind,'unavailable');
 assert.deepEqual(decodeWorldBossActionFeedbackV65(409,{
  error:'action_temporarily_paused',
 }),{kind:'retryable',reason:'action_temporarily_paused',
  next:'retry_same_request_id'});
 assert.equal(decodeWorldBossActionFeedbackV65(503,{
  error:'private stack trace',
 }).kind,'retryable');
 assert.equal(decodeWorldBossActionFeedbackV65(401,{}).kind,'auth_required');
 assert.equal(decodeWorldBossActionFeedbackV65(400,{}).kind,'rejected');
 assert.equal(decodeWorldBossActionFeedbackV65(409,{
  error:'event_action_closed',
 }).kind,'closed');
 assert.equal(decodeWorldBossActionFeedbackV65(409,{
  error:'event_unavailable',
 }).kind,'closed');
 console.log('WORLD_BOSS_V65_HIDDEN_MOBILE_ACTION_RETRY_CONTRACT=PASS');
}
main();
