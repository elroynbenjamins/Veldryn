import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../types';
import {ENEMY_V2_RULESET,prepareEnemyV2} from '../enemy-v2-prototype';
import {enemyV2CombatCards} from '../enemy-v2-presentation';
import {prepareAsterfallBossV2} from '../boss-v2-asterfall-prototype';
import {prepareRegionalBossV2} from '../boss-v2-regional-prototype';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';

const wolf:CombatantDefinition={
  id:'PREDATOR_PREVIEW',name:'Preview Wolf',team:'enemies',role:'enemy',level:25,
  stats:{maxHp:1000,attackPower:100,healingPower:0,defense:70,accuracy:600,evasion:80,
    critChance:.05,critMultiplier:1.5,haste:0},
  basicAttackMs:2500,basicAttackCoeff:.8,abilities:[],
  tags:['pve:archetype:assassin'],
};
const seed='private-do-not-show';
const generated=prepareEnemyV2([wolf],{
  ruleset:ENEMY_V2_RULESET,serverSeed:seed,
  encounterId:'TEST_PREVIEW',region:'asterfall',equipmentTier:5,
  eliteEnemyIds:[wolf.id],
});
const wolfCard=enemyV2CombatCards(generated.enemies)[0];
assert.equal(wolfCard.enemyId,wolf.id);
assert.equal(wolfCard.name,wolf.name);
assert.equal(wolfCard.archetype?.id,'predator');
assert.ok(wolfCard.traits.length>=1&&wolfCard.traits.length<=2);
assert.ok(wolfCard.traits.every(trait=>trait.label.length>0&&trait.description.length>0));
assert.ok(wolfCard.traits.every(trait=>['swords','shield','sparkles'].includes(trait.icon)));
assert.equal(wolfCard.boss,undefined);
assert.deepEqual(enemyV2CombatCards([{...wolf,team:'players'}]),[],'no player metadata is projected');

const all=['BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR','BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'];
for(const id of all){
  const definition=EXPEDITION_ENCOUNTERS[id]()[0];
  const experimental=(id==='BOSS_EXP_ROOT'||id==='BOSS_EXP_BELL')
    ?prepareAsterfallBossV2(definition,ENEMY_V2_RULESET)
    :prepareRegionalBossV2(definition,ENEMY_V2_RULESET);
  const legacy=enemyV2CombatCards([definition])[0];
  assert.equal(legacy.boss,undefined,'legacy bosses must not display unfinished 2.0 mechanics');
  const card=enemyV2CombatCards([experimental])[0];
  assert.equal(card.name,definition.name);
  assert.deepEqual(card.boss?.phases.map(p=>p.hpPct),[70,35]);
  assert.ok((card.boss?.casts.length??0)>=2);
  assert.ok((card.boss?.casts.length??0)<=4,'mobile preview must remain compact');
  assert.ok(card.boss?.casts.every(c=>c.label.length>0&&c.castMs>=0));
  const json=JSON.stringify(card);
  for(const secret of ['attackPower','maxHp','healingPower','defense','accuracy','evasion','critChance',
    'critMultiplier','cooldownMs','coeff','flat','serverSeed','damageType',seed]){
    assert.equal(json.includes(secret),false,`${id} leaked internal field ${secret}`);
  }
}
const rogue=enemyV2CombatCards([{...wolf,tags:['enemy-v2:archetype:INVALID',
  'enemy-v2:trait:savage','enemy-v2:trait:savage','enemy-v2:trait:INVALID']}])[0];
assert.equal(rogue.archetype,undefined,'unknown archetypes are ignored');
assert.deepEqual(rogue.traits.map(t=>t.id),['savage'],'unknown/duplicate trait tags are sanitized');

console.log('PASS: Enemy 2.0 previews are mobile-compact, sanitized and separate from legacy bosses');
