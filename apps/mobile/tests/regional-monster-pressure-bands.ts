import {strict as assert} from 'node:assert';
import {MONSTERS} from '../src/content/monsters';
import {REGIONAL_MONSTER_PRESSURE_MULTIPLIER,regionalMonsterPressureBand} from '../src/core/game';

const regions=[...new Set(MONSTERS.filter(m=>!m.boss).map(m=>m.zone))];
for(const region of regions){
 const monsters=MONSTERS.filter(m=>!m.boss&&m.zone===region).sort((a,b)=>a.level-b.level||a.attack-b.attack);
 if(monsters.length<2)continue;
 const first=regionalMonsterPressureBand(monsters[0].id),last=regionalMonsterPressureBand(monsters[monsters.length-1].id);
 assert.equal(first,'entry',region+' lowest normal encounter should be entry pressure');
 assert.equal(last,'hard',region+' highest normal encounter should be hard pressure');
 assert.ok(REGIONAL_MONSTER_PRESSURE_MULTIPLIER.entry<REGIONAL_MONSTER_PRESSURE_MULTIPLIER.standard);
 assert.ok(REGIONAL_MONSTER_PRESSURE_MULTIPLIER.hard>REGIONAL_MONSTER_PRESSURE_MULTIPLIER.standard);
}
assert.ok(REGIONAL_MONSTER_PRESSURE_MULTIPLIER.hard<=1.15,'hard normal monsters must not become pseudo-bosses');
console.log('PASS regional entry/standard/hard monster pressure bands');
