import {createCharacter,newGame} from '../src/core/game';
import {MONSTERS} from '../src/content/monsters';
import {noviceItemId,noviceSetFor} from '../src/content/novice-sets';
import {debugPrepareDungeonLab,debugPrepareEquipmentLab,debugPrepareFullQaSandbox} from '../src/dev/debug-tools';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const base=createCharacter(newGame(0),'IRONWARDEN','QA Tester');

const equipment=debugPrepareEquipmentLab(base);
equal(equipment.skills.every(skill=>skill.level===100),true);
ok((equipment.character?.gold??0)>=50_000_000);
equal(equipment.account.unlockedCharacterSlots,5);
equal(equipment.account.entitlements?.supporter,true);
equal(equipment.account.entitlements?.vip_plus,true);
ok((equipment.inventory.stacks.find(row=>row.itemId==='TEMPERING_DUST')?.quantity??0)>=9999);

const dungeon=debugPrepareDungeonLab(base);
equal(dungeon.character?.level,100);
for(const slot of noviceSetFor('IRONWARDEN').slots)equal(dungeon.character?.equipment[slot],noviceItemId('IRONWARDEN',slot));

const full=debugPrepareFullQaSandbox(base);
equal(full.character?.level,100);
equal(full.quests.every(quest=>quest.status==='claimed'),true);
equal(full.unlockedMonsterIds.length,MONSTERS.length);
for(const boss of MONSTERS.filter(monster=>monster.boss))ok(full.defeatedBossIds.includes(boss.id));
equal(full.account.guildMember,true);
ok((full.account.premiumCurrencyBalance??0)>=99_999);

console.log('PASS developer QA sandbox grants access without granting finished crafted equipment');
