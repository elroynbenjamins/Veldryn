import {idleActivityInsights} from '../src/core/idle-activity-insights';
import {equipmentTradeOff} from '../src/core/equipment-trade-off';

function check(value:unknown,message:string){if(!value)throw new Error(message);}
function close(actual:number|undefined,expected:number,message:string){
 if(actual===undefined||Math.abs(actual-expected)>0.0001)throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

const mining=idleActivityInsights({
 kind:'mining',
 rates:{actionsPerHour:120,xpPerHour:6000,goldPerHour:0},
 resource:{name:'Aster Iron Ore',itemsPerHour:183.5},
 preview:{elapsedSeconds:120,kills:4},
});
check(mining.metrics.length===3,'Gathering summary should remain three compact metrics');
check(mining.metrics[1].id==='resources'&&mining.metrics[1].perHour===183.5,'Gathering output uses the runtime item projection');
check(mining.metrics[2].id==='actions','Gathering also reports actions per hour');
check(mining.resourceName==='Aster Iron Ore','Correct primary material shown');

const combat=idleActivityInsights({
 kind:'combat',
 rates:{actionsPerHour:95.4,xpPerHour:45200,goldPerHour:2100},
 preview:{
  elapsedSeconds:4000,kills:20,foodConsumed:4,endHp:20,
  combatEffort:{startsAtMs:0,endsAtMs:600000},
 },
 maxHp:100,
});
check(combat.metrics.map(row=>row.id).join(',')==='xp,actions,gold','Combat uses XP, kills and gold at a glance');
check(combat.metrics[1].label==='Kills / hr','Combat rates must be labeled as kills');
close(combat.combat?.killsPerHour,120,'Combat buffered kills use verified effort, not time after injury');
close(combat.combat?.foodPerHour,24,'Food efficiency uses verified active combat effort');
check(combat.combat?.lowProjectedHp===true,'Risk appears when projected health is below 25%');
check(combat.combat?.projectedHp===20,'Do not invent health estimates');

const early=idleActivityInsights({
 kind:'combat',
 rates:{actionsPerHour:60,xpPerHour:200,goldPerHour:10},
 preview:{elapsedSeconds:180,kills:2,foodConsumed:1,endHp:80},maxHp:100,
});
check(early.combat?.killsPerHour===undefined,'Do not extrapolate short combat samples');
check(early.combat?.foodPerHour===undefined,'Do not extrapolate food consumption from short samples');
check(early.combat?.lowProjectedHp===false,'Do not flag healthy combat');
const safe=idleActivityInsights({
 kind:'exploration',
 rates:{actionsPerHour:Number.POSITIVE_INFINITY,xpPerHour:NaN,goldPerHour:-999},
 preview:{elapsedSeconds:0,kills:0},
});
check(safe.metrics.every(row=>Number.isFinite(row.perHour)&&row.perHour>=0),'No NaN, infinite or negative UI rates');

const mixed=equipmentTradeOff(
 {attack:30,defense:50,hp:200,power:500},
 {attack:42,defense:41,hp:200,power:520}
);
check(mixed.grade==='tradeoff','A power increase must not hide a defense trade-off');
check(mixed.description.includes('+12 Attack')&&mixed.description.includes('-9 Defense'),'Trade-off explains exact signed stat changes');
const gain=equipmentTradeOff(
 {attack:30,defense:50,hp:200,power:500},
 {attack:33,defense:55,hp:220,power:540},
);
check(gain.grade==='improvement'&&gain.changes.length===3,'All positive changes are improvements');
const loss=equipmentTradeOff(
 {attack:30,defense:50,hp:200,power:500},
 {attack:28,defense:40,hp:180,power:500},
);
check(loss.grade==='downgrade','Power alone must not mask stat losses');
const neutral=equipmentTradeOff(
 {attack:30,defense:50,hp:200,power:500},
 {attack:30,defense:50,hp:200,power:500},
);
check(neutral.grade==='neutral'&&neutral.changes.length===0,'Identical loadouts remain neutral');
console.log('PASS: idle activity metrics, bounded combat efficiency and signed equipment trade-offs');
