import {MONSTERS} from '../src/content/monsters';
import {COMBAT_AFFIX_IDS,COMBAT_AFFIXES,COMBAT_CHALLENGE_IDS,COMBAT_CHALLENGES,challengeConquestSummary,challengeHuntClearKey,challengeHuntClearSummary,challengeHuntCleared,challengeHuntFirstClearReward,challengeHuntStats,challengeHuntUnlocked,challengeRewardMultipliers,rotatingChallengeAffix} from '../src/core/challenge-hunts';
import {combatReadiness} from '../src/core/combat-presentation';
import {claimActivity,createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function rejects(fn:()=>unknown,message:string){let threw=false;try{fn()}catch{threw=true}ok(threw,message)}
const now=Date.UTC(2026,8,21),monster=MONSTERS.find(row=>row.id==='MOSS_RAT')!;
let state=createCharacter(newGame(now),'RAVAGER','Challenge Tester');

ok(COMBAT_CHALLENGE_IDS.join(',')==='ferocious,hardened,nemesis,apex','Challenge Hunt tier order drifted');
ok(COMBAT_CHALLENGE_IDS.every(id=>COMBAT_CHALLENGES[id].xpMultiplier>1&&COMBAT_CHALLENGES[id].goldMultiplier>1&&COMBAT_CHALLENGES[id].dropChanceMultiplier>1),'Every Challenge Hunt needs stronger rewards');
ok(COMBAT_AFFIX_IDS.length===4&&COMBAT_AFFIX_IDS.every(id=>!!COMBAT_AFFIXES[id]),'Challenge Hunt affix catalog must remain complete');
const weeklyAffix=rotatingChallengeAffix(monster.id,'nemesis',now),weeklyAffixRepeat=rotatingChallengeAffix(monster.id,'nemesis',now+3*86400_000);ok(weeklyAffix===weeklyAffixRepeat,'Challenge Hunt affix must remain stable within the UTC week');
ok(!challengeHuntUnlocked(state,monster.id,'ferocious'),'Challenge Hunt should require real monster mastery');
rejects(()=>startCombat(state,monster.id,now,'ferocious'),'Locked Challenge Hunt must reject');

state={...state,character:{...state.character!,monsterMasteryPoints:{MOSS_RAT:500}}};
ok(challengeHuntUnlocked(state,monster.id,'ferocious')&&challengeHuntUnlocked(state,monster.id,'hardened')&&challengeHuntUnlocked(state,monster.id,'nemesis')&&!challengeHuntUnlocked(state,monster.id,'apex'),'Mastery 20 should unlock Ferocious, Hardened and Nemesis but keep Apex locked');
const normal=challengeHuntStats(monster,undefined),ferocious=challengeHuntStats(monster,'ferocious'),hardened=challengeHuntStats(monster,'hardened'),nemesis=challengeHuntStats(monster,'nemesis');
ok(ferocious.attack>normal.attack&&hardened.defense>normal.defense&&nemesis.hp>hardened.hp,'Challenge Hunt stat identities should be meaningfully harder');
for(const affixId of COMBAT_AFFIX_IDS){const tuned=challengeHuntStats(monster,'nemesis',affixId),reward=challengeRewardMultipliers('nemesis',affixId);ok(tuned.hp>=nemesis.hp&&tuned.attack>=nemesis.attack&&tuned.defense>=nemesis.defense,'Affixes must never make a Nemesis easier than its base tier');ok(reward.xp>=COMBAT_CHALLENGES.nemesis.xpMultiplier&&reward.gold>=COMBAT_CHALLENGES.nemesis.goldMultiplier&&reward.dropChance>=COMBAT_CHALLENGES.nemesis.dropChanceMultiplier,'Affixes must not reduce base Challenge Hunt rewards');}
ok(combatReadiness(state,monster,'ferocious').recommendedPower>combatReadiness(state,monster).recommendedPower,'Challenge Hunt readiness must increase');
state={...state,character:{...state.character!,monsterMasteryPoints:{MOSS_RAT:750}}};ok(challengeHuntUnlocked(state,monster.id,'apex'),'Mastery 30 should unlock Apex Hunts');const apex=challengeHuntStats(monster,'apex');ok(apex.hp>nemesis.hp&&apex.attack>nemesis.attack&&apex.defense>nemesis.defense,'Apex must be the strongest Challenge Hunt tier');
const rewardMonster=MONSTERS.reduce((best,row)=>row.level>best.level?row:best,monster),clearRewards=COMBAT_CHALLENGE_IDS.map(id=>challengeHuntFirstClearReward(rewardMonster,id));ok(clearRewards[3].gold>clearRewards[2].gold&&clearRewards[2].gold>clearRewards[1].gold&&clearRewards[1].gold>clearRewards[0].gold,'Challenge first-clear Gold should scale by tier above the low-level reward floor');ok(clearRewards[3].items.find(row=>row.itemId==='TEMPERING_DUST')!.quantity>clearRewards[0].items.find(row=>row.itemId==='TEMPERING_DUST')!.quantity,'Apex first clear should grant more Tempering Dust than Ferocious');
const emptyConquest=challengeHuntClearSummary(state,monster.id);ok(emptyConquest.cleared===0&&!emptyConquest.conquered,'Uncleared species should start at 0/4 Challenge Conquest');const conqueredState={...state,character:{...state.character!,challengeHuntClearIds:COMBAT_CHALLENGE_IDS.map(id=>challengeHuntClearKey(monster.id,id))}};const conquered=challengeHuntClearSummary(conqueredState,monster.id),conquestAccount=challengeConquestSummary(conqueredState,[monster.id]);ok(conquered.cleared===4&&conquered.conquered,'All four tier clears should mark the species conquered');ok(conquestAccount.clears===4&&conquestAccount.possible===4&&conquestAccount.conqueredSpecies===1,'Challenge Conquest summary should aggregate cleared species correctly');


const started=startCombat(state,monster.id,now,'nemesis');
ok(started.activity?.combatChallengeId==='nemesis'&&started.activity.combatAffixId===weeklyAffix,'Challenge Hunt tier and weekly affix must snapshot on activity');
const reward=previewActivityReward(started,now+3600_000);
ok(reward.kills>0,'Challenge Hunt should settle through the normal idle combat loop');
ok(reward.xp/reward.kills>monster.xp&&reward.gold/reward.kills>monster.gold,'Challenge Hunt should improve XP and Gold per successful kill');
const nemesisKey=challengeHuntClearKey(monster.id,'nemesis');ok(reward.challengeHuntFirstClear?.key===nemesisKey,'First successful Challenge Hunt settlement should preview a one-time first-clear reward');const claimed=claimActivity(started,now+3600_000);ok(challengeHuntCleared(claimed.state,monster.id,'nemesis')&&claimed.state.character?.challengeHuntClearIds?.includes(nemesisKey),'Settling the first kill should persist the Challenge Hunt clear');const repeated=startCombat(claimed.state,monster.id,now+3600_001,'nemesis'),repeatReward=previewActivityReward(repeated,now+7200_001);ok(!repeatReward.challengeHuntFirstClear,'Repeated clears of the same monster and tier must not repay the first-clear reward');


const command=executeGameCommand(state,{type:'start',args:{kind:'combat',id:monster.id,challengeId:'hardened'}},now);
ok(command.state.activity?.combatChallengeId==='hardened','Server command path must preserve Challenge Hunt tier');
ok(!!command.state.activity?.combatAffixId,'Server command path must authoritatively snapshot a Challenge Hunt affix');
rejects(()=>executeGameCommand(state,{type:'start',args:{kind:'combat',id:monster.id,challengeId:'invalid'}},now),'Unknown Challenge Hunt tier must reject at authoritative execution');
rejects(()=>executeGameCommand(state,{type:'start',args:{kind:'gathering',id:'GREENWOOD_TREE',challengeId:'ferocious'}},now),'Challenge tier cannot be attached to gathering');
console.log('PASS: Challenge Hunts are mastery-gated, harder, rewarding, first-clear safe and server-authoritative');
