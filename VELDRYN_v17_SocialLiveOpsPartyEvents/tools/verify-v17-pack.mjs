import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(process.argv[2]??path.join(process.cwd(),'..'));
const required=[
 'START_HERE.md','SOCIAL_LIVEOPS_PARTY_EVENTS_V17.md','SETTLEMENT_WIRING_V17.md','CODEX_INSTRUCTIONS.txt',
 'files/backend/src/server/liveops/event-definitions.ts','files/backend/src/server/liveops/contribution-outbox.ts',
 'files/backend/src/server/liveops/party-event-service.ts','files/backend/src/server/liveops/party-event-finalization.ts',
 'files/backend/src/server/liveops/reward-service.ts','files/backend/src/server/liveops/liveops-worker.ts',
 'files/backend/src/server/social/guild-recruitment-service.ts',
 'files/backend/supabase/migrations/20260913_026_social_liveops_party_events_v17.sql',
 'files/apps/mobile/src/components/PartyEventHubPanel.tsx','files/apps/mobile/src/components/PartyEventLeaderboardPanel.tsx',
 'files/apps/mobile/src/components/EventContributionBreakdownPanel.tsx','files/apps/mobile/src/online/social-v17.ts',
 'dependencies/VELDRYN_v16_1_PartiesContractsRecruitment.zip'
];
for(const rel of required){if(!fs.existsSync(path.join(root,rel)))throw new Error(`missing:${rel}`);}
const sql=fs.readFileSync(path.join(root,'files/backend/supabase/migrations/20260913_026_social_liveops_party_events_v17.sql'),'utf8');
for(const needle of ['social_contribution_outbox','liveops_event_rank_snapshots','prevent_overlapping_party_event_windows','prevent_liveops_instance_definition_mutation','liveops_event_party_bindings']){
 if(!sql.includes(needle))throw new Error(`sql_missing:${needle}`);
}
const defs=fs.readFileSync(path.join(root,'files/backend/src/server/liveops/event-definitions.ts'),'utf8');
for(const needle of ['party_event_rift_surge','party_event_sunscar_invasion','party_event_asterfall_reconstruction','party_event_frostmarch_supply_crisis','party_event_blackened_wells','dailyAccountCreditCap: 2400']){
 if(!defs.includes(needle))throw new Error(`definition_missing:${needle}`);
}
const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);const s=fs.statSync(p);if(s.isDirectory())walk(p);else files.push(p);}}
walk(root);
const hashes=[];
for(const f of files.sort()){
 const rel=path.relative(root,f).replaceAll('\\','/');
 if(rel==='verification/checksums.sha256')continue;
 const hash=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 hashes.push(`${hash}  ${rel}`);
}
fs.writeFileSync(path.join(root,'verification/checksums.sha256'),hashes.join('\n')+'\n');
console.log(`v17 pack static audit ok (${files.length} files)`);
