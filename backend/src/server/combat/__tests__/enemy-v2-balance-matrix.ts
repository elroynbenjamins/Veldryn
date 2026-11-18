import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';
import {launchPlayer} from '../content/launch-combat';
import {simulateCombat} from '../engine';
import {ENEMY_V2_RULESET} from '../enemy-v2-prototype';
import {prepareAsterfallBossV2} from '../boss-v2-asterfall-prototype';
import {prepareRegionalBossV2} from '../boss-v2-regional-prototype';
import type {CombatInput,CombatResult,CombatantDefinition} from '../types';

/**
 * Offline-only comparative audit for early 2.0 prototype balance.
 * This is NOT a release approval and does not calibrate 2.0 equipment stats.
 * Every run uses the same player party and combat seed for each ruleset.
 */
const bossIds=['BOSS_EXP_ROOT','BOSS_EXP_BELL','BOSS_EXP_SOLAR','BOSS_EXP_SPHINX','BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR'] as const;
const scenarios=[
  {name:'balanced',classes:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'],attack:1,defense:1},
  {name:'offensive',classes:['Ironwarden','Knife Dancer','Ravager','Dawnkeeper'],attack:1.12,defense:.93},
  {name:'defensive',classes:['Bastion','Hexweaver','Dreadguard','Stonecaller'],attack:.94,defense:1.14},
] as const;
const seeds=['candidate-001','candidate-002'] as const;
type RunSummary={boss:string;scenario:string;seed:string;mode:'legacy'|'v2';victory:boolean;durationMs:number;reason:string;damageTaken:number;healing:number;remainingPlayers:number;events:number;phases:string[]};
function summarize(boss:string,scenario:string,seed:string,mode:'legacy'|'v2',result:CombatResult):RunSummary {
  return {
    boss,scenario,seed,mode,victory:result.victory,durationMs:result.durationMs,
    reason:result.reason,
    damageTaken:Math.round(result.players.reduce((sum,p)=>sum+p.damageTaken,0)),
    healing:Math.round(result.players.reduce((sum,p)=>sum+p.healingDone,0)),
    remainingPlayers:result.players.filter(p=>p.alive).length,
    events:result.events.length,
    phases:result.events.filter(event=>event.type==='phase').map(event=>event.abilityId??''),
  };
}
function playerParty(scenario:typeof scenarios[number],level:number):CombatantDefinition[] {
  return scenario.classes.map(name=>{
    const source=launchPlayer(name as Parameters<typeof launchPlayer>[0],level);
    return {...source,stats:{...source.stats,
      attackPower:source.stats.attackPower*scenario.attack,
      defense:source.stats.defense*scenario.defense,
    }};
  });
}
const records:RunSummary[]=[];
for(const id of bossIds){
  const factory=EXPEDITION_ENCOUNTERS[id];
  assert.ok(factory,`Missing published boss ${id}`);
  const original=factory()[0];
  const candidate=id==='BOSS_EXP_ROOT'||id==='BOSS_EXP_BELL'
    ?prepareAsterfallBossV2(original,ENEMY_V2_RULESET)
    :prepareRegionalBossV2(original,ENEMY_V2_RULESET);
  assert.equal(candidate.id,original.id);
  assert.equal(candidate.name,original.name);
  assert.deepEqual(candidate.stats,original.stats,'prototype should not alter a boss base stat');
  for(const group of scenarios)for(const seed of seeds){
    const players=playerParty(group,original.level);
    const base:CombatInput={seed:`${id}:${group.name}:${seed}`,players,enemies:[original],maxDurationMs:90000};
    const proposal:CombatInput={...base,enemies:[candidate],experimentalRuleset:ENEMY_V2_RULESET};
    for(const [mode,input] of [['legacy',base],['v2',proposal]] as const){
      const result=simulateCombat(input);
      assert.ok(Number.isFinite(result.durationMs)&&result.durationMs>=0);
      assert.ok(result.events.length<60000,`${id}: possible runaway event loop`);
      for(const character of [...result.players,...result.enemies]){
        assert.ok(Number.isFinite(character.hp)&&Number.isFinite(character.shield));
        assert.ok(character.hp>=0&&character.shield>=0,'health/shields cannot become negative');
      }
      const phases=result.events.filter(event=>event.type==='phase').map(event=>event.abilityId??'');
      assert.equal(new Set(phases).size,phases.length,'a boss phase may only trigger once');
      records.push(summarize(id,group.name,seed,mode,result));
    }
  }
}
// Summarize prospective power/counterplay changes without asserting arbitrary
// balance ratios before Equipment 2.0 and Skills 2.0 have their final contracts.
const comparisons=[] as Array<{boss:string;scenario:string;seed:string;legacyWin:boolean;v2Win:boolean;legacyMs:number;v2Ms:number;legacyDamage:number;v2Damage:number;durationRatio:number|null;damageRatio:number|null}>;
for(let i=0;i<records.length;i+=2){
  const a=records[i],b=records[i+1];
  assert.equal(a.mode,'legacy');assert.equal(b.mode,'v2');
  comparisons.push({
    boss:a.boss,scenario:a.scenario,seed:a.seed,legacyWin:a.victory,v2Win:b.victory,
    legacyMs:a.durationMs,v2Ms:b.durationMs,legacyDamage:a.damageTaken,v2Damage:b.damageTaken,
    durationRatio:a.victory&&b.victory&&a.durationMs>0?Number((b.durationMs/a.durationMs).toFixed(3)):null,
    damageRatio:a.damageTaken>0?Number((b.damageTaken/a.damageTaken).toFixed(3)):null,
  });
}
assert.equal(records.length,bossIds.length*scenarios.length*seeds.length*2);
console.log('ENEMY_V2_BALANCE_AUDIT '+JSON.stringify({version:ENEMY_V2_RULESET,method:'synthetic builds, same seeds, observational only',comparisons}));
console.log(`PASS: ${records.length} deterministic simulation runs, ${comparisons.length} candidate vs legacy comparisons, live dungeon content unchanged`);
