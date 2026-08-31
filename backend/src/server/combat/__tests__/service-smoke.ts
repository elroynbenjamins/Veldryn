import { resolveExpeditionCombat } from '../expedition-combat-service';
import { launchPlayer } from '../content/launch-combat';
const input={runId:'00000000-0000-0000-0000-000000000003',nodeIndex:7,encounterId:'ROOTBOUND_BOSS',serverSeed:'server-secret-test',players:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(c=>launchPlayer(c,25))};
const a=resolveExpeditionCombat(input); const b=resolveExpeditionCombat(input);
if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error('service_not_deterministic');
if(!a.resultJson.eventDigest || a.resultJson.eventCount<1) throw new Error('invalid_commit_payload');
console.log(JSON.stringify({success:a.success,durationMs:a.resultJson.durationMs,eventCount:a.resultJson.eventCount,eventDigest:a.resultJson.eventDigest.slice(0,16),downs:a.resultJson.downs},null,2));
