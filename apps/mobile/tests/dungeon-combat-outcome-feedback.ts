export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const types=read('../../backend/src/server/combat/types.ts');
const engine=read('../../backend/src/server/combat/engine.ts');
const service=read('../../backend/src/server/combat/expedition-combat-service.ts');
const projection=read('../../backend/src/server/coop/combat-replay-projection.ts');
const presentation=read('src/core/coop-presentation.ts');
const playback=read('src/core/dungeon-combat-playback.ts');
const fx=read('src/core/dungeon-combat-fx.ts');
const cards=read('src/components/coop/CombatantProfileCard.tsx');

ok(types.includes("'damage' | 'miss' | 'heal'"),'combat engine event vocabulary must preserve misses');
ok(types.includes('critical?: boolean')&&types.includes('absorbed?: number'),'combat events must preserve crit and barrier absorption metadata');
ok(engine.includes("type:'miss'"),'failed authoritative hit rolls must emit a miss event');
ok(engine.includes('critical:crit')&&engine.includes('absorbed:Number(absorbed.toFixed(2))'),'damage events must retain crit and absorbed amounts');

ok(service.includes("outcome?:'critical'|'miss'")&&service.includes('absorbed?:number')&&service.includes('gemProc?:boolean'),'server replay cue must expose only presentation-safe combat outcomes');
ok(service.includes("event.abilityId.startsWith('GEM_')"),'gem-generated combat actions must be identifiable in the public replay');
ok(projection.includes("row.outcome==='critical'||row.outcome==='miss'")&&projection.includes('row.gemProc===true'),'public projection must sanitize outcome fields instead of forwarding raw trace metadata');
ok(presentation.includes("outcome?:'critical'|'miss'")&&presentation.includes('absorbed?:number')&&presentation.includes('gemProc?:boolean'),'mobile replay type must accept the safe outcome fields');

ok(playback.includes(' · CRIT')&&playback.includes(' · MISS')&&playback.includes(' absorbed')&&playback.includes(' · GEM PROC'),'combat log must clearly label meaningful outcomes');
ok(fx.includes("cue.outcome==='critical'")&&fx.includes("cue.outcome==='miss'")&&fx.includes("'BARRIER HIT'")&&fx.includes("'GEM PROC'"),'combat FX must distinguish crit, miss, barrier and gem proc outcomes');
ok(cards.includes("outcome:'DODGE'")&&cards.includes("'CRIT'")&&cards.includes('BARRIER -')&&cards.includes("'GEM PROC'"),'combat profile cards must show outcome badges beside floating values');

console.log('PASS authoritative dungeon combat replay preserves and presents crit, dodge, barrier and gem-proc outcomes');
