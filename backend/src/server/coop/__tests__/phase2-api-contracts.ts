import { strict as assert } from 'node:assert';
import { parseCoopChatCommand, parseCoopDecisionCommand, parseCoopReadyCommand, parseCoopRunRequest } from '../api-contracts';

function error(action:()=>unknown):string{try{action();}catch(reason){return reason instanceof Error?reason.message:String(reason);}return '';}
const start=parseCoopRunRequest({requestId:'request-123',dungeonId:'EXP_001',tier:1,characterId:'char-1',loadoutId:'load-1',loadoutRevision:7},'qmode');
assert.equal(start.mode,'qmode');assert.equal(start.characterId,'char-1');
assert.equal(error(()=>parseCoopRunRequest({...start,role:'tank'},'live')),'client_role_forbidden');
assert.equal(error(()=>parseCoopRunRequest({requestId:'request-123',dungeonId:'EXP_001',tier:1,loadoutId:'load-1',loadoutRevision:7},'live')),'invalid_characterId');
assert.deepEqual(parseCoopDecisionCommand({requestId:'request-456',decisionId:'decision-1',decisionRevision:2,optionId:'d2-c1'}),{requestId:'request-456',decisionId:'decision-1',decisionRevision:2,optionId:'d2-c1'});
assert.deepEqual(parseCoopReadyCommand({requestId:'request-789',rosterRevision:3,accept:true}),{requestId:'request-789',rosterRevision:3,accept:true});
assert.equal(parseCoopChatCommand({requestId:'request-chat',text:'Ready'}).text,'Ready');
assert.equal(error(()=>parseCoopChatCommand({requestId:'request-chat',text:'x'.repeat(301)})),'invalid_text');
console.log('coop phase2 API contracts OK');
