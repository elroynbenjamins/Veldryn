import {claimActivity,createCharacter,newGame,previewActivityReward,startCombat,startGathering} from '../src/core/game';
import {HUNTING_XP_SHARE,huntingXpForKills} from '../src/core/hunting-progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+expected+', got '+actual)}

const T=Date.UTC(2026,8,22,20);
let state=createCharacter(newGame(T),'IRONWARDEN','Hunter');
equal(HUNTING_XP_SHARE,.30,'Hunting XP share');

const base=huntingXpForKills(10,100,1,1,1),challenge=huntingXpForKills(10,100,1,1,1.5);
equal(base,300,'ten 100-XP kills grant 30% Hunting XP');
ok(challenge>base,'Challenge Hunt XP multiplier must increase Hunting XP');

state=startCombat(state,'MOSS_RAT',T);
const preview=previewActivityReward(state,T+60_000);
ok(preview.kills>0,'starter hunt should resolve at least one kill');
ok((preview.huntingXp??0)>0,'combat preview must expose Hunting XP');
const before=state.skills.find(row=>row.skillId==='hunting')!;
const claimed=claimActivity(state,T+60_000);
const after=claimed.state.skills.find(row=>row.skillId==='hunting')!;
equal(after.xp,before.xp+(claimed.reward.huntingXp??0),'claimed combat Hunting XP must settle into the Hunting skill');
ok(after.level>=before.level,'Hunting level must not regress');

let gathering=createCharacter(newGame(T),'IRONWARDEN','Gatherer');
gathering={...gathering,currentRegionId:'GREENFIELDS'};
gathering=startGathering(gathering,'GREENWOOD_TREE',T);
const gatherPreview=previewActivityReward(gathering,T+120_000);
equal(gatherPreview.huntingXp,undefined,'gathering must not grant Hunting XP');

console.log('PASS: Hunting progresses from real combat kills and never from gathering');
