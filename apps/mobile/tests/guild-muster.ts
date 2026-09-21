function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+' · expected '+String(expected)+', got '+String(actual));}
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

equal(GUILD_MUSTER_DAILY_CAP,100,'Guild Muster balance assertion');
equal(GUILD_MUSTER_RALLY_MARK_THRESHOLD,25,'Guild Muster balance assertion');
equal(GUILD_MUSTER_PERSONAL_WEEKLY_GOAL,4,'Guild Muster balance assertion');
equal(guildMusterRallyTarget(1),4,'Guild Muster balance assertion');
equal(guildMusterRallyTarget(12),32,'Guild Muster balance assertion');
equal(guildMusterRallyTarget(20),48,'Guild Muster balance assertion');
equal(guildMusterRallyTier(0,32),0,'Guild Muster balance assertion');
equal(guildMusterRallyTier(12,32),1,'Guild Muster balance assertion');
equal(guildMusterRallyTier(23,32),2,'Guild Muster balance assertion');
equal(guildMusterRallyTier(32,32),3,'Guild Muster balance assertion');
equal(guildMusterHallBonusBps(0),0,'Guild Muster balance assertion');
equal(guildMusterHallBonusBps(1),500,'Guild Muster balance assertion');
equal(guildMusterHallBonusBps(2),1000,'Guild Muster balance assertion');
equal(guildMusterHallBonusBps(3),1500,'Guild Muster balance assertion');
equal(guildMusterEarnedRallyMark(24),false,'Guild Muster balance assertion');
equal(guildMusterEarnedRallyMark(25),true,'Guild Muster balance assertion');
equal(guildMusterDailyPercent(50),50,'Guild Muster balance assertion');
equal(guildMusterDailyPercent(150),100,'Guild Muster balance assertion');
equal(guildMusterRallyPercent(16,32),50,'Guild Muster balance assertion');

console.log('PASS: Guild Muster cadence, scaling, Rally tiers and Hall bonuses are bounded');
