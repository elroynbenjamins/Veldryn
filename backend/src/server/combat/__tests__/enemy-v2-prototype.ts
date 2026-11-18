import {strict as assert} from 'node:assert';
import {simulateCombat} from '../engine';
import {launchPlayer} from '../content/launch-combat';
import type {CombatantDefinition} from '../types';
import {ENEMY_V2_RULESET,ENEMY_V2_TRAITS,prepareEnemyV2,type EnemyV2ServerOptions} from '../enemy-v2-prototype';

const stats={maxHp:30000,attackPower:200,healingPower:0,defense:500,accuracy:1200,evasion:100,critChance:.08,critMultiplier:1.5,haste:0};
const enemy:CombatantDefinition={
  id:'PILOT_WOLF',name:'Pilot Wolf',team:'enemies',role:'enemy',level:25,
  stats:{...stats},basicAttackMs:2500,basicAttackCoeff:1,abilities:[],
  tags:['pve:archetype:assassin','pve:mechanic:focus'],
};
const baseline=JSON.stringify(enemy);
const options:EnemyV2ServerOptions={ruleset:ENEMY_V2_RULESET,serverSeed:'server-only-reservation-seed',
  encounterId:'TEST_ASTERFALL',region:'asterfall' as const,equipmentTier:2 as const};
assert.equal(Object.keys(ENEMY_V2_TRAITS).length,18,'the entire planned trait catalogue stays registered');
assert.equal(Object.values(ENEMY_V2_TRAITS).filter(trait=>trait.implemented).length,9,'only engine-backed traits are eligible');

const disabled=prepareEnemyV2([enemy]);
assert.strictEqual(disabled.enemies[0],enemy,'legacy rules must be a strict no-op');
assert.deepEqual(disabled.preview,[]);
const t1=prepareEnemyV2([enemy],{...options,equipmentTier:1});
assert.strictEqual(t1.enemies[0],enemy,'Tier 1 encounters cannot receive extra traits');
const boss={...enemy,boss:true};
assert.strictEqual(prepareEnemyV2([boss],{...options,equipmentTier:5}).enemies[0],boss,'bosses retain handcrafted kits');
assert.strictEqual(prepareEnemyV2([{...enemy,tags:[]}],options).preview.length,0,'unknown enemy families remain unchanged');
assert.throws(()=>prepareEnemyV2([enemy],{...options,serverSeed:''}),/server_seed/);

const repeated1=prepareEnemyV2([enemy],options);
const repeated2=prepareEnemyV2([enemy],options);
assert.deepEqual(repeated1,repeated2,'same persisted seed must generate the same encounter');
assert.equal(JSON.stringify(enemy),baseline,'prototype may not mutate the base catalogue');
assert.equal(prepareEnemyV2(repeated1.enemies,options).preview.length,0,'never stack traits twice on a persisted snapshot');
const convertedTag=(repeated1.enemies[0].tags??[]).find(tag=>tag.startsWith('pve:archetype:'));
assert.equal(convertedTag,'pve:archetype:assassin','existing PvE identities remain stable');

const possibleIds=new Set<string>();
let examples=0;
let combatSample:CombatantDefinition|undefined;
for(let i=0;i<300;i++){
  const sample=prepareEnemyV2([enemy],{
    ...options,region:'frostmarch',equipmentTier:5,eliteEnemyIds:[enemy.id],
    serverSeed:'elite-test-'+i,
  });
  const traits=sample.preview[0]?.traitIds??[];
  assert.ok(traits.length<=2,'elites never exceed two compatible traits');
  assert.equal(new Set(traits).size,traits.length,'trait IDs never repeat');
  assert.ok(traits.every(id=>ENEMY_V2_TRAITS[id].implemented),'incomplete mechanics may not spawn');
  const groups=traits.filter(id=>ENEMY_V2_TRAITS[id].group!=='control').map(id=>ENEMY_V2_TRAITS[id].group);
  assert.equal(new Set(groups).size,groups.length,'avoid stacked offensive or defensive multipliers');
  if(traits.includes('rending')&&!combatSample)combatSample=sample.enemies[0];
  for(const id of traits)possibleIds.add(id);
  examples++;
}
assert.equal(examples,300);
assert.ok(possibleIds.size>=2,'seeded enemies need meaningful variants');
assert.ok(combatSample,'a seeded predator must be able to roll Rending');
assert.ok(combatSample!.abilities.some(ability=>ability.id==='ENEMY_V2_RENDING'));
assert.ok(!JSON.stringify(prepareEnemyV2([enemy],options).preview).includes(options.serverSeed),'previews must never reveal seed');

const players=[launchPlayer('Ironwarden',25)];
const combatInput={seed:'deterministic-enemy-v2-battle',players,enemies:[combatSample!],maxDurationMs:20000};
const a=simulateCombat(combatInput),b=simulateCombat(combatInput);
assert.equal(JSON.stringify(a.events),JSON.stringify(b.events),'new trait abilities must replay deterministically');
assert.ok(a.events.some(event=>event.abilityId==='ENEMY_V2_RENDING'));
assert.ok(a.events.some(event=>event.type==='status_apply'&&event.statusTag==='bleed'));

console.log('PASS Enemy 2.0 opt-in ruleset, trait caps, seed replay and combat status events');
