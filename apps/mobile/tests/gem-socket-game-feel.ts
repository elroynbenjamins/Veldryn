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
ok(modal.includes('gt("Replace gem?")')&&modal.includes('gt("Extract gem?")')&&modal.includes('pendingGemAction'),'gem replacement/extraction must require a clear confirmation step');
ok(modal.includes('gemUnsocketCostForStateV1')&&modal.includes('fee.gold')&&modal.includes('fee.dust')&&modal.includes('Gem Dust'),'gem confirmation must show the precise extraction/replacement cost');
ok(modal.includes('canAffordFee')&&modal.includes('disabled={!affordable||busy}'),'unaffordable gem extraction/replacement must not be submitted');
ok(modal.includes('setPendingGemAction(null);setGemPickerOpen(false)'),'successful gem replacement/extraction should dismiss both confirmation and picker');
ok(modal.includes('gemResultDetail(state,current.id)} → {gemResultDetail(state,next.id,itemId)'),'replacement confirmation must compare current and projected new effects before spending');
ok(modal.includes("setPendingGemAction({kind:'replace'"),'replacement buttons must stage confirmation instead of spending immediately');
ok(modal.includes("setPendingGemAction({kind:'extract'"),'extraction buttons must stage confirmation instead of spending immediately');
ok(modal.includes('onSocket(selectedGem.id)')&&modal.includes('setGemPickerOpen(false)'),'socketing from an empty slot should use the focused picker then close on success');
ok(modal.includes('style={s.compactSocketSelect}')&&modal.includes('compactExtract'),'socket selection must remain distinct from the extract action');
ok(modal.includes('selectedGem.id===equippedGemId')&&modal.includes('disabled={!selectedGem'),'already equipped gem variants must be blocked in the picker footer');
ok(modal.includes('showAllCandidates'),'players must be able to expand the owned gem shortlist');
ok(modal.includes('reduceMotion'),'gem result motion must respect Reduce Motion');

ok(modal.includes('effectFamilyCopiesV1(state,meta.familyId,previewItemId)+1'),'projected Effect Gem Resonance must account for the prospective socket change');
ok(modal.includes('family?.values[meta.grade]'),'Effect Gem strength must use actual grade values rather than a generic description');
console.log('PASS gem socket UX distinguishes committed changes, accurate grade values and paid replacement/extraction');
