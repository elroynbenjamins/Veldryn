const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../apps/mobile'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const card=read('src/components/GuildRaidEncounter.tsx'),stage=read('src/components/GuildRaidTheater.tsx'),parent=read('src/components/OnlineGuildPve.tsx'),locale=read('src/i18n/social.ts');
assert(card.includes('summaryOpen?<GuildRaidTheater')&&!card.includes('<GameModalSurface visible={summaryOpen}'),'Full-screen theater replaces the small summary dialog');
assert(card.includes('onPress={beginAttempt}')&&card.includes('watchAfterStart.current')&&card.includes('previousPending.current'),'Start opens the theater only after confirmed pending state');
assert(card.includes('onPress={openTheater}')&&card.includes('onRefresh={onRefresh}'),'Pending watch and settlement refresh remain available');
assert(card.includes('guildPveActivitySummary')&&card.includes('view.milestones.map'),'Existing boss details and milestone reward claims remain');
assert(parent.includes('guildRaidEncountersForTab(rows,encounterKind)'),'Existing weekly/event boss tab gating remains');
assert(parent.includes('onRefresh={()=>load(true)}'),'Full screen reuses authoritative Guild board polling');
assert(stage.includes('guildPveView(row,now)')&&stage.includes('100-view.percent')&&stage.includes('row.lastAttemptDamage'),'Boss HP and resolved damage are read from server projections');
assert(stage.includes('CombatAttackSprite')&&stage.includes('CombatImpactBurst')&&stage.includes('dungeonCombatClassFx'),'Class and companion ambient attacks are visual only');
assert(stage.includes('pending&&!reduceMotion')&&stage.includes('pending?<View')&&stage.includes('row.lastAttemptDamage!=null'),'Effects only during active raid; numbers shown only after settlement');
assert(!stage.includes('setDamage(')&&!stage.includes('row.damage=')&&!stage.includes('guild_pve_attempt_timeline_v1'),'No fabricated damage, client HP mutation or undeployed timeline RPC');
assert(!stage.includes('DUNGEON_PLAYBACK_SPEEDS')&&!stage.includes('setPlaybackSpeed('),'No speed controls in Guild PvE');
assert(stage.includes('setInterval(refresh,12000)')&&!stage.includes('setInterval(refresh,1000)'),'Overdue resolution refresh is capped at twelve seconds');
for(const key of ['Watch','Visual effects only · server-calculated damage'])assert(locale.includes('"'+key+'":'),'Missing translated Guild raid label: '+key);
const ts=require(path.join(root,'node_modules/typescript'));
for(const f of ['src/components/GuildRaidEncounter.tsx','src/components/GuildRaidTheater.tsx','src/components/OnlineGuildPve.tsx']){
 const diagnostics=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).diagnostics??[];
 assert.equal(diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,f+': '+diagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')));
}
console.log('PASS: Guild PvE fullscreen, 3-minute server timer, cosmetic attacks, confirmed HP and unchanged rewards');
