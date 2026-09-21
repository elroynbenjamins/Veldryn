import {CLASSES} from '../src/content/classes';
import {DUNGEON_COMBAT_CLASS_FX,dungeonCombatClassFx,dungeonCombatCueFx,dungeonCombatFxNeedsTravel} from '../src/core/dungeon-combat-fx';

function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}

equal(Object.keys(DUNGEON_COMBAT_CLASS_FX).length,9,'all classes need combat FX');
for(const classDef of CLASSES){
 const fx=dungeonCombatClassFx(classDef.id);
 assert(fx,`missing combat FX for ${classDef.id}`);
 assert(fx.damageGlyph.length>0&&fx.damageLabel.length>0,'combat FX needs visible identity');
 assert(fx.durationMs>=180&&fx.durationMs<=500,'combat FX duration outside mobile budget');
}

const arrow=dungeonCombatCueFx({atMs:100,type:'action',actionKind:'damage'},'WAYFINDER')!;
equal(arrow.actorMotion,'projectile');assert(arrow.effectTravelPx>=60,'Wayfinder should visibly read as ranged');
const dash=dungeonCombatCueFx({atMs:100,type:'action',actionKind:'damage'},'KNIFE_DANCER')!;
equal(dash.actorMotion,'dash');assert(dash.actorTravelPx>=12,'Knife Dancer needs a readable dash');
const hammer=dungeonCombatCueFx({atMs:100,type:'action',actionKind:'damage'},'BASTION')!;
equal(hammer.actorMotion,'smash');assert(hammer.durationMs>dash.durationMs,'heavy smash should read slower than a dash');
const heal=dungeonCombatCueFx({atMs:100,type:'action',actionKind:'heal'},'DAWNKEEPER')!;
equal(heal.targetMotion,'pulse');equal(heal.accent,'success');
const shield=dungeonCombatCueFx({atMs:100,type:'action',actionKind:'shield'},'IRONWARDEN')!;
equal(shield.actorMotion,'brace');equal(shield.targetMotion,'brace');
const assist=dungeonCombatCueFx({atMs:100,type:'assist'},'WAYFINDER')!;
equal(assist.accent,'violet');equal(assist.actorMotion,'pulse');
assert(dungeonCombatFxNeedsTravel(arrow),'projectile should travel');assert(!dungeonCombatFxNeedsTravel(heal),'heal should not travel across the arena');
console.log('dungeon combat FX profiles OK');
