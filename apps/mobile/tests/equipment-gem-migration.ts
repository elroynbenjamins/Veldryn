import {createCharacter,newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';
import {gearEnhancement} from '../src/core/equipment-enhancement';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const base=createCharacter(newGame(1),'IRONWARDEN','Legacy Gems','male');
const legacy:any={...base,version:6,character:{...base.character!,gearEnhancements:{basic_sword:{rank:3,failures:1,gemIds:['WARD_SHARD','EMBER_SHARD','SWIFT_SIGIL']}}},bank:{...base.bank,stacks:[]}};
const migrated=normalizeSave(legacy);
const instanceId=migrated.character!.equippedGearInstanceIds?.weapon;
ok(!!instanceId,'Legacy equipped gear must migrate to a concrete equipped instance');
const enhancement=gearEnhancement(migrated,'basic_sword',instanceId);
ok(enhancement.statGemId==='WARD_SHARD','First legacy Stat Gem must remain socketed on the migrated exact copy');
ok(enhancement.effectGemId==='SWIFT_SIGIL','Legacy Effect Gem must migrate into that copy\'s Effect socket');
ok(enhancement.gemIds.join(',')==='WARD_SHARD,SWIFT_SIGIL','Per-instance read-model gemIds must derive from named sockets');
ok(Object.keys(migrated.character!.gearEnhancements??{}).length===0,'Legacy item-keyed enhancement compatibility state must be cleared after migration');
ok(migrated.bank.stacks.find(stack=>stack.itemId==='EMBER_SHARD')?.quantity===1,'Displaced second legacy Stat Gem must be refunded to Bank');

const normalizedAgain=normalizeSave({...migrated,version:6} as any);
ok(normalizedAgain.bank.stacks.find(stack=>stack.itemId==='EMBER_SHARD')?.quantity===1,'Named-slot saves must not refund legacy gems repeatedly');

console.log('PASS: legacy multi-gem equipment migrates without deleting displaced gems');
