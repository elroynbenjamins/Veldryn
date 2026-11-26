import {CLASSES} from '../src/content/classes';
import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {createCharacter,newGame} from '../src/core/game';
import {createAccountCharacter,switchAccountCharacter} from '../src/core/account-actions';
import {accountCharacters,occupiedCharacterRoles,MAX_NEW_ACCOUNT_CHARACTERS,accountSkillLevel,characterCreationError,characterSkillTotal,projectCharacter,recordAccountProgress,unlockedCharacterSlots,CHARACTER_SLOT_THRESHOLDS} from '../src/core/account-roster';
import {migrateSave} from '../src/core/save-migrations';
import {orderedCharacterRoster} from '../src/screens/character-roster-order';
import type {GameState} from '../src/core/types';
import {equal,ok,skillLevels,test,throws} from './account-test-helpers';
const first=()=>createCharacter(newGame(1000),'IRONWARDEN','Mira');
/** Fix one ordinary skill to an exact account-level boundary using real XP-derived levels. */
const atAccountLevel=(state:GameState,target:number,levels:number[])=>{
 const projected=skillLevels(state,levels),difference=target-accountSkillLevel(projected);
 return skillLevels(state,levels.map((level,index)=>index===levels.length-1?level+difference:level));
};
// At 800, progression must be spread across six skills instead of raising a single skill past level 100.
const thirdSlotLevels=[100,100,100,100,100,40];
const eligible=()=>atAccountLevel(first(),250,[50,50,50,50,41]);
const second=()=>createAccountCharacter(eligible(),'DAWNKEEPER','Rowan','female',1000);

test('exact approved thresholds',()=>{equal(CHARACTER_SLOT_THRESHOLDS,[0,250,800],'three slots only');equal(MAX_NEW_ACCOUNT_CHARACTERS,3,'new character hard cap');});
test('a new account has no phantom skill levels',()=>{const state=newGame(0);equal(accountSkillLevel(state),0,'uncreated skills');equal(unlockedCharacterSlots(state),1,'first slot');});
test('fresh character skill total follows enabled XP-derived skills',()=>{equal(accountSkillLevel(first()),13,'11 enabled account skills and 2 class skills');equal(Object.keys(first().character!.equipment),['weapon'],'main weapon only');});
test('249 is locked and 250 unlocks the second character',()=>{const locked=atAccountLevel(first(),249,[50,50,50,50,41]);equal(accountSkillLevel(locked),249,'boundary fixture');throws(()=>createAccountCharacter(locked,'DAWNKEEPER','Alia','male',1000),'249 denied');equal(accountSkillLevel(eligible()),250,'250 fixture');equal(unlockedCharacterSlots(eligible()),2,'250 accepted');});
test('a purchase cannot unlock a character slot',()=>{const state=first();state.account.entitlements={vip:true,vipPlus:true};state.account.createdCharacterCount=999;throws(()=>createAccountCharacter(state,'DAWNKEEPER','Alia','female',1000),'paid and count bypass denied');});
test('second character must fill a different role; all same-role classes are locked',()=>{const state=second();equal(accountCharacters(state).length,2,'two contexts');equal(accountSkillLevel(state),accountSkillLevel(eligible())+characterSkillTotal(state.skills,state.character!),'sum of both skills');equal(state.character!.classId,'DAWNKEEPER','support role');equal(state.character!.bodyPresentation,'female','chosen appearance');equal(occupiedCharacterRoles(state),['Tank','Support'],'both roles locked');ok(state.character!.id!=='LOCAL_CHAR_1','unique ID');throws(()=>createAccountCharacter(eligible(),'BASTION','Repeat Tank','male',1000),'second tank rejected');throws(()=>createAccountCharacter(eligible(),'DREADGUARD','Repeat Tank','male',1000),'different class same tank role rejected');});
test('new characters have independent inventory, skills, equipment and story',()=>{let prior=eligible();prior.character!.gold=876;prior.quests[0]={...prior.quests[0],status:'claimed'};const state=createAccountCharacter(prior,'DAWNKEEPER','Alia','female',1000);equal(state.character!.gold,100,'new personal gold');equal(characterSkillTotal(state.skills,state.character!),13,'fresh skill levels');equal(state.quests[0].status,'active','new story');equal(projectCharacter(state,'LOCAL_CHAR_1').character!.gold,876,'original gold');});
test('799 is locked and 800 unlocks the third character',()=>{
 const locked=atAccountLevel(second(),799,thirdSlotLevels);
 equal(accountSkillLevel(locked),799,'sum before third slot boundary');
 equal(unlockedCharacterSlots(locked),2,'799 must not unlock third slot');
 equal(characterCreationError(locked)?.includes('800'),true,'UI reports the 800 requirement');
 throws(()=>createAccountCharacter(locked,'HEXWEAVER','Alia','male',1000),'799 denied');
 const ready=atAccountLevel(second(),800,thirdSlotLevels);
 equal(accountSkillLevel(ready),800,'third slot boundary exact');
 equal(unlockedCharacterSlots(ready),3,'800 unlocks third slot');
 equal(characterCreationError(ready),undefined,'ready character can be recruited');
 equal(accountCharacters(createAccountCharacter(ready,'HEXWEAVER','Alia','male',1000)).length,3,'third created');
});
test('1050 account skills do not create a fourth character after three distinct roles',()=>{let state=createAccountCharacter(atAccountLevel(second(),800,thirdSlotLevels),'HEXWEAVER','Alia','male',1000);state=skillLevels(state,[100,100,100,100,100]);equal(unlockedCharacterSlots(state),3,'three slot cap');equal(occupiedCharacterRoles(state),['Tank','Damage','Support'],'all roles filled');throws(()=>createAccountCharacter(state,'RAVAGER','Fourth','female',1000),'fourth denied');});
test('legacy fourth and fifth characters remain accessible but cannot be replaced',()=>{let state=createAccountCharacter(atAccountLevel(second(),800,thirdSlotLevels),'HEXWEAVER','Third','male',1000);const saved=state.otherCharacters![0];state.otherCharacters=[...state.otherCharacters!,{...saved,character:{...saved.character,id:'LEGACY_CHAR_4',name:'Legacy Four'}},{...saved,character:{...saved.character,id:'LEGACY_CHAR_5',name:'Legacy Five'}}];state.account.unlockedCharacterSlots=5;const migrated=migrateSave(JSON.parse(JSON.stringify(state)));equal(accountCharacters(migrated).length,5,'grandfathered roster');equal(unlockedCharacterSlots(migrated),5,'occupied slots retained');throws(()=>createAccountCharacter(migrated,'RAVAGER','Sixth','male',1000),'new creation forbidden');const switched=switchAccountCharacter(migrated,'LEGACY_CHAR_5',1000);equal(switched.character!.id,'LEGACY_CHAR_5','old fifth character still playable');});
test('the third character must fill the remaining role in any starting order',()=>{for(const [firstClass,secondClass,lastClass] of [['WAYFINDER','IRONWARDEN','DAWNKEEPER'],['STONECALLER','HEXWEAVER','BASTION'],['IRONWARDEN','DAWNKEEPER','RAVAGER']] as const){let state=createCharacter(newGame(1000),firstClass,'First');state=atAccountLevel(state,250,[50,50,50,50,41]);state=createAccountCharacter(state,secondClass,'Second','female',1000);state=atAccountLevel(state,800,thirdSlotLevels);const wrong=CLASSES.find(c=>c.role===CLASSES.find(d=>d.id===secondClass)!.role)!.id;throws(()=>createAccountCharacter(state,wrong,'Duplicate','male',1000),'second role duplicate rejected');state=createAccountCharacter(state,lastClass,'Third','male',1000);equal(occupiedCharacterRoles(state),['Tank','Damage','Support'],'all roles represented');}});
test('only enabled persistent XP-derived skills contribute',()=>{const state=first();state.character!.level=999;state.skills[0].level=99;state.skills.push({...state.skills[0]}, {skillId:'future_skill',xp:1e12,level:100} as any);equal(accountSkillLevel(state),13,'no display levels, duplicates, character level or future skills');});
test('invalid XP does not inflate account progression',()=>{const state=first();state.skills[0].xp=Infinity;state.skills[1].xp=NaN;state.skills[2].xp=-500;equal(accountSkillLevel(state),13,'invalid XP base');});
test('earned slot watermark never relocks',()=>{let state=recordAccountProgress(eligible());state=skillLevels(state,[1,1,1,1,1]);equal(accountSkillLevel(state),13,'current total falls');equal(unlockedCharacterSlots(state),2,'earned slot retained');equal(migrateSave(JSON.parse(JSON.stringify(state))).account.unlockedCharacterSlots,2,'save retained');});
test('already earned third slot survives lowering progression',()=>{let state=recordAccountProgress(atAccountLevel(second(),800,thirdSlotLevels));equal(state.account.unlockedCharacterSlots,3,'third slot earned');state=skillLevels(state,[1,1,1,1,1]);equal(unlockedCharacterSlots(state),3,'previously earned third slot retained');});
test('legacy third slot earned under the previous 550 requirement stays unlocked',()=>{const saved=atAccountLevel(second(),550,[60,60,60,60,50]);saved.account.unlockedCharacterSlots=3;equal(accountSkillLevel(saved),550,'old progression');equal(unlockedCharacterSlots(saved),3,'third slot watermark grandfathered');equal(accountCharacters(createAccountCharacter(saved,'HEXWEAVER','Legacy Third','male',1000)).length,3,'previously unlocked slot usable');});
test('existing roster keeps its occupied slots if old progression is missing',()=>{let state=second();state.account.unlockedCharacterSlots=1;state=skillLevels(state,[1,1,1,1,1]);state.otherCharacters=state.otherCharacters!.map(entry=>({...entry,skills:entry.skills.map(skill=>({...skill,xp:0,level:1}))}));equal(unlockedCharacterSlots(state),2,'existing roster never relocks');});
test('account bank, purchases, profile ownership and Gems are shared, not cloned',()=>{const prior=eligible();prior.bank.stacks=[{itemId:'COPPER_ORE',quantity:7}];prior.account.premiumCurrencyBalance=321;prior.account.ownedBoostIds=['boost:combat_focus'];prior.account.unlockedCosmeticPetIds=['pet_harvest_fox'];let state=createAccountCharacter(prior,'DAWNKEEPER','Alia','female',1000);equal(state.bank.stacks,prior.bank.stacks,'bank');equal(state.account.premiumCurrencyBalance,321,'Gems');ok(!('bank' in state.otherCharacters![0]),'no private bank copy');state={...state,bank:{...state.bank,stacks:[]}};equal(switchAccountCharacter(state,'LOCAL_CHAR_1',1000).bank.stacks,[],'bank changed for all');});
test('switching restores character state and identity',()=>{let state=second();state.character!.gold=42;state.inventory.stacks=[{itemId:'COPPER_ORE',quantity:3}];state=switchAccountCharacter(state,'LOCAL_CHAR_1',1000);equal(state.character!.name,'Mira','first name');equal(state.character!.gold,100,'first wallet');state=switchAccountCharacter(state,'LOCAL_CHAR_2',1000);equal(state.character!.gold,42,'second wallet');equal(state.inventory.stacks,[{itemId:'COPPER_ORE',quantity:3}],'second inventory');});
test('character cards retain creation order across switches and saves',()=>{
 let state=createAccountCharacter(atAccountLevel(second(),800,thirdSlotLevels),'HEXWEAVER','Third','male',1000);
 const order=()=>orderedCharacterRoster(state).map(entry=>entry.character.id);
 const expected=['LOCAL_CHAR_1','LOCAL_CHAR_2','LOCAL_CHAR_3'];
 equal(order(),expected,'creation sequence while third is playing');
 state=switchAccountCharacter(state,'LOCAL_CHAR_1',1000);
 equal(order(),expected,'creation sequence while first is playing');
 state=switchAccountCharacter(state,'LOCAL_CHAR_2',1000);
 equal(order(),expected,'creation sequence while second is playing');
 state=projectCharacter(state,'LOCAL_CHAR_3');
 equal(order(),expected,'projection keeps the same roster order');
 state=migrateSave(JSON.parse(JSON.stringify(state)));
 equal(order(),expected,'save migration keeps the same roster order');
});
test('online creation timestamps control roster order for opaque character IDs',()=>{
 const state=second();
 state.character!.id='00000000-0000-4000-a000-000000000001';
 state.otherCharacters![0].character.id='ffffffff-ffff-4fff-afff-ffffffffffff';
 const serverCreationIds=[state.otherCharacters![0].character.id,state.character!.id];
 equal(orderedCharacterRoster(state,serverCreationIds).map(row=>row.character.id),serverCreationIds,'database creation order overrides UUID lexical order and active selection');
});
test('unknown character switch is rejected without mutation',()=>{const state=second(),before=JSON.stringify(state);throws(()=>switchAccountCharacter(state,'NOT_OWNED',1000),'ownership');equal(JSON.stringify(state),before,'atomic failure');});
test('v11 round trip preserves all characters and shared scopes',()=>{const state=second(),round=migrateSave(JSON.parse(JSON.stringify(state)));equal(round.version,11,'version');equal(accountCharacters(round).length,2,'roster');equal(accountSkillLevel(round),accountSkillLevel(state),'total');equal(round.character!.id,state.character!.id,'active selection');equal(round.otherCharacters![0].character.id,'LOCAL_CHAR_1','inactive');});
test('duplicate, oversized and future saves fail safely',()=>{const raw=JSON.parse(JSON.stringify(second()));raw.otherCharacters[0].character.id=raw.character.id;throws(()=>migrateSave(raw),'duplicate');const oversized=JSON.parse(JSON.stringify(second()));oversized.otherCharacters=Array(5).fill(oversized.otherCharacters[0]);throws(()=>migrateSave(oversized),'oversized');throws(()=>migrateSave({...first(),version:12}),'future version');});
test('every class remains available as the first choice, but roster creation excludes the occupied role',()=>{for(const cls of CLASSES){equal(createCharacter(newGame(1000),cls.id,'First').character!.classId,cls.id,'all starting classes');if(cls.role==='Tank')throws(()=>createAccountCharacter(eligible(),cls.id,'Tester','female',1000),'occupied tank role');else equal(createAccountCharacter(eligible(),cls.id,'Tester','female',1000).character!.classId,cls.id,'open role');}});

test('permanent ownership is not truncated by claim-history limits',()=>{const state=first();state.account.unlockedCosmeticPetIds=Array.from({length:200},(_,index)=>`legacy_pet_${index}`);state.account.unlockedCosmeticPetIds.push('pet_harvest_fox');const normalized=migrateSave(JSON.parse(JSON.stringify(state)));equal(normalized.account.unlockedCosmeticPetIds!.length,201,'all permanent IDs preserved');});

test('legacy ownership from any character preserves another character selected pet on normalization',()=>{const state=second();state.account.unlockedCosmeticPetIds=[];state.character!.ownedPetIds=['pet_harvest_fox'];state.otherCharacters![0].character.selectedCosmeticPetId='pet_harvest_fox';const migrated=migrateSave(JSON.parse(JSON.stringify(state)));equal(migrated.otherCharacters![0].character.selectedCosmeticPetId,'pet_harvest_fox','ownership union before cleaning inactive selection');equal(migrated.account.unlockedCosmeticPetIds,['pet_harvest_fox'],'one account owner');});
