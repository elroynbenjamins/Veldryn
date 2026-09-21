import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {createCharacter,newGame} from '../src/core/game';
import {gearEnhancement} from '../src/core/equipment-enhancement';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const base=createCharacter(newGame(1000),'IRONWARDEN','Socket Migrator','male');
const legacyPiece=EQUIPMENT_ITEMS_V33.find(item=>item.classRestriction==='IRONWARDEN'&&item.rarity==='mythic'&&!!item.slot);
if(!legacyPiece||!legacyPiece.slot)throw new Error('Expected an Ironwarden Mythic V33 piece');
const itemId=legacyPiece.id;
const legacy={...base,version:6 as const,character:{...base.character!,equipment:{...base.character!.equipment,[legacyPiece.slot]:itemId},gearEnhancements:{[itemId]:{rank:4,failures:2,gemIds:['WARD_SHARD','WARD_SHARD','EMBER_SHARD']}}}};
const migrated=parseSaveBackup(JSON.stringify(legacy));
const legacyEnhancement=gearEnhancement(migrated,itemId);
ok(legacyEnhancement.rank===4&&legacyEnhancement.failures===2,'Socket migration must preserve upgrade rank and pity');
ok(legacyEnhancement.statGemId==='WARD_SHARD','First compatible legacy Stat Gem must become the typed Stat slot');
ok(legacyEnhancement.effectGemId===undefined,'Old Stat Gems must never be misclassified as Effect Gems');
ok(legacyEnhancement.legacyGemIds?.length===2,'Every old extra socketed gem must remain recoverable');
ok(legacyEnhancement.gemIds.length===3,'Compatibility view must preserve the exact legacy item count');

const typed={...migrated,character:{...migrated.character!,gearEnhancements:{...migrated.character!.gearEnhancements,[itemId]:{rank:4,failures:2,statGemId:'WARD_SHARD',effectGemId:'GEFF_001',legacyGemIds:['EMBER_SHARD'],gemIds:['WARD_SHARD','GEFF_001','EMBER_SHARD']}}}};
const roundTrip=parseSaveBackup(createSaveBackup(typed,new Date('2026-09-21T00:00:00Z')));
const typedEnhancement=gearEnhancement(roundTrip,itemId);
ok(typedEnhancement.statGemId==='WARD_SHARD'&&typedEnhancement.effectGemId==='GEFF_001','Typed Stat and Effect slots must survive backup round-trip');
ok(typedEnhancement.legacyGemIds?.[0]==='EMBER_SHARD','Retained legacy gem must survive backup round-trip');
ok(typedEnhancement.gemIds.join(',')==='WARD_SHARD,GEFF_001,EMBER_SHARD','Flattened compatibility view must remain deterministic');

console.log('PASS: old generic sockets migrate without item loss and typed sockets round-trip safely');
