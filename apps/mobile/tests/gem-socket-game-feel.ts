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
ok(modal.includes('Returned to Gem Pouch or available storage.'),'extraction result must correctly name account-wide Gem Pouch / storage return destinations');
ok(modal.includes('Previous gem returned safely.'),'replacement result must explain that the old gem was preserved');
ok(modal.includes('gt("Replace gem?")')&&modal.includes('gt("Extract gem?")')&&modal.includes('pendingGemAction'),'gem replacement/extraction must require a clear confirmation step');
ok(modal.includes('gemUnsocketCostForStateV1')&&modal.includes('fee.gold')&&modal.includes('fee.dust')&&modal.includes('Gem Dust'),'gem confirmation must show the precise extraction/replacement cost');
ok(modal.includes('canAffordFee')&&modal.includes('disabled={!affordable||busy}'),'unaffordable gem extraction/replacement must not be submitted');
ok(modal.includes('setPendingGemAction(null);setGemPickerOpen(false)'),'successful gem replacement/extraction should dismiss both confirmation and picker');
ok(modal.includes('gemResultDetail(state,current.id,itemId,true)} → {gemResultDetail(state,next.id,itemId)'),'replacement confirmation must compare current and projected new effects before spending');
ok(modal.includes("selectedGem.id===equippedGemId?'reroll':'replace'"),'replacement and duplicate reroll actions must stage confirmation before spending');
ok(modal.includes("setPendingGemAction({kind:'extract'"),'extraction buttons must stage confirmation instead of spending immediately');
ok(modal.includes('onSocket(selectedGem.id)')&&modal.includes('setGemPickerOpen(false)'),'socketing from an empty slot should use the focused picker then close on success');
ok(modal.includes('style={s.compactSocketSelect}')&&modal.includes('compactExtract'),'socket selection must remain distinct from the extract action');
ok(modal.includes('selectedGem.id===equippedGemId')&&modal.includes('Improve roll')&&modal.includes('disabled={!selectedGem'),'an identical owned gem must be selectable for best-of reroll');
ok(modal.includes('showAllCandidates'),'players must be able to expand the owned gem shortlist');
ok(modal.includes('reduceMotion'),'gem result motion must respect Reduce Motion');

ok(modal.includes('effectFamilyCopiesV1(state,meta.familyId,previewItemId)+1'),'projected Effect Gem Resonance must account for the prospective socket change');
ok(modal.includes('formatGemRollRangeV1(meta.familyId,meta.grade)'),'Effect Gem candidates must display authoritative possible roll values');
const improve=enhancementFeedback(
 {itemId:'GEAR',rank:4,failures:0,gemIds:['gem:stat_might:g1'],statGemId:'gem:stat_might:g1',statGemRollPercent:80},
 {itemId:'GEAR',rank:4,failures:0,gemIds:['gem:stat_might:g1'],statGemId:'gem:stat_might:g1',statGemRollPercent:120},
);
equal(improve?.socketChange?.action,'improved','a confirmed better reroll must have a distinct visible outcome');
equal(improve?.socketChange?.rollPercent,120,'the improved roll value must reach the feedback presentation');
const noImprovement=enhancementFeedback(
 {itemId:'GEAR',rank:4,failures:0,gemIds:['gem:stat_might:g1'],statGemId:'gem:stat_might:g1',statGemRollPercent:120},
 {itemId:'GEAR',rank:4,failures:0,gemIds:['gem:stat_might:g1'],statGemId:'gem:stat_might:g1',statGemRollPercent:120},
);
equal(noImprovement,null,'an unchanged roll must never be reported as an improvement');
ok(modal.includes('GEM IMPROVED')&&modal.includes('setRerollNotice'),'successful and unsuccessful improvements need truthful feedback');
ok(modal.includes('GemRollQuality')&&modal.includes('gemRollTickFilled')&&modal.includes('GEM_ROLL_STEP_PERCENT_V1'),'socket cards must visualize all nine graded roll outcomes');
ok(modal.includes('gemResultDetail(state,current.id,itemId,true)'),'committed gem results must display the equipped rolled bonus, not the unrolled candidate range');
ok(modal.includes('selectedPerfected')&&modal.includes('GEM_ROLL_MAX_PERCENT_V1'),'perfected sockets must be disabled in the reroll picker');
ok(modal.includes('useMemo(()=>ITEMS.filter')&&modal.includes('[state]);'),'socket candidates must refresh when account-wide Gem Pouch quantities change');
const character=fs.readFileSync('src/screens/CharacterScreen.tsx','utf8');
ok(character.includes('equippedGemLabel')&&character.includes('formatGemValueV1'),'character gear summary must show installed rolled values');
const pouch=fs.readFileSync('src/components/GemPouchPanel.tsx','utf8');
ok(pouch.includes('formatGemRollRangeV1')&&pouch.includes('gradeProgress'),'gem pouch must explain the range for each grade');
const languages=fs.readFileSync('src/i18n/gem-pouch-ui.ts','utf8');
ok(languages.includes('"Maximum roll"')&&languages.includes('"POSSIBLE SOCKET ROLL"')&&languages.includes('"One duplicate gem is consumed; the higher roll is kept."'),'gem roll rules and safety copy must be translated');
console.log('PASS gem socket UX distinguishes committed changes, accurate grade values and paid replacement/extraction');
