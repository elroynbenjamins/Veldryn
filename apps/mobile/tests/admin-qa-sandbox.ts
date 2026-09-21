import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../src/core/game';
import {MONSTERS} from '../src/content/monsters';
import {noviceItemId,noviceSetFor} from '../src/content/novice-sets';
import {debugPrepareDungeonLab,debugPrepareEquipmentLab,debugPrepareFullQaSandbox} from '../src/dev/debug-tools';

const base=createCharacter(newGame(0),'IRONWARDEN','QA Tester');

const equipment=debugPrepareEquipmentLab(base);
assert.equal(equipment.skills.every(skill=>skill.level===100),true);
assert.ok((equipment.character?.gold??0)>=50_000_000);
assert.equal(equipment.account.unlockedCharacterSlots,5);
assert.equal(equipment.account.entitlements?.supporter,true);
assert.equal(equipment.account.entitlements?.vip_plus,true);
assert.ok((equipment.inventory.stacks.find(row=>row.itemId==='TEMPERING_DUST')?.quantity??0)>=9999);

const dungeon=debugPrepareDungeonLab(base);
assert.equal(dungeon.character?.level,100);
for(const slot of noviceSetFor('IRONWARDEN').slots)assert.equal(dungeon.character?.equipment[slot],noviceItemId('IRONWARDEN',slot));

const full=debugPrepareFullQaSandbox(base);
assert.equal(full.character?.level,100);
assert.equal(full.quests.every(quest=>quest.status==='claimed'),true);
assert.equal(full.unlockedMonsterIds.length,MONSTERS.length);
for(const boss of MONSTERS.filter(monster=>monster.boss))assert.ok(full.defeatedBossIds.includes(boss.id));
assert.equal(full.account.guildMember,true);
assert.ok((full.account.premiumCurrencyBalance??0)>=99_999);

console.log('PASS developer QA sandbox grants access without granting finished crafted equipment');
