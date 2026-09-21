import {strict as assert} from 'assert';
import {
 GUILD_MUSTER_DAILY_CAP,
 GUILD_MUSTER_PERSONAL_WEEKLY_GOAL,
 GUILD_MUSTER_RALLY_MARK_THRESHOLD,
 guildMusterDailyPercent,
 guildMusterEarnedRallyMark,
 guildMusterHallBonusBps,
 guildMusterRallyPercent,
 guildMusterRallyTarget,
 guildMusterRallyTier,
} from '../src/core/guild-muster';

assert.equal(GUILD_MUSTER_DAILY_CAP,100);
assert.equal(GUILD_MUSTER_RALLY_MARK_THRESHOLD,25);
assert.equal(GUILD_MUSTER_PERSONAL_WEEKLY_GOAL,4);
assert.equal(guildMusterRallyTarget(1),4);
assert.equal(guildMusterRallyTarget(12),32);
assert.equal(guildMusterRallyTarget(20),48);
assert.equal(guildMusterRallyTier(0,32),0);
assert.equal(guildMusterRallyTier(12,32),1);
assert.equal(guildMusterRallyTier(23,32),2);
assert.equal(guildMusterRallyTier(32,32),3);
assert.equal(guildMusterHallBonusBps(0),0);
assert.equal(guildMusterHallBonusBps(1),500);
assert.equal(guildMusterHallBonusBps(2),1000);
assert.equal(guildMusterHallBonusBps(3),1500);
assert.equal(guildMusterEarnedRallyMark(24),false);
assert.equal(guildMusterEarnedRallyMark(25),true);
assert.equal(guildMusterDailyPercent(50),50);
assert.equal(guildMusterDailyPercent(150),100);
assert.equal(guildMusterRallyPercent(16,32),50);

console.log('PASS: Guild Muster cadence, scaling, Rally tiers and Hall bonuses are bounded');
