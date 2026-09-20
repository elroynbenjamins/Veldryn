import {createCharacter,newGame} from '../src/core/game';
import {annualEventCalendar} from '../src/content/annual-event-calendar';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

let state=createCharacter(newGame(1),'IRONWARDEN','Calendar Tester');
let rows=annualEventCalendar(state);

equal(rows.length,9,'production annual event count');
equal(rows[0]?.eventId,'EVT_ANNUAL_001_2026','Turning of the Age starts the annual calendar');
equal(rows[0]?.windowLabel,'Dec 29 – Jan 4','Turning window label');
equal(rows[1]?.eventId,'EVT_ANNUAL_002_2026','Heartbond follows Turning');
equal(rows.at(-1)?.eventId,'EVT_ANNUAL_012_2026','Frostfall closes the annual calendar');
ok(rows.every(row=>row.collectionTotal>0),'every production event exposes collection rewards');
ok(rows.every(row=>row.collectionOwned===0),'fresh account starts with no annual event collection ownership');

state={...state,account:{...state.account,
  unlockedCosmeticPetIds:['EVT_PET_001','EVT_PET_002'],
  unlockedCombatCompanionIds:['EVT_UNIT_001'],
  eventProgressById:{EVT_ANNUAL_001_2026:2500},
}};
rows=annualEventCalendar(state);
const turning=rows.find(row=>row.eventId==='EVT_ANNUAL_001_2026')!;
ok(turning.collectionOwned>=3,'Turning collection counts owned event pets and companion');
equal(turning.lifetimeReputation,2500,'calendar shows lifetime event reputation');
state={...state,account:{...state.account,eventProgressById:{...(state.account.eventProgressById??{}),EVT_ANNUAL_001_2027:400}}};
rows=annualEventCalendar(state);
const turningAcrossSeasons=rows.find(row=>row.eventId==='EVT_ANNUAL_001_2026')!;
equal(turningAcrossSeasons.lifetimeReputation,2900,'calendar aggregates lifetime reputation across annual seasons');
equal(turningAcrossSeasons.hasHistory,true,'owned/progress event is marked as participated');

console.log('PASS: annual Event Hub calendar projection validates');
