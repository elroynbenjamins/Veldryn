import {DEFAULT_GUILD_HALL_POLICY,GUILD_HALL_FACILITIES,applyGuildHallProjectCompletion,guildHallBenefits,guildHallLevel,guildHallVisualStage,newGuildHallState} from '../src/core/guild-hall-v44';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
equal(DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds.length,20,'Guild Hall has 20 levels');
equal(GUILD_HALL_FACILITIES.length,6,'Guild Hall has six facilities');
const state=newGuildHallState('g',0);
applyGuildHallProjectCompletion(state,{eventId:'p1',guildId:'g',completedAtMs:1,hallProgressAward:21000,facilityContribution:{facilityId:'training_room',progressAward:6000}});
equal(guildHallLevel(state.hallProgress),20,'Hall reaches level 20');
equal(guildHallVisualStage(20),'Legendary Hall','Top visual stage');
const benefits=guildHallBenefits(state);
ok(benefits.skillXpBonusBps<=50,'Training bonus capped at +0.50%');
ok(benefits.craftingProcessingSpeedBps<=50,'Workshop bonus capped at +0.50%');
ok(benefits.extraProjectDraftChoices<=2,'Expedition Board capped at +2 choices');
console.log('PASS: reconciled V44 Guild Hall levels, facilities and convenience caps');
