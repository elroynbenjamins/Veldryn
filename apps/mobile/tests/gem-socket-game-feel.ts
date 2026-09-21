import {enhancementFeedback} from '../src/core/visual-feedback';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const socketed=enhancementFeedback(
 {itemId:'GEAR',rank:4,failures:0,gemIds:[],statGemId:undefined,effectGemId:undefined},
 {itemId:'GEAR',rank:4,failures:0,gemIds:['EMBER_SHARD'],statGemId:'EMBER_SHARD',effectGemId:undefined},
);
equal(socketed?.kind,'sockets','a committed socket change must emit socket feedback');
equal(socketed?.socketChange?.action,'socketed','empty to filled must be classified as socketed');
equal(socketed?.socketChange?.socketKind,'stat','Stat Gem changes must identify the Stat slot');
equal(socketed?.socketChange?.gemId,'EMBER_SHARD','socket feedback must preserve the committed gem id');

const replaced=enhancementFeedback(
 {itemId:'GEAR',rank:4,failures:0,gemIds:['FLOW_SIGIL'],effectGemId:'FLOW_SIGIL'},
 {itemId:'GEAR',rank:4,failures:0,gemIds:['EXECUTION_SIGIL'],effectGemId:'EXECUTION_SIGIL'},
);
equal(replaced?.socketChange?.action,'replaced','filled to different filled must be classified as replaced');
equal(replaced?.socketChange?.previousGemId,'FLOW_SIGIL','replacement feedback must retain the removed gem');
equal(replaced?.socketChange?.gemId,'EXECUTION_SIGIL','replacement feedback must retain the inserted gem');

const extracted=enhancementFeedback(
 {itemId:'GEAR',rank:4,failures:0,gemIds:['WARD_SHARD'],statGemId:'WARD_SHARD'},
 {itemId:'GEAR',rank:4,failures:0,gemIds:[],statGemId:undefined},
);
equal(extracted?.socketChange?.action,'extracted','filled to empty must be classified as safely extracted');
equal(extracted?.socketChange?.previousGemId,'WARD_SHARD','extraction feedback must retain the returned gem id');

const modal=fs.readFileSync('src/components/EquipmentEnhancementModal.tsx','utf8');
ok(modal.includes('GEM SOCKETED')&&modal.includes('GEM REPLACED')&&modal.includes('GEM EXTRACTED'),'gem actions need distinct committed result moments');
ok(modal.includes('Returned safely to Inventory.'),'extraction result must tell the player where the gem went');
ok(modal.includes('Previous gem returned safely.'),'replacement result must explain that the old gem was preserved');
ok(modal.includes('CONFIRM GEM REPLACEMENT')&&modal.includes('CONFIRM SAFE EXTRACTION'),'paid/destructive gem changes must require a confirmation step');
ok(modal.includes('Cost ·')&&modal.includes('Gem Dust'),'gem confirmation must show the exact extraction/replacement cost currencies');
ok(modal.includes('gemResultDetail(state,current.id)} → {gemResultDetail(state,next.id)'),'replacement confirmation must compare current and new effects before spending');
ok(modal.includes("setPendingGemAction({kind:'replace'"),'replacement buttons must stage confirmation instead of spending immediately');
ok(modal.includes("setPendingGemAction({kind:'extract'"),'extraction buttons must stage confirmation instead of spending immediately');
ok(modal.includes(":void run(()=>onSocket(gem.id))"),'socketing into an empty slot should remain a fast one-tap action');
ok(modal.includes('reduceMotion'),'gem result motion must respect Reduce Motion');

console.log('PASS gem socket UX distinguishes committed changes and confirms paid replacement/extraction');
