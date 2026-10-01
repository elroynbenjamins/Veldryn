import {createCharacter,newGame} from '../src/core/game';
import {annualEventCalendar,annualCalendarMonths} from '../src/content/annual-event-calendar';

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
equal(rows.find(row=>row.eventId==='EVT_ANNUAL_010_2026')?.windowLabel,'Oct 10 – Nov 2','Veilbreak publishes its exact window');
equal(rows.find(row=>row.eventId==='EVT_ANNUAL_011_2026')?.windowLabel,'Nov 6 – Nov 29','Merchant & Guild publishes its exact window');
equal(rows.find(row=>row.eventId==='EVT_ANNUAL_012_2026')?.windowLabel,'Dec 1 – Dec 29','Frostfall publishes its exact window');
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

const firstMonth=(date:string)=>annualCalendarMonths(Date.parse(date))[0];
equal(JSON.stringify(firstMonth('2026-09-30T12:00:00Z')),JSON.stringify({year:2026,month:10}),'prelaunch begins October 2026');
equal(JSON.stringify(firstMonth('2027-09-15T12:00:00Z')),JSON.stringify({year:2026,month:10}),'September 2027 retains launch month');
equal(JSON.stringify(firstMonth('2027-10-01T00:00:00Z')),JSON.stringify({year:2026,month:11}),'oldest month rolls off after twelve months');
equal(JSON.stringify(firstMonth('2028-01-01T00:00:00Z')),JSON.stringify({year:2027,month:2}),'rolling history crosses year boundary');
ok(annualCalendarMonths(Date.parse('2026-10-01')).every(date=>date.year>2026||date.month>=10),'no prelaunch months');
