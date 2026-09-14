import {COMPANION_MONTHLY_COMPLETION_REWARD,COMPANION_TRIAL_BOSS_INTERVAL,COMPANION_TRIAL_FLOOR_COUNT,COMPANION_TRIAL_MITIGATION_CONSTANT,COMPANION_TRIAL_MODIFIERS,COMPANION_WEEKLY_CHALLENGES,companionTrialEnemyScale,companionTrialFloorModifiers,companionTrialRecommendedPower,companionTrialReward,companionTrialSeasonDefinition} from './content';
import {buildOwnedCompanionCombatant} from './combat-adapter';
import {companionEssenceRewardMultiplier,companionTeamPower,totalCompanionHasteBonus,totalCompanionSynergyMultiplier,validateCompanionTrialTeam,restrictionSatisfied} from './team';
import {companionTrialResetInfo,rolloverCompanionTrialSeason} from './trial-season';
import type {CompanionCombatExecutor,CompanionCombatantDefinition,CompanionTrialProgress,CompanionTrialRestriction,OwnedCompanionSnapshot} from './domain';

export interface CompanionTrialRuntimeInput{
 progress?:CompanionTrialProgress;owned:Record<string,OwnedCompanionSnapshot>;busyCompanionIds:ReadonlySet<string>;trialsUnlocked:boolean;serverNowMs:number;
}
export interface CompanionTrialFloorDefinition{floor:number;recommendedPower:number;modifiers:string[];boss:boolean;}
export function companionTrialFloorDefinition(floor:number,seasonKey:string):CompanionTrialFloorDefinition{
 if(floor<1||floor>COMPANION_TRIAL_FLOOR_COUNT||!Number.isInteger(floor))throw new Error('invalid_companion_trial_floor');
 const season=companionTrialSeasonDefinition(seasonKey);return {floor,recommendedPower:companionTrialRecommendedPower(floor),modifiers:[...new Set([...season.modifiers,...companionTrialFloorModifiers(floor)])],boss:floor%COMPANION_TRIAL_BOSS_INTERVAL===0};
}
function enemy(id:string,name:string,floor:number,boss=false,role:'enemy'='enemy'):CompanionCombatantDefinition{
 const scale=companionTrialEnemyScale(floor);return {id,name,team:'enemies',role,level:floor,stats:{maxHp:Math.round((boss?520:180)*scale),attackPower:Number(((boss?28:15)*scale).toFixed(2)),healingPower:0,defense:Number(((boss?24:12)*scale).toFixed(2)),accuracy:.88,evasion:.04,critChance:.05,critMultiplier:1.5,haste:Math.min(.35,.03+floor*.004)},basicAttackMs:boss?2200:2500,basicAttackCoeff:boss?.82:.55,abilities:boss?[{id:`TRIAL_BOSS_${floor}_ACTIVE`,name:'Trial Boss Signature',cooldownMs:14000,castTimeMs:0,target:'current_target',effects:[{kind:'damage',coeff:1.05,tag:'trial_boss'}],priority:80,aiCondition:'always'}]:[],boss,tags:['companion_trial_enemy',boss?'boss':'normal']};
}
export function applyCompanionTrialModifiers(players:CompanionCombatantDefinition[],enemies:CompanionCombatantDefinition[],modifierIds:readonly string[]){
 let playerHealing=1,playerHaste=0,playerShield=1,enemyDefense=1,enemyAttack=1,enemyHp=1,enemyHaste=0,enemyAccuracy=0;
 for(const id of modifierIds){const m=COMPANION_TRIAL_MODIFIERS[id];if(!m)continue;playerHealing*=m.playerHealingMultiplier??1;playerHaste+=m.playerHasteBonus??0;playerShield*=m.playerShieldMultiplier??1;enemyDefense*=m.enemyDefenseMultiplier??1;enemyAttack*=m.enemyAttackMultiplier??1;enemyHp*=m.enemyHpMultiplier??1;enemyHaste+=m.enemyHasteBonus??0;enemyAccuracy+=m.enemyAccuracyBonus??0;}
 const tagged=(tags:string[]|undefined)=>[...(tags??[]),...modifierIds.map(id=>`trial_modifier:${id}`)];
 const nextPlayers=players.map(p=>({...p,stats:{...p.stats,healingPower:Number((p.stats.healingPower*playerHealing).toFixed(4)),haste:Math.min(.60,p.stats.haste+playerHaste)},abilities:p.abilities.map(a=>({...a,effects:a.effects.map(e=>e.kind==='shield'&&e.coeff!==undefined?{...e,coeff:Number((e.coeff*playerShield).toFixed(4))}:e)})),tags:tagged(p.tags)}));
 const nextEnemies=enemies.map(e=>({...e,stats:{...e.stats,maxHp:Math.round(e.stats.maxHp*enemyHp),attackPower:Number((e.stats.attackPower*enemyAttack).toFixed(4)),defense:Number((e.stats.defense*enemyDefense).toFixed(4)),haste:Math.min(.60,e.stats.haste+enemyHaste),accuracy:Math.min(.99,e.stats.accuracy+enemyAccuracy)},tags:tagged(e.tags)}));
 return {players:nextPlayers,enemies:nextEnemies};
}
function rawCompanionTrialEncounter(floor:number){const boss=floor%COMPANION_TRIAL_BOSS_INTERVAL===0;return boss?[enemy(`COMPANION_TRIAL_BOSS_${floor}`,`Trial Guardian ${floor}`,floor,true)]:[enemy(`COMPANION_TRIAL_${floor}_A`,'Trial Vanguard',floor),enemy(`COMPANION_TRIAL_${floor}_B`,'Trial Striker',floor),enemy(`COMPANION_TRIAL_${floor}_C`,'Trial Adept',floor)];}
export function buildCompanionTrialEncounter(floor:number,seasonKey='2000-01'){const def=companionTrialFloorDefinition(floor,seasonKey);return applyCompanionTrialModifiers([],rawCompanionTrialEncounter(floor),def.modifiers).enemies;}

function runId(seed:string,nowMs:number){return `CTR_${nowMs.toString(36)}_${Math.abs([...seed].reduce((n,c)=>(n*33+c.charCodeAt(0))|0,5381)).toString(36)}`;}
export function startCompanionTrial(input:CompanionTrialRuntimeInput,teamIds:readonly string[],seed:string,restrictions:CompanionTrialRestriction[]=[],requestedStartFloor?:number){
 if(!input.trialsUnlocked)throw new Error('companion_trials_locked');
 const rolled=rolloverCompanionTrialSeason(input.progress,input.serverNowMs),progress=rolled.progress;
 const validation=validateCompanionTrialTeam({companionIds:teamIds,owned:input.owned,busyCompanionIds:input.busyCompanionIds,restrictions});if(!validation.ok)throw new Error(validation.reason);
 if(progress.season.activeRun)throw new Error('companion_trial_run_already_active');
 const unlockedCheckpoint=Math.max(1,Math.min(COMPANION_TRIAL_FLOOR_COUNT,progress.season.checkpointFloor));
 const requested=requestedStartFloor??unlockedCheckpoint;if(requested<1||requested>unlockedCheckpoint||!(requested===1||(requested-1)%COMPANION_TRIAL_BOSS_INTERVAL===0))throw new Error('invalid_or_locked_trial_checkpoint');const startFloor=requested;
 const ids=[...teamIds] as [string,string,string];const run={runId:runId(seed,input.serverNowMs),seasonKey:progress.season.seasonKey,teamCompanionIds:ids,startedAt:new Date(input.serverNowMs).toISOString(),contentVersion:'companion_trials_v1',currentFloor:startFloor,startFloor,seed,restrictionIds:restrictions.map(r=>JSON.stringify(r))};
 return {progress:{...progress,season:{...progress.season,activeRun:run,currentFloor:startFloor}},run,teamPower:validation.power,synergies:validation.synergies,resetInfo:companionTrialResetInfo(input.serverNowMs),rolled:rolled.rolled};
}
export function abandonCompanionTrial(progress:CompanionTrialProgress,serverNowMs:number){const rolled=rolloverCompanionTrialSeason(progress,serverNowMs);return {...rolled.progress,season:{...rolled.progress.season,activeRun:undefined,currentFloor:rolled.progress.season.checkpointFloor}};}

export function resolveCompanionTrialFloor(input:CompanionTrialRuntimeInput,runIdValue:string,executor:CompanionCombatExecutor){
 if(!input.trialsUnlocked)throw new Error('companion_trials_locked');
 const rolled=rolloverCompanionTrialSeason(input.progress,input.serverNowMs),progress=rolled.progress;
 if(rolled.expiredRunId===runIdValue)throw new Error('trial_run_expired_by_season_rollover');
 const run=progress.season.activeRun;if(!run||run.runId!==runIdValue)throw new Error('companion_trial_run_not_active');
 if(run.seasonKey!==progress.season.seasonKey)throw new Error('trial_run_expired_by_season_rollover');
 const teamCheck=validateCompanionTrialTeam({companionIds:run.teamCompanionIds,owned:input.owned,busyCompanionIds:input.busyCompanionIds});if(!teamCheck.ok)throw new Error(teamCheck.reason);
 const floorDef=companionTrialFloorDefinition(run.currentFloor,progress.season.seasonKey),synergies=teamCheck.synergies,synergyMultiplier=totalCompanionSynergyMultiplier(synergies),hasteBonus=totalCompanionHasteBonus(synergies);
 const basePlayers=run.teamCompanionIds.map(id=>buildOwnedCompanionCombatant(input.owned[id],{mode:'companion_trial',teamSynergyMultiplier:synergyMultiplier,teamHasteBonus:hasteBonus}));
 const modified=applyCompanionTrialModifiers(basePlayers,rawCompanionTrialEncounter(run.currentFloor),floorDef.modifiers);
 const result=executor.simulate({seed:`${run.seed}:${progress.season.seasonKey}:${run.currentFloor}`,players:modified.players,enemies:modified.enemies,mitigationConstant:COMPANION_TRIAL_MITIGATION_CONSTANT});
 if(!result.victory){return {progress:{...progress,season:{...progress.season,activeRun:undefined,currentFloor:progress.season.checkpointFloor}},result,reward:{companionEssence:0,gold:0,bondstones:0,materials:{}},firstClear:false,monthlyCompleted:false,weeklyCompleted:false};}
 const floor=run.currentFloor,boss=floorDef.boss,firstClear=!progress.season.firstClearFloors.includes(floor),base=companionTrialReward(floor,firstClear,boss),seasonDef=companionTrialSeasonDefinition(progress.season.seasonKey);
 const featured=!!seasonDef.featuredOrigin&&teamCheck.members.some(x=>x.originId===seasonDef.featuredOrigin),essenceMult=companionEssenceRewardMultiplier(synergies)*(featured?1.05:1);
 const reward:{companionEssence:number;gold:number;bondstones:number;materials:Record<string,number>}={...base,companionEssence:Math.round(base.companionEssence*essenceMult),materials:Object.fromEntries(Object.entries(base.materials).filter(([,v])=>typeof v==='number')) as Record<string,number>};
 const firstClearFloors=firstClear?[...progress.season.firstClearFloors,floor]:progress.season.firstClearFloors;
 const bossRewardFloors=firstClear&&boss?[...progress.season.bossRewardFloors,floor]:progress.season.bossRewardFloors;
 const previousHighest=progress.season.currentSeasonHighestFloor,currentSeasonHighestFloor=Math.max(previousHighest,floor),monthlyCompleted=firstClear&&floor===COMPANION_TRIAL_FLOOR_COUNT;
 if(monthlyCompleted){reward.companionEssence+=COMPANION_MONTHLY_COMPLETION_REWARD.companionEssence;reward.gold+=COMPANION_MONTHLY_COMPLETION_REWARD.gold;reward.bondstones+=COMPANION_MONTHLY_COMPLETION_REWARD.bondstones;for(const [id,q] of Object.entries(COMPANION_MONTHLY_COMPLETION_REWARD.materials))reward.materials[id]=(reward.materials[id]??0)+q;}
 const teamPower=companionTeamPower(run.teamCompanionIds,input.owned),lifetime={...progress.lifetime,lifetimeHighestFloor:Math.max(progress.lifetime.lifetimeHighestFloor,floor),totalTrialFloorsCleared:progress.lifetime.totalTrialFloorsCleared+1,totalTrialBossesDefeated:progress.lifetime.totalTrialBossesDefeated+(boss?1:0),monthlyFloor30Clears:progress.lifetime.monthlyFloor30Clears+(monthlyCompleted?1:0),bestEverCompanionTeamPower:Math.max(progress.lifetime.bestEverCompanionTeamPower,teamPower)};
 const weeklyCompleted=false; // Weekly recurring goals now live in server-authoritative Companion Proving Grounds.
 const special={...progress.season.monthlyChallengeCompletion};for(const challengeId of seasonDef.specialChallenges){const c=COMPANION_WEEKLY_CHALLENGES.find(x=>x.id===challengeId);if(c&&floor>=c.minimumFloor&&c.restrictions.every(r=>r.type==='no_defeats'?(result.players??[]).every(x=>x.alive):restrictionSatisfied(teamCheck.members,r,teamPower)))special[c.id]=true;}
 const nextFloor=Math.min(COMPANION_TRIAL_FLOOR_COUNT,floor+1),checkpointFloor=boss?(floor===COMPANION_TRIAL_FLOOR_COUNT?Math.max(1,floor-COMPANION_TRIAL_BOSS_INTERVAL+1):floor+1):progress.season.checkpointFloor;
 const endRun=boss||floor===COMPANION_TRIAL_FLOOR_COUNT;const nextRun=endRun?undefined:{...run,currentFloor:nextFloor};
 const nextProgress:CompanionTrialProgress={...progress,lifetime,season:{...progress.season,currentFloor:endRun?checkpointFloor:nextFloor,checkpointFloor,currentSeasonHighestFloor,firstClearFloors,bossRewardFloors,leaderboardScore:Math.max(progress.season.leaderboardScore,Math.round(floor*1000-result.durationMs/100)),activeRun:nextRun,monthlyChallengeCompletion:special}};
 return {progress:nextProgress,result,reward,firstClear,monthlyCompleted,weeklyCompleted,runEnded:endRun,nextFloor:nextProgress.season.currentFloor,checkpointFloor};
}

/** @deprecated Weekly Companion rewards moved to Companion Proving Grounds. */
export function claimWeeklyCompanionChallenge(){throw new Error('weekly_companion_challenge_moved_to_proving_grounds');}

/** Monthly featured challenges are distinct from weekly Proving Grounds. */
export function claimMonthlyCompanionChallenge(progress:CompanionTrialProgress,challengeId:string,serverNowMs:number){
 const current=rolloverCompanionTrialSeason(progress,serverNowMs).progress;
 const season=companionTrialSeasonDefinition(current.season.seasonKey);
 const challenge=COMPANION_WEEKLY_CHALLENGES.find(c=>c.id===challengeId);
 if(!challenge||!season.specialChallenges.includes(challengeId))throw new Error('monthly_companion_challenge_unavailable');
 if(!current.season.monthlyChallengeCompletion[challengeId])throw new Error('monthly_companion_challenge_incomplete');
 const claimed=current.season.monthlyChallengeClaims??[];
 if(claimed.includes(challengeId))throw new Error('monthly_companion_challenge_already_claimed');
 return {progress:{...current,season:{...current.season,monthlyChallengeClaims:[...claimed,challengeId]}},reward:challenge.rewards};
}
