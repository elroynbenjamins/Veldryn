const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');
const fx = read('src/components/GuildRaidCombatFx.tsx');
const screen = read('src/components/GuildRaidEncounter.tsx');
const classFx = read('src/core/dungeon-combat-fx.ts');

assert.ok(fx.includes('dungeonCombatClassFx(classId)'), 'Guild visual attacks must reuse canonical class-specific combat effects');
for (const classId of ['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER']) {
 assert.ok(classFx.includes(classId+':{classId:'), 'Existing class combat FX must cover '+classId);
}
assert.ok(fx.includes('Animated.loop(') && fx.includes('useNativeDriver:true'), 'Periodic raid VFX must use native-driven animation');
assert.ok(fx.includes('if(!active||reduceMotion)return'), 'Raid effects must stop when closed or reduce-motion is enabled');
assert.ok(fx.includes('companionEquipped?') && fx.includes('companionStrike'), 'Equipped companion must display a distinct assist effect');
assert.ok(screen.includes('active={raidActive}'), 'Raid combat VFX must be limited to a running attempt');
assert.ok(screen.includes('companionEquipped={Boolean(companionArt)}'), 'Companion attacks must be based on equipped companion art');
assert.ok(screen.includes('maxHp={row.maxHp} damage={row.damage}'), 'Raid bar must bind to authoritative server HP');
assert.ok(fx.includes('width:fill.interpolate('), 'Boss HP fill must be based on the server-confirmed percentage');
assert.ok(fx.includes('previousDamage.current!==damage'), 'Confirmed server damage must produce visual confirmation');
assert.ok(!fx.includes('setDamage(') && !fx.includes('row.damage='), 'Visual-only loops must never fake or mutate damage');
assert.ok(screen.includes('remainingSeconds===0') && screen.includes('setInterval(refresh,12000)'), 'Overdue attempts should refresh without high-frequency polling');
assert.ok(!screen.includes('setPlaybackSpeed(') && !screen.includes('DUNGEON_PLAYBACK_SPEEDS'), 'Guild PvE must not add playback speed controls');

console.log('PASS Guild PvE attacks use class-specific visual effects while HP remains server-authoritative');
