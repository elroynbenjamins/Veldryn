import {DEFAULT_GUILD_HALL_POLICY,GUILD_HALL_FACILITIES,applyGuildHallProjectCompletion,guildHallBenefits,guildHallLevel,guildHallVisualStage,newGuildHallState} from '../src/core/guild-hall-v44';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
equal(DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds.length,10,'Guild Hall has 10 current progression levels');
equal(GUILD_HALL_FACILITIES.length,6,'Guild Hall has six facilities');
const state=newGuildHallState('g',0);
applyGuildHallProjectCompletion(state,{eventId:'p1',guildId:'g',completedAtMs:1,hallProgressAward:24000,facilityContribution:{facilityId:'training_room',progressAward:6000}});
equal(guildHallLevel(state.hallProgress),10,'Hall reaches current level cap');
equal(guildHallVisualStage(10),'Grand Hall','Top current visual stage');
const benefits=guildHallBenefits(state);
equal(benefits.skillXpBonusBps,0,'Hall tiers do not grant profession power directly');
equal(benefits.craftingProcessingSpeedBps,0,'Hall tiers do not grant production power directly');
ok(benefits.extraProjectDraftChoices<=2,'Expedition Board capped at +2 convenience choices');
console.log('PASS: current Guild Hall uses 10 levels, six facilities, presentation/convenience progression and no direct stat power');
