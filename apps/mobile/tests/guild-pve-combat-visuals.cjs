const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');
const fx = read('src/components/GuildRaidCombatFx.tsx');
const screen = read('src/components/GuildRaidEncounter.tsx');
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
assert.ok(screen.includes('active={raidActive}'), 'Raid combat VFX must be limited to a running attempt');
assert.ok(screen.includes('companionEquipped={Boolean(companionArt)}'), 'Companion attacks must be based on equipped companion art');
assert.ok(screen.includes('maxHp={row.maxHp} damage={row.damage}'), 'Raid bar must bind to authoritative server HP');
assert.ok(fx.includes('width:fill.interpolate('), 'Boss HP fill must be based on the server-confirmed percentage');
assert.ok(fx.includes('previousDamage.current!==damage'), 'Confirmed server damage must produce visual confirmation');
assert.ok(!fx.includes('setDamage(') && !fx.includes('row.damage='), 'Visual attacks must never fake or mutate boss damage');
assert.ok(screen.includes('remainingSeconds===0') && screen.includes('setInterval(refresh,12000)'), 'Overdue attempts should refresh without high-frequency polling');
assert.ok(!screen.includes('setPlaybackSpeed(') && !screen.includes('DUNGEON_PLAYBACK_SPEEDS'), 'Guild PvE must not add playback speed controls');

assert.ok(sql.includes("auth.uid()") && sql.includes('a.account_id=uid') && sql.includes('g.account_id=uid'), 'Timeline RPC must only return owned attempts from current guild membership');
assert.ok(sql.includes("grant execute on function public.guild_pve_attempt_timeline_v1(uuid) to authenticated"), 'Timeline RPC must not be public');
assert.ok(sql.includes("v_attempt.character_damage/30") && sql.includes("v_attempt.companion_damage/10"), 'Hit amounts must partition already-decided server attempt totals');
assert.ok(!sql.includes('update public.guild_pve_') && !sql.includes('insert into public.guild_pve_'), 'Read-only timeline RPC must not modify rewards, attempts, or shared boss HP');
assert.ok(rpc.includes("rpc('guild_pve_attempt_timeline_v1'"), 'Mobile must read authenticated timeline RPC');
assert.ok(screen.includes('currentGuildPveAttemptHit(') && screen.includes('hitLabel={currentHit?'), 'Screen must show only recent, server-derived hit cues');
assert.ok(screen.includes('attemptNumber===(row.attemptsUsed??0)'), 'Ignore stale timeline data from past attempts');
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
console.log('PASS Guild PvE hit cues are deterministic owner-only visual partitions; shared HP remains authoritative');
