import {createCharacter,newGame} from '../src/core/game';
import {characterManagementBlocker,createAccountCharacter,deleteAccountCharacter,rerollAccountCharacter} from '../src/core/account-actions';
import {accountCharacters,unlockedCharacterSlots} from '../src/core/account-roster';

function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`)}
function throws(action:()=>unknown,message:string){let did=false;try{action()}catch{did=true}if(!did)throw new Error(`Expected throw: ${message}`)}

function first(){
 const state=createCharacter(newGame(1000),'IRONWARDEN','Mira','female');
 state.account.unlockedCharacterSlots=2;
 state.account.premiumCurrencyBalance=321;
 state.bank.stacks=[{itemId:'COPPER_ORE',quantity:7}];
 state.unlockedMonsterIds=['MOSS_RAT','FIELD_WISP'];
 state.defeatedBossIds=['FALLEN_KNIGHT'];
 state.rewardRemainders={COPPER_ORE:.5};
 return state;
}
function two(){return createAccountCharacter(first(),'BASTION','Rowan','male',1100)}

{
 const created=two();
 equal(created.bank.stacks,[{itemId:'COPPER_ORE',quantity:7}],'new character preserves shared Bank');
 equal(created.unlockedMonsterIds,['MOSS_RAT','FIELD_WISP'],'new character preserves shared monster unlocks');
 equal(created.defeatedBossIds,['FALLEN_KNIGHT'],'new character preserves shared boss progress');
 equal(created.rewardRemainders,{COPPER_ORE:.5},'new character preserves shared root progression');
 equal(created.account.premiumCurrencyBalance,321,'new character preserves premium currency');
}
{
 let state=two();
 const oldId=state.character!.id,createdCount=state.account.createdCharacterCount;
 state.character!.level=37;state.character!.xp=12345;state.character!.gold=9876;
 state.inventory.stacks=[{itemId:'COPPER_ORE',quantity:3}];
 const rerolled=rerollAccountCharacter(state,oldId,'HEXWEAVER','Nova','female','Rowan',2000);
 ok(rerolled.character!.id!==oldId,'reroll creates a fresh character identity');
 equal(rerolled.character!.classId,'HEXWEAVER','reroll changes class');
 equal(rerolled.character!.name,'Nova','reroll uses the reviewed replacement name');
 equal(rerolled.character!.level,1,'reroll resets level');
 equal(rerolled.character!.gold,100,'reroll resets personal Gold');
 equal(rerolled.bank.stacks,[{itemId:'COPPER_ORE',quantity:7}],'reroll preserves shared Bank');
 equal(rerolled.account.premiumCurrencyBalance,321,'reroll preserves account currency');
 equal(unlockedCharacterSlots(rerolled),2,'reroll does not relock an earned slot after skill reset');
 equal(rerolled.account.createdCharacterCount,createdCount+1,'reroll advances lifetime character count');
 ok(accountCharacters(rerolled).some(entry=>entry.character.name==='Mira'),'other characters survive reroll');
}
{
 const state=two(),before=JSON.stringify(state);
 throws(()=>rerollAccountCharacter(state,state.character!.id,'HEXWEAVER','Nova','female','rowan',2000),'confirmation is exact');
 equal(JSON.stringify(state),before,'failed confirmation leaves state untouched');
}
{
 const state=two();
 state.character!.activityQueue=[{kind:'combat',targetId:'MOSS_RAT'} as any];
 ok(characterManagementBlocker(state,state.character!.id)?.includes('queue'),'queued work blocks management');
 throws(()=>rerollAccountCharacter(state,state.character!.id,'HEXWEAVER','Nova','female','Rowan',2000),'queued reroll blocked');
}
{
 const state=two(),weapon=state.character!.equipment.weapon!;
 state.character!.gearEnhancements={[weapon]:{rank:0,failures:0,gemIds:['WARD_SHARD']}};
 ok(characterManagementBlocker(state,state.character!.id)?.includes('Socketed'),'socketed gems block management');
 throws(()=>deleteAccountCharacter(state,state.character!.id,'Rowan',2000),'socketed delete blocked');
}
{
 const state=two(),activeId=state.character!.id;
 const deleted=deleteAccountCharacter(state,'LOCAL_CHAR_1','Mira',2000);
 equal(deleted.character!.id,activeId,'deleting inactive character keeps current selection');
 equal(accountCharacters(deleted).length,1,'inactive deletion removes only target');
 equal(unlockedCharacterSlots(deleted),2,'deletion keeps earned slot watermark');
}
{
 const state=two();
 const deleted=deleteAccountCharacter(state,state.character!.id,'Rowan',2000);
 equal(deleted.character!.name,'Mira','deleting active character promotes another owned character');
 equal(accountCharacters(deleted).length,1,'active deletion keeps remaining character');
 equal(deleted.bank.stacks,[{itemId:'COPPER_ORE',quantity:7}],'active deletion preserves shared Bank');
}
{
 const state=first();
 throws(()=>deleteAccountCharacter(state,state.character!.id,'Mira',2000),'last character delete forbidden');
 const rerolled=rerollAccountCharacter(state,state.character!.id,'BASTION','Mira II','male','Mira',2000);
 equal(rerolled.character!.classId,'BASTION','last character can reroll instead');
}
{
 const state=two(),weapon=state.character!.equipment.weapon!;
 state.character!.gearEnhancements={[weapon]:{rank:7,failures:2,gemIds:[]}};
 const rerolled=rerollAccountCharacter(state,state.character!.id,'DAWNKEEPER','Sol','male','Rowan',2000);
 equal(rerolled.character!.classId,'DAWNKEEPER','upgrade ranks warn but do not permanently trap a character slot');
}
console.log('character management tests passed');
