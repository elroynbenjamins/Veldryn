const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');
const fx = read('src/components/GuildRaidCombatFx.tsx');
const screen = read('src/components/GuildRaidEncounter.tsx');
const theater = read('src/components/GuildRaidTheater.tsx');
const board = read('src/components/OnlineGuildPve.tsx');
const app = read('App.tsx');
const reader = read('src/online/guild-pve-read.ts');
const guild = read('src/screens/GuildScreen.tsx');
const classFx = read('src/core/dungeon-combat-fx.ts');
const timeline = read('src/core/guild-pve-attempt-timeline.ts');
const sql = read('../../backend/supabase/migrations/20261104000001_guild_pve_attempt_timeline_v1.sql');
const rpc = read('src/online/social.ts');

assert.ok(fx.includes('dungeonCombatClassFx(classId)'), 'Guild visual attacks must reuse canonical class-specific combat effects');
for (const classId of ['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER']) {
 assert.ok(classFx.includes(classId+':{classId:'), 'Existing class combat FX must cover '+classId);
}
assert.ok(fx.includes('useNativeDriver:true') && !fx.includes('Animated.loop('), 'Raid attacks should animate only when a server-timed cue is active, not repeat indefinitely');
assert.ok(fx.includes('if(!active||reduceMotion||!hit)return'), 'Raid effects must stop unless a valid server-timed hit is active');
assert.ok(fx.includes('companionEquipped?') && fx.includes('companionStrike'), 'Equipped companion must display a distinct assist effect');
assert.ok(theater.includes('animating=pending&&!overdue&&foreground&&!reduceMotion'), 'Cosmetic VFX must stop during settlement, background or reduced motion');
assert.ok(theater.includes('Boolean(companionArt)&&pulse%3===2'), 'Companion attacks must be based on equipped companion art');
assert.ok(theater.includes('guildPveView(row,now)') && theater.includes('100-view.percent'), 'Raid bar must bind to authoritative server HP');
assert.ok(fx.includes('width:fill.interpolate('), 'Boss HP fill must be based on the server-confirmed percentage');
assert.ok(fx.includes('previousDamage.current!==damage'), 'Confirmed server damage must produce visual confirmation');
assert.ok(!fx.includes('setDamage(') && !fx.includes('row.damage='), 'Visual attacks must never fake or mutate boss damage');
assert.ok(theater.includes('pending&&remaining===0') && theater.includes('if(currentRefresh.current)void currentRefresh.current()') && !theater.includes('setInterval(refresh,12000)'), 'Overdue theater attempts should refresh without high-frequency polling');
assert.ok(board.includes('nextResolution-Date.now()') && board.includes('setInterval(refresh,12000)') && board.includes('onRefresh={()=>load(true)}'), 'Board must recover settlement even with theater closed');
assert.ok(board.includes('const receipt=await attemptGuildPve(id,key)') && board.includes('validRaidStartReceipt(receipt)') && board.includes('confirmedStarts.current[id]=receipt') && board.includes('retryKeys.confirm(scope,id,key)') && board.includes('confirmedClaims.current[id]'), 'Only server-confirmed writes may update pending attempt and claim display');
assert.ok(board.includes('expected===revision.current') && board.includes('reading.current'), 'Stale background reads must not overwrite confirmed writes');
assert.ok(screen.includes('function RaidCountdown') && screen.includes('setInterval(tick,30000)'), 'Second ticks must not invalidate the whole card');
assert.ok(app.includes("tab==='Guild'&&(guildEventPageOpen||guildInitialPve||guildRaidScope==="), 'Raid Gate must hide activity bar');
assert.ok(!screen.includes('setPlaybackSpeed(') && !screen.includes('DUNGEON_PLAYBACK_SPEEDS'), 'Guild PvE must not add playback speed controls');

assert.ok(sql.includes("auth.uid()") && sql.includes('a.account_id=uid') && sql.includes('g.account_id=uid'), 'Timeline RPC must only return owned attempts from current guild membership');
assert.ok(sql.includes("grant execute on function public.guild_pve_attempt_timeline_v1(uuid) to authenticated"), 'Timeline RPC must not be public');
assert.ok(sql.includes("v_attempt.character_damage/30") && sql.includes("v_attempt.companion_damage/10"), 'Hit amounts must partition already-decided server attempt totals');
assert.ok(!sql.includes('update public.guild_pve_') && !sql.includes('insert into public.guild_pve_'), 'Read-only timeline RPC must not modify rewards, attempts, or shared boss HP');
assert.ok(rpc.includes("rpc('guild_pve_attempt_timeline_v1'"), 'Mobile must read authenticated timeline RPC');
// Legacy timeline helpers remain covered below. The current theater deliberately uses
// cosmetic animation only: it must not display invented per-hit amounts.
assert.ok(!theater.includes('hitLabel=') && !theater.includes('setDamage(') && !theater.includes('row.damage='), 'Current cosmetic theater must not fabricate hit numbers or shared HP');
assert.ok(timeline.includes('now>=end') && timeline.includes('windowMs=1700'), 'Cue lookup must exclude expired and stale hits');
assert.ok(fx.includes('hit.actor===\'companion\'?assist:strike'), 'Companion and character hits must animate independently');

// Invariant of the SQL's quotient+remainder partition formula: every hit
// sequence sums exactly to the predetermined character/companion totals.
function partition(total,count){
 return Array.from({length:count},(_,i)=>Math.floor(total/count)+(i<total%count?1:0)).filter(n=>n>0);
}
for(const total of [0,1,2,29,30,31,399,1000000,987654321]){
 for(const count of [10,30]){
  assert.equal(partition(total,count).reduce((a,b)=>a+b,0),total);
 }
}
assert.ok(reader.includes("membership.account_id+':'+membership.guild_id+':'+(characterId??'unknown')") && reader.includes('await myGuild()'), 'Prefetch cache must remain membership-verified and character-scoped');
assert.ok(guild.includes('prefetchGuildPveBoard(raidCharacterId)') && guild.includes("onlineSection!=='Home'"), 'Warm raid data only on Guild Home');
assert.ok(board.includes('treasuryLastRead.current<60000') && board.includes('treasuryRead.current'), 'Treasury requests must be throttled and singleflight');
assert.ok(theater.includes('arenaHeight=Math.max') && theater.includes('fontScale>=1.4') && screen.includes('frostfall_wide_v2.webp'), 'Responsive arena and seasonal asset');
assert.ok(board.includes('queuedForce.current=true') && board.includes('if(confirmed||queuedForce.current)void load(true)'), 'Forced read must not disappear behind a mutation or existing read');
console.log('PASS Guild PvE receipt recovery, cosmetic theater, timeline helpers and authoritative shared HP contracts');
