import {newGame,createCharacter,BASE_OFFLINE_CAP_HOURS,MAX_OFFLINE_CAP_HOURS} from '../src/core/game';
import {launchReadinessReport,weeklyOrderCandidatesFromCurrentContent} from '../src/core/launch-readiness-v47';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
let state=createCharacter(newGame(0),'IRONWARDEN','Tester','male');
equal(BASE_OFFLINE_CAP_HOURS,24,'Offline Reserve base');
equal(MAX_OFFLINE_CAP_HOURS,36,'Offline Reserve maximum');
const report=launchReadinessReport(state);
if(!report.ok)throw new Error('Launch binding blockers: '+report.issues.filter(row=>row.severity==='blocker').map(row=>`${row.code}:${row.message}`).join(' | '));
equal(report.counts.classes,9,'Current class count');
ok(report.counts.regions>=8,'Current region catalogue available');
ok(report.counts.items>50,'Current item catalogue available');
ok(report.issues.some(row=>row.code==='RARE_POOLS_DISABLED'),'Disabled rare pool warning remains explicit');
const candidates=weeklyOrderCandidatesFromCurrentContent(state);
ok(candidates.some(row=>row.kind==='hunt'),'Weekly Hunt candidates bind to current monsters');
ok(candidates.some(row=>row.kind==='profession'),'Weekly Profession candidates bind to current activities');
console.log(JSON.stringify({status:'PASS',counts:report.counts,warnings:report.issues.filter(row=>row.severity==='warning')},null,2));
