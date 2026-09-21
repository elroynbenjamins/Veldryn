import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';
import {rewardLootHighlights,rewardProgressionMoments} from '../src/core/reward-game-feel';
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
ok((smithing?.unlocks.length??0)>0,'Smithing level-up must surface newly unlocked recipes when content crosses the level');

const reward:RewardBundle={xp:1,gold:0,kills:1,elapsedSeconds:1,items:[{itemId:'SUNSCORED_STONEHEART_HELMET',quantity:1},{itemId:'COPPER_ORE',quantity:2}]};
const loot=rewardLootHighlights(reward);
const epic=loot.find(row=>row.itemId==='SUNSCORED_STONEHEART_HELMET'),copper=loot.find(row=>row.itemId==='COPPER_ORE');
equal(epic?.rarity,'epic','authored Epic equipment must retain its rarity in reward feedback');
equal(epic?.spotlight,true,'Epic+ loot must receive an exceptional reward callout');
equal(copper?.spotlight,false,'ordinary materials must stay lightweight');

const popup=fs.readFileSync('src/components/RewardPopup.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
ok(popup.includes('✦ LEVEL UP')&&popup.includes('Lv {moment.beforeLevel} → {moment.afterLevel}'),'Reward popup must clearly show the committed level transition');
ok(popup.includes('NEWLY UNLOCKED'),'Level-up moment must explain newly unlocked content when available');
ok(popup.includes('✦ EXCEPTIONAL LOOT'),'Epic+ drops must receive a stronger reward moment');
ok(popup.includes('rarityTag')&&popup.includes('rarityNameColor'),'Reward breakdown must remain rarity-legible without over-celebrating normal loot');
ok(popup.includes('EquipmentArtwork'),'equipment drops must reuse the actual equipment artwork when available');
ok(popup.includes('reduceMotion'),'reward celebration motion must respect Reduce Motion');
ok(app.includes('presentCollected(result.reward,result.activity??null,before,result.state)'),'online reward presentation must pass committed before/after server state');
ok(app.includes('rewardProgressionMoments(before,after)'),'reward presentation must derive level-up moments centrally from its committed before/after states');
ok(app.includes('rewardProgressionMoments(current,settled.state)'),'offline returned rewards must derive level-ups from committed states');
ok(app.includes('progressionMoments={collected?.progressionMoments??[]}'),'App must feed derived progression moments into the reward surface');

console.log('PASS loot and level-up reward feedback prioritizes meaningful progression without interrupting normal drops');
