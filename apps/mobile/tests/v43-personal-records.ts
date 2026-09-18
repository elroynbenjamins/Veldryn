import {PERSONAL_RECORDS_V43,applyPersonalRecord,recordCategories} from '../src/core/personal-records-v43';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
equal(PERSONAL_RECORDS_V43.length,33,'V43 personal record catalogue size');
ok(recordCategories().includes('guild'),'Guild record category exists');
let result=applyPersonalRecord(undefined,{eventId:'a',recordId:'highest_single_hit',value:500,achievedAtMs:1,characterId:'c'});
ok(result.changed,'First max record is stored');equal(result.entry?.value,500,'Stored max record');
result=applyPersonalRecord(result.entry,{eventId:'b',recordId:'highest_single_hit',value:400,achievedAtMs:2});
ok(!result.changed,'Worse max value ignored');
let speed=applyPersonalRecord(undefined,{eventId:'c',recordId:'fastest_dungeon_clear_ms',value:100000,achievedAtMs:3});
speed=applyPersonalRecord(speed.entry,{eventId:'d',recordId:'fastest_dungeon_clear_ms',value:90000,achievedAtMs:4});
ok(speed.changed,'Lower positive clear time is better');equal(speed.entry?.value,90000,'Fastest clear stored');
console.log('PASS: reconciled V43 33-record catalogue and max/min-positive rules');
