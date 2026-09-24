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
import {
 GUILD_ACTIVITY_DAILY_DECAY_PERCENT,
 GUILD_ACTIVITY_MILESTONES,
 guildActivityAfterDecay,
 guildActivityBonuses,
 guildActivityPercent,
 guildActivityTargetForMembers,
} from '../src/core/guild-activity';

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
equal(GUILD_ACTIVITY_DAILY_DECAY_PERCENT,10,'Active Guild decay should be 10 percentage points per day');
equal(GUILD_ACTIVITY_MILESTONES.join(','),'20,40,60,80,100','Active Guild milestones should be every 20%');
equal(guildActivityTargetForMembers(20),1200,'Active Guild target should scale around 60% of roster');
equal(guildActivityPercent(600,1200),50,'Active Guild percent should normalize contribution to roster-scaled target');
equal(guildActivityAfterDecay(100,1),90,'Active Guild meter should preserve momentum instead of weekly hard reset');
equal(guildActivityAfterDecay(35,4),0,'Active Guild decay must floor at zero');
equal(guildActivityBonuses(19).gatheringSpeedBps,0,'First bonus should remain locked below 20%');
equal(guildActivityBonuses(20).gatheringSpeedBps,500,'20% should unlock +5% gathering speed');
equal(guildActivityBonuses(40).productionSpeedBps,500,'40% should unlock +5% production speed');
equal(guildActivityBonuses(60).skillXpBps,500,'60% should unlock +5% non-combat Skill XP');
equal(guildActivityBonuses(80).masteryXpBps,500,'80% should unlock +5% Mastery XP');
equal(guildActivityBonuses(100).rareMaterialChanceRelativeBps,500,'100% should unlock the rare-material bonus');

console.log('PASS: Guild Muster cadence, scaling, Rally tiers and Hall bonuses are bounded');
