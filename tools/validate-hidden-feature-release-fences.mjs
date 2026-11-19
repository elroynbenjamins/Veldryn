#!/usr/bin/env node
/**
 * Fail-closed merge fence for Veldryn systems that have development foundations
 * on main but are not approved for public activation. Zero external packages.
 *
 * This guards against accidental release in routine consolidation. An actual
 * launch must deliberately update these assertions along with release approval,
 * staged schema/Edge deployment, device QA, and rollback evidence.
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  flags:'apps/mobile/src/core/release-flags.ts',
  crafting2Gate:'backend/src/server/equipment/equipment-crafting-v2-gate.ts',
  gameplay:'backend/online/gameplay.ts',
  routes:'apps/mobile/src/core/feature-hub-routes.ts',
  app:'apps/mobile/App.tsx',
  worldRead:'backend/online/world-boss-current-read-route-v52.ts',
  worldErasure:'backend/online/world-boss-account-erasure-v56.ts',
  partyRead:'backend/online/party-event-read-route-v39.ts',
  guildProof:'backend/src/server/combat/guild-pve-reward-proof-v14.ts',
};
const realRead=(p)=>readFileSync(resolve(root,p),'utf8');
const migrationDir='backend/supabase/migrations';
const realMigrations=()=>readdirSync(resolve(root,migrationDir));

function check(read,migrations){
  const failures=[];
  const loaded=new Map();
  for(const [key,path] of Object.entries(paths)){
    try{loaded.set(key,read(path));}
    catch{failures.push('Missing release fence source: '+path);}
  }
  const source=(key)=>loaded.get(key)??'';
  const requireExportFalse=(key,name)=>{
    const re=new RegExp('(?:^|\\n)\\s*export\\s+const\\s+'+name+'\\s*=\\s*false(?:\\s+as\\s+const)?\\s*;','m');
    if(!re.test(source(key)))failures.push(name+' must be explicitly exported as false');
  };
  for(const name of ['RANKINGS_RELEASED','PLAYER_MARKET_RELEASED','MARKET_AUTHENTICATED_SERVICE_READY','EQUIPMENT_CRAFTING_V2_RELEASED'])
    requireExportFalse('flags',name);
  requireExportFalse('crafting2Gate','EQUIPMENT_CRAFTING_V2_SERVER_RELEASED');
  if(/(?:runEquipmentV2(?:Gem)?InGameState|simulateEquipmentV2(?:Gem)?InGameState|proposeEquipmentV2ClaimCustody|reserveEquipmentV2HiddenClaim|verifyEquipmentV2HiddenLedger|equipment_crafting_v2_gameplay|equipment-crafting-v2-(?:delivery|game-state|gem-sidecar|storage-reservations))/i.test(source('gameplay')))
    failures.push('Hidden Equipment/Crafting V2 must not be mounted in online gameplay before coordinated release');
  requireExportFalse('worldRead','WORLD_BOSS_V52_READ_ROUTE_LIVE');
  requireExportFalse('worldErasure','WORLD_BOSS_V56_ERASURE_LIVE');
  requireExportFalse('partyRead','PARTY_EVENT_READ_ROUTE_V39_MOUNTED');
  requireExportFalse('guildProof','GUILD_PVE_V14_LIVE');

  if(!/export\s+const\s+FEATURE_HUB_QA_ENABLED\s*=\s*typeof\s+__DEV__\s*!==\s*['"]undefined['"]\s*&&\s*__DEV__\s*===\s*true\s*;/.test(source('routes')))
    failures.push('Feature hub preview navigation must remain __DEV__ only');
  const app=source('app');
  if(!/if\s*\(\s*isFeatureHubPreviewRoute\(destination\)\s*&&\s*!FEATURE_HUB_QA_ENABLED\s*\)\s*return\s*;/.test(app))
    failures.push('Feature hub navigation must reject non-QA routes');
  if(!/\{\s*FEATURE_HUB_QA_ENABLED\s*&&\s*isFeatureHubPreviewRoute\(tab\)\s*&&\s*<FeaturePreviewScreen\b/.test(app))
    failures.push('FeaturePreviewScreen render must retain the QA and route guards');
  const component=app.match(/<FeaturePreviewScreen\b([\s\S]*?)\/>/);
  if(!component)failures.push('FeaturePreviewScreen usage missing');
  else if(/\{\s*\.\.\./.test(component[1])||/\b(?:partyEventReadCurrent|partyEventAccountId|partyEventStatus|worldBossReadCurrent|worldBossAccountId|worldBossStatus)\s*=/.test(component[1]))
    failures.push('Live provider/account/status props must not be bound to hidden feature previews');

  if(!/if\s*\(\s*!\s*WORLD_BOSS_V56_ERASURE_LIVE\s*\)/.test(source('worldErasure'))||
     !/throw\s+Error\(['"]world_boss_v56_runtime_disabled['"]\)/.test(source('worldErasure')))
    failures.push('World Boss account erasure must fail closed before execution');
  if(!/canClaim\s*:\s*false\s*,\s*proposedTokenAmount\s*:\s*null/.test(source('guildProof')))
    failures.push('Guild PvE entitlement proof must remain nonpaying');

  // These draft migration vintages were reviewed as documentation/rollback-only.
  // Never silently promote them to the executable Supabase migrations directory.
  if(migrations.some(name=>/^202611(?:13|15)\d{6}_party_event_/i.test(name)))
    failures.push('Hidden Party Event migrations must not be executable');
  if(migrations.some(name=>/^202611(?:17|18)\d{6}_world_boss_/i.test(name)))
    failures.push('Hidden World Boss migrations must not be executable');
  return failures;
}

function selfTest(){
  const fixtures=new Map(Object.values(paths).map(path=>[path,realRead(path)]));
  const read=(p)=>fixtures.get(p);
  const migrations=realMigrations();
  assert.deepEqual(check(read,migrations),[],'Current main must pass baseline guard');
  const mutations=[
    ['rankings-release',paths.flags,'RANKINGS_RELEASED=false','RANKINGS_RELEASED=true'],
    ['equipment2-client-release',paths.flags,'EQUIPMENT_CRAFTING_V2_RELEASED=false','EQUIPMENT_CRAFTING_V2_RELEASED=true'],
    ['equipment2-server-release',paths.crafting2Gate,'EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false','EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=true'],
    ['market-auth-release',paths.flags,'MARKET_AUTHENTICATED_SERVICE_READY=false','MARKET_AUTHENTICATED_SERVICE_READY=true'],
    ['preview-release',paths.routes,"typeof __DEV__!=='undefined'&&__DEV__===true",'true'],
    ['erasure-release',paths.worldErasure,'WORLD_BOSS_V56_ERASURE_LIVE=false','WORLD_BOSS_V56_ERASURE_LIVE=true'],
    ['read-endpoint-release',paths.worldRead,'WORLD_BOSS_V52_READ_ROUTE_LIVE=false','WORLD_BOSS_V52_READ_ROUTE_LIVE=true'],
    ['guild-claim-release',paths.guildProof,'canClaim:false,proposedTokenAmount:null','canClaim:true,proposedTokenAmount:5'],
    ['provider-wiring',paths.app,'<FeaturePreviewScreen key={tab}','<FeaturePreviewScreen worldBossReadCurrent={readWorldBoss} key={tab}'],
    ['spread-wiring',paths.app,'<FeaturePreviewScreen key={tab}','<FeaturePreviewScreen {...provider} key={tab}'],
    ['preview-nav-bypass',paths.app,'if(isFeatureHubPreviewRoute(destination)&&!FEATURE_HUB_QA_ENABLED)return;','if(isFeatureHubPreviewRoute(destination))return;'],
    ['craft-bridge-mount',paths.gameplay,"import {executeGameCommand,validateGameCommand}", "import {runEquipmentV2InGameState} from '../src/server/equipment/equipment-crafting-v2-game-state';\nimport {executeGameCommand,validateGameCommand}"],
    ['craft-custody-mount',paths.gameplay,"import {executeGameCommand,validateGameCommand}", "import {proposeEquipmentV2ClaimCustody} from '../src/server/equipment/equipment-crafting-v2-delivery';\nimport {executeGameCommand,validateGameCommand}"],
    ['craft-gem-mount',paths.gameplay,"import {executeGameCommand,validateGameCommand}", "import {simulateEquipmentV2GemInGameState} from '../src/server/equipment/equipment-crafting-v2-gem-sidecar';\nimport {executeGameCommand,validateGameCommand}"],
  ];
  for(const [label,path,before,after] of mutations){
    const original=fixtures.get(path);
    assert.ok(original.includes(before),'Missing expected mutation anchor: '+label);
    fixtures.set(path,original.replace(before,after));
    assert.ok(check(read,migrations).length>0,'Guard did not detect: '+label);
    fixtures.set(path,original);
  }
  assert.ok(check(read,[...migrations,'20261113041500_party_event_receipt_ledger_v11.sql']).length>0,
    'Guard did not detect Party Event migration promotion');
  assert.ok(check(read,[...migrations,'20261118140000_world_boss_public_raid.sql']).length>0,
    'Guard did not detect World Boss migration promotion');
  console.log('PASS: hidden feature fence detects sixteen unsafe release regressions plus baseline');
}
const failures=check(realRead,realMigrations());
if(failures.length){
  for(const problem of failures)console.error('HIDDEN RELEASE FENCE: '+problem);
  process.exitCode=1;
}else{
  console.log('PASS: Equipment/Crafting 2.0, World Boss, Party Events, Guild PvE, Rankings and Market remain release-disabled');
  if(process.argv.includes('--self-test'))selfTest();
}
