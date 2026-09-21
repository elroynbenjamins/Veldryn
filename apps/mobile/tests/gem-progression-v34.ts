import {GEM_ITEMS_V34,EFFECT_GEM_ITEMS_V34,STAT_GEM_ITEMS_V34} from '../src/content/gem-items-v34';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {dismantleGemV34,effectGemResonance,gearEnhancement,socketGem,unsocketGem} from '../src/core/equipment-enhancement';
import {claimEquipmentCraft,equipmentCraftingQueue,startGemCombineV34} from '../src/core/equipment-crafting-queue';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function qty(state:GameState,itemId:string){return [...state.inventory.stacks,...state.bank.stacks].filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0)}
function prepared(){
 let state=createCharacter(newGame(0),'IRONWARDEN','Gem Tester','male');
 state={...state,character:{...state.character!,gold:500000,equipment:{...state.character!.equipment,helmet:'STONEHEART_HELMET',legs:'STONEHEART_LEGS',boots:'STONEHEART_BOOTS',ring:'STONEHEART_RING'}},inventory:{...state.inventory,capacity:100,stacks:[
  ...state.inventory.stacks,
  {itemId:'GEM_STAT_MIGHT_G5',quantity:1},
  {itemId:'GEM_STAT_WARD_G4',quantity:1},
  {itemId:'GEM_STAT_MIGHT_G1',quantity:6},
  {itemId:'GEM_STAT_KEEN_G3',quantity:2},
  {itemId:'GEM_EFFECT_MOMENTUM_G1',quantity:4},
  {itemId:'GEM_DUST',quantity:100},
  {itemId:'REGIONAL_CATALYST',quantity:4},
  {itemId:'RADIANT_CATALYST',quantity:2},
 ]}};
 return state;
}

ok(STAT_GEM_ITEMS_V34.length===60,'12 Stat families x 5 grades should generate 60 Stat Gems');
ok(EFFECT_GEM_ITEMS_V34.length===100,'20 Effect families x 5 grades should generate 100 Effect Gems');
ok(GEM_ITEMS_V34.length===164,'Generated V34 catalog should include 160 gems plus 4 progression materials');

let state=prepared();
const powerBefore=effectiveStats(state).power;
state=socketGem(state,'STONEHEART_RING','GEM_STAT_MIGHT_G5');
ok(effectiveStats(state).power>powerBefore,'Radiant Might Gem should increase effective Power');
ok(gearEnhancement(state,'STONEHEART_RING').statGemId==='GEM_STAT_MIGHT_G5','canonical Stat Gem should occupy the Stat socket');

state=socketGem(state,'STONEHEART_HELMET','GEM_EFFECT_MOMENTUM_G1');
state=socketGem(state,'STONEHEART_LEGS','GEM_EFFECT_MOMENTUM_G1');
state=socketGem(state,'STONEHEART_BOOTS','GEM_EFFECT_MOMENTUM_G1');
ok(effectGemResonance(state,'effect_momentum')===3,'three equipped Momentum gems should reach Resonance III');
let fourthBlocked=false;
try{socketGem(state,'STONEHEART_RING','GEM_EFFECT_MOMENTUM_G1')}catch(error){fourthBlocked=error instanceof Error&&error.message.includes('3-copy cap')}
ok(fourthBlocked,'a fourth Effect Gem of the same family must be rejected');

let extraction=prepared();
extraction=socketGem(extraction,'STONEHEART_RING','GEM_STAT_WARD_G4');
const dustBeforeExtract=qty(extraction,'GEM_DUST'),goldBeforeExtract=extraction.character!.gold;
extraction=unsocketGem(extraction,'STONEHEART_RING',0);
ok(extraction.character!.gold===goldBeforeExtract-1500,'Flawless extraction should cost 1,500 Gold');
ok(qty(extraction,'GEM_DUST')===dustBeforeExtract-1,'Flawless extraction should cost 1 Gem Dust');
ok(qty(extraction,'GEM_STAT_WARD_G4')===1,'safe extraction should return the gem');

let dismantle=prepared(),dustBefore=qty(dismantle,'GEM_DUST');
dismantle=dismantleGemV34(dismantle,'GEM_STAT_KEEN_G3',2);
ok(qty(dismantle,'GEM_STAT_KEEN_G3')===0,'dismantling should consume requested gem copies');
ok(qty(dismantle,'GEM_DUST')===dustBefore+16,'two Refined Gems should dismantle into 16 Gem Dust');

let combine=prepared();
const goldBeforeCombine=combine.character!.gold;
const started=startGemCombineV34(combine,'GEM_STAT_MIGHT_G1',1000);combine=started.state;
ok(started.seconds===300,'Cut to Polished combine should take five minutes before crafting-speed modifiers');
ok(combine.character!.gold===goldBeforeCombine-1500,'Cut to Polished combine should reserve 1,500 Gold');
ok(qty(combine,'GEM_STAT_MIGHT_G1')===3,'combine should reserve exactly three matching source gems');
const job=equipmentCraftingQueue(combine).find(row=>row.kind==='gem_combine');
ok(!!job&&job.outputItemId==='GEM_STAT_MIGHT_G2','gem combine should occupy the existing shared crafting queue');
const claimed=claimEquipmentCraft(combine,job!.id,job!.completesAtMs);
ok(qty(claimed.state,'GEM_STAT_MIGHT_G2')===1,'claiming the finished shared-queue job should grant one upgraded gem');

ok(validateGameCommand({type:'gem_combine',args:{id:'GEM_STAT_MIGHT_G1'}}).type==='gem_combine','online command validator must accept gem combines');
ok(validateGameCommand({type:'gem_dismantle',args:{id:'GEM_STAT_KEEN_G3',quantity:1}}).type==='gem_dismantle','online command validator must accept gem dismantles');
let online=prepared();
const onlineStarted=executeGameCommand(online,{type:'gem_combine',args:{id:'GEM_STAT_MIGHT_G1'}},2000);online=onlineStarted.state;
const onlineJob=equipmentCraftingQueue(online).find(row=>row.kind==='gem_combine')!;
const onlineClaim=executeGameCommand(online,{type:'craft_claim',args:{id:onlineJob.id}},onlineJob.completesAtMs);
ok(qty(onlineClaim.state,'GEM_STAT_MIGHT_G2')===1,'authoritative online command path should complete a gem combine');
ok(onlineClaim.contributions.length===0,'gem combining should not masquerade as a normal recipe contribution');

console.log('PASS: V34 gem grades, Stat application, Resonance cap, extraction, dismantling and shared-queue combining');
