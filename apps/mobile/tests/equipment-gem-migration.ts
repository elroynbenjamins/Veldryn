import {createCharacter,newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const base=createCharacter(newGame(1),'IRONWARDEN','Legacy Gems','male');
const legacy:any={...base,version:6,character:{...base.character!,gearEnhancements:{basic_sword:{rank:3,failures:1,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']}}},bank:{...base.bank,stacks:[]}};
const migrated=normalizeSave(legacy);
const enhancement=migrated.character!.gearEnhancements!.basic_sword;
ok(enhancement.statGemId==='WARD_SHARD','First legacy Stat Gem must remain socketed');
ok(enhancement.effectGemId==='SWIFT_SIGIL','Legacy Effect Gem must migrate into Effect socket');
ok(enhancement.gemIds.join(',')==='WARD_SHARD,SWIFT_SIGIL','Read-model gemIds must derive from named sockets');
ok(migrated.bank.stacks.find(stack=>stack.itemId==='EMBER_SHARD')?.quantity===1,'Displaced second legacy Stat Gem must be refunded to Bank');

const normalizedAgain=normalizeSave({...migrated,version:6} as any);
ok(normalizedAgain.bank.stacks.find(stack=>stack.itemId==='EMBER_SHARD')?.quantity===1,'Named-slot saves must not refund legacy gems repeatedly');

console.log('PASS: legacy multi-gem equipment migrates without deleting displaced gems');
