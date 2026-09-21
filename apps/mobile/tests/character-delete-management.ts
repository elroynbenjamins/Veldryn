import {executeGameCommand} from '../src/core/game-commands';
import {createCharacter,newGame} from '../src/core/game';
import {accountCharacters} from '../src/core/account-roster';
import {characterDeleteConfirmation} from '../src/core/account-actions';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}
function throws(action:()=>unknown,message:string){let failed=false;try{action()}catch{failed=true}if(!failed)throw new Error(message)}
function qty(state:ReturnType<typeof newGame>,id:string){return state.bank.stacks.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0)+state.overflow.stacks.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0)}

const firstId='11111111-1111-4111-8111-111111111111';
const secondId='22222222-2222-4222-8222-222222222222';
let state=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'First',body:'male'}},1,{characterId:firstId}).state;
state={...state,account:{...state.account,unlockedCharacterSlots:2,premiumCurrencyBalance:77,guildMember:true,arenaSquadCharacterIds:[firstId]}};
state=executeGameCommand(state,{type:'roster_create',args:{classId:'BASTION',name:'Second',body:'female'}},2,{characterId:secondId}).state;
const equipped=state.character!.equipment.weapon!;
state={...state,
 character:{...state.character!,gold:987,gearEnhancements:{[equipped]:{rank:6,failures:2,statGemId:'WARD_SHARD',effectGemId:'SWIFT_SIGIL',gemIds:['WARD_SHARD','SWIFT_SIGIL']}}},
 inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'EMBER_SHARD',quantity:3}]},
 account:{...state.account,arenaSquadCharacterIds:[firstId,secondId]}
};

throws(()=>executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:'Second'}},3),'deletion must require the exact typed confirmation phrase');
const deleted=executeGameCommand(state,{type:'roster_delete',args:{id:secondId,confirmation:characterDeleteConfirmation('Second')}},3).state;
equal(deleted.character?.id,firstId,'deleting the active character should hand off to another owned character');
equal(accountCharacters(deleted).length,1,'deleted character must leave the authoritative roster');
ok(!deleted.account.arenaSquadCharacterIds?.includes(secondId),'deleted character must be removed from account roster references');
equal(deleted.account.premiumCurrencyBalance,77,'premium currency is account-wide and must survive character deletion');
equal(deleted.account.guildMember,true,'Guild membership is account-wide and must survive character deletion');
ok(qty(deleted,equipped)>=1,'equipped gear must be recovered to shared Bank/Overflow');
ok(qty(deleted,'WARD_SHARD')>=1&&qty(deleted,'SWIFT_SIGIL')>=1,'socketed gems must be recovered before enhancement state is discarded');
ok(qty(deleted,'EMBER_SHARD')>=3,'character Inventory must be recovered to shared Bank/Overflow');

let activeBlock=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Runner',body:'male'}},1,{characterId:firstId}).state;
activeBlock={...activeBlock,account:{...activeBlock.account,unlockedCharacterSlots:2}};
activeBlock=executeGameCommand(activeBlock,{type:'roster_create',args:{classId:'BASTION',name:'Keeper',body:'female'}},2,{characterId:secondId}).state;
activeBlock={...activeBlock,otherCharacters:activeBlock.otherCharacters!.map(entry=>entry.character.id===firstId?{...entry,activity:{kind:'mining',targetId:'TEST_NODE',startedAtMs:1,lastClaimAtMs:1}}:entry)};
throws(()=>executeGameCommand(activeBlock,{type:'roster_delete',args:{id:firstId,confirmation:characterDeleteConfirmation('Runner')}},3),'inactive characters with an activity must require switch/stop before deletion');

let solo=createCharacter(newGame(1),'IRONWARDEN','Solo','male');
solo={...solo,account:{...solo.account,premiumCurrencyBalance:123,unlockedCharacterSlots:3,guildMember:true},bank:{...solo.bank,stacks:[{itemId:'EMBER_SHARD',quantity:2}]}};
const soloDeleted=executeGameCommand(solo,{type:'roster_delete',args:{id:solo.character!.id,confirmation:characterDeleteConfirmation('Solo')}},4).state;
equal(soloDeleted.character,null,'deleting the only character should return the account to character creation');
equal(soloDeleted.account.premiumCurrencyBalance,123,'solo deletion must preserve account currency');
equal(soloDeleted.account.unlockedCharacterSlots,3,'earned character slots must not relock after deletion');
equal(soloDeleted.account.guildMember,true,'solo deletion must preserve account Guild membership');
ok(qty(soloDeleted,'EMBER_SHARD')>=2,'existing shared Bank contents must survive solo deletion');

console.log('PASS safe character delete/recreate management preserves account scope and recovers items');
