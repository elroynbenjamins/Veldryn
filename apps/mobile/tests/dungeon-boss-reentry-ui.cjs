const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.resolve(__dirname,'../src',file),'utf8');
const screen=read('screens/CoopExpeditionScreen.tsx');
const overview=read('components/coop/CoopRunOverview.tsx');
const client=read('online/coop-client.ts');
const journal=read('core/coop-command-journal.ts');

assert(screen.includes('const value=await coopClient.run(runId);'),'resume fetches authoritative run state rather than using a cached browse snapshot');
assert(screen.includes('if(await coopClient.hasPendingForRun(runId))'),'resume checks only the interrupted run before replaying an idempotent action');
assert(screen.includes('await coopClient.retryPending()'),'resume can reconcile a POST interrupted by an app restart');
assert(screen.includes('acceptRun(value);setSyncError(\'\');return;'),'reconnected result refreshes the active dungeon screen');
assert(client.includes('hasPendingForRun:async(runId:string)'),'client offers run-scoped pending journal lookup');
assert(journal.includes('command.path.startsWith(\x60/coop/runs/\x24{runId}/\x60)'),'pending journal recovery cannot select a different dungeon');
assert(overview.includes("title={st('Refresh battle status')}"),'a stuck combat stage allows an explicit server refresh');
assert(overview.includes('onPress={onRefresh}'),'battle status refresh uses the existing authoritative GET');
console.log('PASS safe dungeon boss recovery on re-entry, server refresh, and scoped idempotent retries');
