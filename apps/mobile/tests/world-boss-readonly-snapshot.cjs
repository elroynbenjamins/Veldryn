/* V46 hidden World Boss snapshot: runtime and UI anti-forgery checks. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const js=ts.transpileModule(read('src/core/world-boss-readonly-snapshot.ts'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
}).outputText;
const exportsV46={};
new Function('exports',js)(exportsV46);
const {decodeWorldBossReadOnlyStatusV46:decode,WORLD_BOSS_MOBILE_RELEASED:released}=exportsV46;

const presentationJs=ts.transpileModule(read('src/core/world-boss-presentation.ts'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
}).outputText;
const presentationExports={};
new Function('exports',presentationJs)(presentationExports);
const {WORLD_BOSS_PRESENTATION,worldBossPresentationFor,worldBossReplayActorDisplayName}=presentationExports;
test('proper boss names are distinct from stable region/protocol IDs',()=>{
 assert.deepEqual(Object.keys(WORLD_BOSS_PRESENTATION).sort(),['frostmarch','hollowroot','sunscar']);
 assert.equal(worldBossPresentationFor('hollowroot')?.name,'Hollowroot');
 assert.equal(worldBossPresentationFor('sunscar')?.name,'Solbrand');
 assert.equal(worldBossPresentationFor('sunscar')?.region,'Sunscar');
 assert.equal(worldBossPresentationFor('frostmarch')?.name,'Rimewarden');
 assert.equal(worldBossPresentationFor('frostmarch')?.region,'Frostmarch');
 assert.equal(worldBossReplayActorDisplayName('HOLLOWROOT'),'Hollowroot');
 assert.equal(worldBossReplayActorDisplayName('SUNSCAR'),'Solbrand');
 assert.equal(worldBossReplayActorDisplayName('FROSTMARCH'),'Rimewarden');
 assert.equal(worldBossReplayActorDisplayName('sunscar'),null);
 assert.equal(worldBossReplayActorDisplayName('constructor'),null);
 assert.equal(worldBossReplayActorDisplayName('PLAYER_CHARACTER_1'),null);
 for(const value of [null,undefined,'Sunscar','Frostmarch','constructor','__proto__',{},0]){
  assert.equal(worldBossPresentationFor(value),null);
 }
});

const EVENT='30000000-0000-4000-8000-000000000046';
const ACCOUNT='10000000-0000-4000-8000-000000000046';
const OTHER='10000000-0000-4000-8000-000000000047';
const DAY=86400000,START=Date.UTC(2026,10,16),NOW=START+DAY+3600000;
const fresh=()=>({
 schema:'world-boss-overview-v41',accountId:ACCOUNT,eventId:EVENT,
 bossId:'hollowroot',status:'active',phase:'preparation',
 startsAtUtcMs:START,endsAtUtcMs:START+7*DAY,readAtUtcMs:NOW,
 maxHp:100000,remainingHp:75000,eventRevision:2,
 attemptsUsed:1,attemptsReserved:0,attemptsCommitted:1,
 donationsUsed:1,
 warCamp:{eventId:EVENT,revision:2,
  contributions:{fortifications:1,fieldProvisions:1,siegecraft:0},
  goals:{fortifications:{tier1At:1,tier2At:3},
   fieldProvisions:{tier1At:1,tier2At:3},
   siegecraft:{tier1At:1,tier2At:3}},
  frozen:false,snapshot:null},
 rewards:{balance:0,walletRevision:2,claimedThisEvent:5,eventCap:100},
});
const parse=(raw=fresh(),who=ACCOUNT,now=NOW)=>decode(raw,who,now);
test('V46 release off, valid private v41 read-only projection and spent wallet',()=>{
 assert.equal(released,false);
 const snap=parse();
 assert.ok(snap);
 assert.equal(snap.phase,'preparation');
 assert.equal(snap.startsAtUtcMs,START);
 assert.equal(snap.endsAtUtcMs,START+7*DAY);
 assert.equal(snap.attemptsRemaining,2);
 assert.equal(snap.donationsRemaining,1);
 assert.equal(snap.rewards.balance,0);
 assert.equal(snap.rewards.claimedThisEvent,5);
});
test('owner isolation, schema, stale/future packet and UTC cycle must fail closed',()=>{
 assert.equal(parse(fresh(),OTHER),null);
 assert.equal(parse(fresh(),''),null);
 assert.equal(parse({...fresh(),schema:'wrong'}),null);
 assert.equal(parse(fresh(),ACCOUNT,NOW+120001),null);
 assert.equal(parse(fresh(),ACCOUNT,NOW-30001),null);
 assert.equal(parse({...fresh(),startsAtUtcMs:START+3600000}),null);
 assert.equal(parse({...fresh(),phase:'raid'}),null);
 assert.equal(parse({...fresh(),endsAtUtcMs:START+8*DAY}),null);
 assert.equal(parse({...fresh(),readAtUtcMs:NaN}),null);
});
test('V60: a valid leased read cannot display an obsolete UTC phase',()=>{
 const cutoff=START+5*DAY;
 const before={...fresh(),readAtUtcMs:cutoff-50};
 assert.equal(parse(before,ACCOUNT,cutoff-1)?.phase,'preparation');
 assert.equal(parse(before,ACCOUNT,cutoff),null);
 assert.equal(parse(before,ACCOUNT,cutoff+50),null);
 // The previous cycle must also be rejected rather than appearing active
 // for 120 seconds after the next global boss rotation begins.
 const cooldown={...fresh(),phase:'cooldown',
  readAtUtcMs:START+14*DAY-50};
 assert.equal(parse(cooldown,ACCOUNT,START+14*DAY-1)?.phase,'cooldown');
 assert.equal(parse(cooldown,ACCOUNT,START+14*DAY),null);
});
test('contributions, attempts, HP, and rewards cannot be fabricated',()=>{
 assert.equal(parse({...fresh(),attemptsUsed:3}),null);
 assert.equal(parse({...fresh(),donationsUsed:3}),null);
 assert.equal(parse({...fresh(),remainingHp:100001}),null);
 assert.equal(parse({...fresh(),rewards:{...fresh().rewards,claimedThisEvent:101}}),null);
 assert.equal(parse({...fresh(),warCamp:{...fresh().warCamp,revision:10}}),null);
 assert.equal(parse({...fresh(),warCamp:{...fresh().warCamp,contributions:{
  ...fresh().warCamp.contributions,siegecraft:-1}}}),null);
});
test('verified-format Saturday raid data is informative, not action-authorizing',()=>{
 const battle=fresh();
 battle.phase='raid';battle.readAtUtcMs=START+5*DAY;
 const frozen={version:'world-boss-war-camp-v11',eventId:EVENT,revision:2,
  digest:'a'.repeat(64),levels:{fortifications:1,fieldProvisions:1,siegecraft:0}};
 battle.warCamp.frozen=true;battle.warCamp.snapshot=frozen;
 const status=parse(battle,ACCOUNT,battle.readAtUtcMs);
 assert.ok(status);
 assert.equal(status.warCamp.frozen,true);
 assert.equal(status.attemptsRemaining,2);
 battle.warCamp.snapshot={...frozen,levels:{...frozen.levels,siegecraft:2}};
 assert.equal(parse(battle,ACCOUNT,battle.readAtUtcMs),null);
});
test('FeaturePreviewScreen consumes optional QA-only props, never creates a live route',()=>{
 const screen=read('src/screens/FeaturePreviewScreen.tsx');
 const app=read('App.tsx');
 assert.match(screen,/decodeWorldBossReadOnlyStatusV46\(displayBossStatus,worldBossAccountId,statusNowMs\)/);
 assert.match(screen,/PRIVATE READ-ONLY SNAPSHOT/);
 assert.match(screen,/worldBossReadCurrent\?:\(\)=>Promise<unknown>/);
 assert.match(screen,/loadedBoss\?\.accountId===worldBossAccountId/);
 assert.match(screen,/Promise\.resolve\(\)\.then\(\(\)=>worldBossReadCurrent\(\)\)/);
 assert.match(screen,/return \(\)=>\{alive=false;clearInterval\(refreshTimer\)\}/);
 assert.match(screen,/setLoadedBoss\(null\);setBossReadState\('error'\)/);
 assert.match(screen,/Refresh read-only status/);
 assert.match(screen,/World Boss status expired or rejected/);
 assert.doesNotMatch(app,/worldBossReadCurrent=\{/);
 assert.match(screen,/leaseTimer=setInterval\(\(\)=>setStatusNowMs\(Date.now\(\)\),15000\)/);
 assert.match(screen,/clearInterval\(leaseTimer\)/);
 assert.match(screen,/No verified War Camp progress/);
 assert.match(screen,/Projected'\)\+' tier '/);
 assert.match(screen,/Already claimed this event/);
 assert.match(screen,/Current spendable wallet/);
 assert.doesNotMatch(screen,/EXAMPLE WAR SUPPLY METER|value=\{65\}/);
 assert.match(screen,/No verified World Boss loaded/);
 assert.match(screen,/active\.warCamp\.contributions\[track\]/);
 assert.match(screen,/active\.rewards\.claimedThisEvent/);
 assert.match(screen,/Begin account raid · Not available" s=\{s\} disabled/);
 assert.match(screen,/Claim rewards · Not available" s=\{s\} disabled/);
 assert.match(screen,/Donate supplies · Awaiting server" s=\{s\} disabled/);
 assert.doesNotMatch(app,/worldBossStatus=\{/);
 assert.doesNotMatch(app,/worldBossAccountId=\{/);
 assert.doesNotMatch(screen,/supabase\.(rpc|from)|donateAuthenticatedWorldBoss|claimAuthenticatedWorldBoss|reserveAuthenticatedWorldBoss/);
});
