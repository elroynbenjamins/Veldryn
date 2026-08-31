import { simulateCombat } from '../engine';
import { launchPlayer, rootboundHeartBoss } from '../content/launch-combat';

const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(x=>launchPlayer(x,25));
const input={seed:'VELDRYN_COMBAT_SMOKE_001',players,enemies:[rootboundHeartBoss()],maxDurationMs:180000};
const a=simulateCombat(input); const b=simulateCombat(input);
if(a.victory!==b.victory || a.durationMs!==b.durationMs || JSON.stringify(a.events)!==JSON.stringify(b.events)) throw new Error('combat_not_deterministic');
if(!a.events.some(e=>e.type==='damage')) throw new Error('no_damage_events');
if(!a.events.some(e=>e.type==='heal'||e.type==='shield'||e.type==='hot_tick')) throw new Error('no_support_events');
console.log(JSON.stringify({victory:a.victory,reason:a.reason,durationMs:a.durationMs,eventCount:a.events.length,interrupts:a.players.reduce((s,p)=>s+p.interrupts,0),remainingEnemyHp:a.enemies.map(e=>Math.round(e.hp))},null,2));
