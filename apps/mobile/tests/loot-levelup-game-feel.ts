import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';
import {masteryRankNoticeMessage,rewardLootHighlights,rewardProgressionMoments} from '../src/core/reward-game-feel';
import {masteryPointsForRank} from '../src/core/profession-mastery-v40';
import type {RewardBundle} from '../src/core/types';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

let before=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Feedback Hero',body:'male'}},1,{characterId:'11111111-1111-4111-8111-111111111111'}).state;
before={...before,character:{...before.character!,level:10},skills:before.skills.map(skill=>skill.skillId==='mining'?{...skill,level:7}:skill.skillId==='smithing'?{...skill,level:11}:skill)};
const after={...before,character:{...before.character!,level:11},skills:before.skills.map(skill=>skill.skillId==='mining'?{...skill,level:8}:skill.skillId==='smithing'?{...skill,level:12}:skill)};
const moments=rewardProgressionMoments(before,after);
const character=moments.find(row=>row.kind==='character_level'),mining=moments.find(row=>row.id==='mining'),smithing=moments.find(row=>row.id==='smithing');
equal(character?.beforeLevel,10,'character level-up must retain the prior committed level');
equal(character?.afterLevel,11,'character level-up must expose the new committed level');
equal(mining?.beforeLevel,7,'skill level-up must retain prior level');
equal(mining?.afterLevel,8,'skill level-up must expose new level');
ok(mining?.unlocks.includes('Aster-Iron Vein'),'Mining level 8 must explain the newly unlocked Aster-Iron activity');
ok(mining?.unlocks.includes('Aster-Iron Pickaxe'),'Mining level 8 must also explain the newly equippable tool tier');
ok(mining?.unlockGroups?.some(group=>group.category==='GATHERING')&&mining.unlockGroups.some(group=>group.category==='TOOL TIER'),'Skill level-up unlocks must be grouped by milestone type');
equal(mining?.nextMilestone?.level,16,'Mining level 8 should preview the next configured milestone level');
ok((smithing?.unlocks.length??0)>0,'Smithing level-up must surface newly unlocked recipes when content crosses the level');

const masteryBefore={...before,account:{...before.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(9),updatedAtMs:1}}}};
const masteryAfter={...masteryBefore,account:{...masteryBefore.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(10),updatedAtMs:2}}}};
const masteryMoment=rewardProgressionMoments(masteryBefore,masteryAfter).find(row=>row.kind==='mastery_rank');
equal(masteryMoment?.beforeLevel,9,'Mastery feedback must retain the previous action rank');
equal(masteryMoment?.afterLevel,10,'Mastery feedback must expose the committed new action rank');
ok(masteryMoment?.unlocks.includes('+2% skill XP'),'R10 mastery feedback must explain the newly active XP bonus');
equal(masteryMoment?.nextMilestone?.level,20,'R10 mastery feedback should preview the next relevant bonus rank');
equal(masteryMoment?.skillId,'woodcutting','Mastery feedback must retain the destination profession');
ok(masteryRankNoticeMessage(masteryMoment?[masteryMoment]:[]).includes('R10'),'Lightweight mastery feedback must name the reached rank');

const masteredAfter={...masteryBefore,account:{...masteryBefore.account,professionMasteryByAction:{GREENWOOD_TREE:{actionId:'GREENWOOD_TREE',points:masteryPointsForRank(50),updatedAtMs:3}}}};
const masteredMoment=rewardProgressionMoments(masteryBefore,masteredAfter).find(row=>row.kind==='mastery_rank');
equal(masteredMoment?.mastered,true,'R50 mastery must become a permanent mastered moment');
ok(masteryRankNoticeMessage(masteredMoment?[masteredMoment]:[]).startsWith('Mastered · Greenwood Tree'),'R50 lightweight feedback must use mastered completion wording');

const reward:RewardBundle={xp:1,gold:0,kills:1,elapsedSeconds:1,items:[{itemId:'SUNSCORED_STONEHEART_HELMET',quantity:1},{itemId:'COPPER_ORE',quantity:2}]};
const loot=rewardLootHighlights(reward);
const epic=loot.find(row=>row.itemId==='SUNSCORED_STONEHEART_HELMET'),copper=loot.find(row=>row.itemId==='COPPER_ORE');
equal(epic?.rarity,'epic','authored Epic equipment must retain its rarity in reward feedback');
equal(epic?.spotlight,true,'Epic+ loot must receive an exceptional reward callout');
equal(copper?.spotlight,false,'ordinary materials must stay lightweight');

const popup=fs.readFileSync('src/components/RewardPopup.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
ok(popup.includes('✦ LEVEL UP')&&popup.includes("{mastery?'R':'Lv '}{moment.beforeLevel}")&&popup.includes("{mastery?'R':''}{moment.afterLevel}"),'Reward popup must clearly show committed level and mastery-rank transitions');
ok(popup.includes('NEWLY UNLOCKED'),'Level-up moment must explain newly unlocked content when available');
ok(popup.includes('ACTION MASTERED')&&popup.includes('MASTERY RANK UP'),'Reward feedback must distinguish ordinary mastery ranks from R50 completion');
ok(popup.includes("mastery?'BONUS UNLOCKED':'NEWLY UNLOCKED'"),'Mastery reward moments must label bonus unlocks accurately');
ok(popup.includes('moment.unlockGroups')&&popup.includes('NEXT · LV'),'Level-up moment must group unlock types and preview the next milestone compactly');
ok(popup.includes('✦ EXCEPTIONAL LOOT'),'Epic+ drops must receive a stronger reward moment');
ok(popup.includes('rarityTag')&&popup.includes('rarityNameColor'),'Reward breakdown must remain rarity-legible without over-celebrating normal loot');
ok(popup.includes('EquipmentArtwork'),'equipment drops must reuse the actual equipment artwork when available');
ok(popup.includes('reduceMotion'),'reward celebration motion must respect Reduce Motion');
ok(app.includes('presentCollected(result.reward,result.activity??null,before,result.state)'),'online reward presentation must pass committed before/after server state');
ok(app.includes('rewardProgressionMoments(before,after)'),'reward presentation must derive level-up moments centrally from its committed before/after states');
ok(app.includes('rewardProgressionMoments(current,settled.state)'),'offline returned rewards must derive level-ups from committed states');
ok(app.includes('progressionMoments={collected?.progressionMoments??[]}'),'App must feed derived progression moments into the reward surface');

console.log('PASS loot and level-up reward feedback prioritizes meaningful progression without interrupting normal drops');
