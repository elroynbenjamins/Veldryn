import {characterDeleteBlockReason,characterDeleteConfirmation} from '../src/core/account-actions';
import {accountCharacters,unlockedCharacterSlots} from '../src/core/account-roster';
import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}
function throws(action:()=>unknown,message:string){let failed=false;try{action()}catch{failed=true}if(!failed)throw new Error(message)}
function storedQty(state:ReturnType<typeof newGame>,id:string){return state.bank.stacks.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0)+state.overflow.stacks.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0)}

const firstId='11111111-1111-4111-8111-111111111111';
const secondId='22222222-2222-4222-8222-222222222222';

let state=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'First',body:'male'}},1,{characterId:firstId}).state;
state={...state,account:{...state.account,unlockedCharacterSlots:2,premiumCurrencyBalance:77,guildMember:true,arenaSquadCharacterIds:[firstId,secondId],unlockedCosmeticPetIds:[],ownedBoostIds:[]}};
state=executeGameCommand(state,{type:'roster_create',args:{classId:'BASTION',name:'Second',body:'female'}},2,{characterId:secondId}).state;

const equipped=state.character!.equipment.weapon!;
state={...state,
 character:{...state.character!,gold:987,ownedPetIds:['PET_001'],ownedBoostIds:['BOOST_TEST'],equippedToolIds:{mining:'TEST_PICKAXE'},gearEnhancements:{[equipped]:{rank:6,failures:2,statGemId:'WARD_SHARD',effectGemId:'SWIFT_SIGIL',gemIds:['WARD_SHARD','SWIFT_SIGIL']}}},
 inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'EMBER_SHARD',quantity:3}]},
};

throws(()=>executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:'Second'}},3),'deletion must require the exact typed confirmation phrase');

state={...state,activity:{kind:'mining',targetId:'COPPER_VEIN',startedAtMs:1,lastClaimAtMs:1} as any};
ok(characterDeleteBlockReason(state,secondId)?.includes('activity'),'active character activity must block deletion');
throws(()=>executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:characterDeleteConfirmation('Second')}},3),'active character activity must reject deletion');

state={...state,activity:null,account:{...state.account,equipmentCraftingQueue:[{id:'craft-1',recipeId:'TEST_RECIPE',ownerCharacterId:secondId,startedAtMs:1,completesAtMs:2}]}};
ok(characterDeleteBlockReason(state,secondId)?.includes('equipment crafts'),'queued equipment crafts must block deletion');
throws(()=>executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:characterDeleteConfirmation('Second')}},3),'queued equipment crafts must reject deletion');

state={...state,account:{...state.account,equipmentCraftingQueue:[]}};
equal(characterDeleteBlockReason(state,secondId),undefined,'idle character with no owned craft jobs should be deletable');
const storedBeforeDelete={
 equipped:storedQty(state,equipped),
 tool:storedQty(state,'TEST_PICKAXE'),
 statGem:storedQty(state,'WARD_SHARD'),
 effectGem:storedQty(state,'SWIFT_SIGIL'),
 inventory:storedQty(state,'EMBER_SHARD'),
};
const deleted=executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:characterDeleteConfirmation('Second')}},3).state;
equal(deleted.character?.id,firstId,'deleting the active character should hand off to another owned character');
equal(accountCharacters(deleted).length,1,'deleted character must leave the authoritative roster');
ok(!deleted.account.arenaSquadCharacterIds?.includes(secondId),'deleted character must be removed from Arena references');
equal(deleted.account.premiumCurrencyBalance,77,'premium currency is account-wide and must survive character deletion');
equal(deleted.account.guildMember,true,'Guild membership is account-wide and must survive character deletion');
equal(deleted.account.unlockedCharacterSlots,2,'earned character slots must remain unlocked after deletion');
ok(deleted.account.unlockedCosmeticPetIds?.includes('PET_001'),'legacy character pet ownership must be promoted to account ownership before deletion');
ok(deleted.account.ownedBoostIds?.includes('BOOST_TEST'),'legacy permanent boosts must be promoted to account ownership before deletion');
equal(storedQty(deleted,equipped),storedBeforeDelete.equipped+1,'equipped gear must be recovered exactly once');
equal(storedQty(deleted,'TEST_PICKAXE'),storedBeforeDelete.tool+1,'equipped gathering tools must be recovered exactly once');
equal(storedQty(deleted,'WARD_SHARD'),storedBeforeDelete.statGem+1,'Stat Gem must be recovered exactly once');
equal(storedQty(deleted,'SWIFT_SIGIL'),storedBeforeDelete.effectGem+1,'Effect Gem must be recovered exactly once');
equal(storedQty(deleted,'EMBER_SHARD'),storedBeforeDelete.inventory+3,'character Inventory stacks must be recovered without loss or duplication');

let inactiveBusy=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Runner',body:'male'}},1,{characterId:firstId}).state;
inactiveBusy={...inactiveBusy,account:{...inactiveBusy.account,unlockedCharacterSlots:2}};
inactiveBusy=executeGameCommand(inactiveBusy,{type:'roster_create',args:{classId:'BASTION',name:'Keeper',body:'female'}},2,{characterId:secondId}).state;
inactiveBusy={...inactiveBusy,otherCharacters:inactiveBusy.otherCharacters!.map(entry=>entry.character.id===firstId?{...entry,activity:{kind:'mining',targetId:'COPPER_VEIN',startedAtMs:1,lastClaimAtMs:1} as any}:entry)};
throws(()=>executeGameCommand(inactiveBusy,{type:'roster_delete',args:{id:firstId,confirmation:characterDeleteConfirmation('Runner')}},3),'inactive characters with an activity must require switch/stop before deletion');

let solo=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Solo',body:'male'}},1,{characterId:firstId}).state;
solo={...solo,skills:solo.skills.map(skill=>({...skill,xp:999999999,level:99})),account:{...solo.account,premiumCurrencyBalance:123,guildMember:true,unlockedCharacterSlots:undefined}};
const earnedBeforeDelete=unlockedCharacterSlots(solo);
ok(earnedBeforeDelete>=2,'test fixture must earn at least one extra character slot from combined skills');
const soloDeleted=executeGameCommand(solo,{type:'roster_delete',args:{id:firstId,confirmation:characterDeleteConfirmation('Solo')}},4).state;
equal(soloDeleted.character,null,'deleting the only character should return the account to character creation');
equal(soloDeleted.account.premiumCurrencyBalance,123,'solo deletion must preserve account currency');
equal(soloDeleted.account.guildMember,true,'solo deletion must preserve account Guild membership');
equal(soloDeleted.account.unlockedCharacterSlots,earnedBeforeDelete,'skill-earned character slots must be banked permanently before deleting the character');

console.log('PASS safe character delete/reroll management preserves account scope, blocks unsafe deletion and recovers character-held items');
