import {buildCoopDecisionIntent,coopRouteProgress,tallyCoopVotes,validateCoopRouteGraphView,validatePersonalOffer} from '../src/core/coop-shared-run';
import {boonOfferFixture,coopRouteFixture,liveDecisionFixture,qDecisionFixture} from '../src/dev/coop-shared-run-fixtures';
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
function throws(work:()=>unknown,pattern:RegExp){let message='';try{work()}catch(error){message=error instanceof Error?error.message:String(error)}if(!pattern.test(message))throw new Error(`Expected ${pattern}, received ${message}`)}
validateCoopRouteGraphView(coopRouteFixture);equal(coopRouteProgress(coopRouteFixture),{completed:2,total:5,bossUnlocked:false});
equal(coopRouteFixture.nodes.filter(node=>node.kind!=='boss'&&node.kind!=='entry').length,15,'fixture must contain five three-option layers');
for(let depth=0;depth<=5;depth++){const next=new Set(coopRouteFixture.nodes.filter(node=>node.depth===depth).flatMap(node=>node.nextNodeIds));equal(depth===5?[...next]:next.size,depth===5?['boss']:3,`depth ${depth} reachability`)}
const last={...coopRouteFixture,completedNodeIds:['d1-a','d2-a','d3-a','d4-a','d5-a']};equal(coopRouteProgress(last).bossUnlocked,true);
equal(tallyCoopVotes(liveDecisionFixture),{'d3-a':2,'d3-b':1,'d3-c':1});equal(tallyCoopVotes(qDecisionFixture),{'d3-a':0,'d3-b':0,'d3-c':0});
const qIntent=buildCoopDecisionIntent(qDecisionFixture,'d3-c','same-request-01');equal(qIntent.kind,'choose');equal(qIntent.requestId,'same-request-01');
equal(buildCoopDecisionIntent(qDecisionFixture,'d3-c','same-request-01'),qIntent,'retry must preserve idempotent command');
throws(()=>tallyCoopVotes({...qDecisionFixture,expiresAt:new Date().toISOString()}),/qmode_live_fields_forbidden/);
throws(()=>tallyCoopVotes({...liveDecisionFixture,votes:[...(liveDecisionFixture.votes??[]),{participantId:'p1',displayName:'You',optionId:'d3-b'}]}),/invalid_vote_projection/);
validatePersonalOffer(boonOfferFixture);throws(()=>validatePersonalOffer({...boonOfferFixture,kind:'camp',options:[{id:'bad',name:'Adjust loadout',rarity:'',effectText:'Edit equipment'}]}),/camp_loadout_edit_forbidden/);
console.log('coop shared run presentation OK');
