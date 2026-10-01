import {liveLobbySlots,readySecondsRemaining,type LiveReadyView} from '../src/core/coop-live-lobby';
const check:LiveReadyView={readyCheckId:'check',rosterRevision:1,status:'open',closesAtMs:20000,refillEndsAtMs:null,serverNow:12001,members:[]};
function equal(actual:unknown,expected:unknown){if(actual!==expected)throw new Error(`Expected ${expected}, got ${actual}`);}
equal(readySecondsRemaining(check),8);
equal(readySecondsRemaining({...check,serverNow:20001}),0);
equal(readySecondsRemaining({...check,status:'committed'}),0);
equal(readySecondsRemaining({...check,status:'refilling',refillEndsAtMs:72001}),60);
equal(readySecondsRemaining({...check,status:'requeued',refillEndsAtMs:72001}),0);
console.log('PASS Live lobby uses database time for ready/refill deadlines and stops terminal countdowns');

for(const role of ['tank','damage','support'] as const){
 const slots=liveLobbySlots({serverNow:0,ticket:{ticketId:'q',dungeonId:'EXP_001',tier:2,role,status:'queued',reservationId:null}});
 equal(slots.length,4);equal(slots.filter(s=>s.self).length,1);equal(slots.find(s=>s.self)?.role,role);equal(slots.filter(s=>s.accepted).length,0);
}
const party:LiveReadyView={...check,members:[{characterId:'a',role:'damage',self:false,accepted:false},{characterId:'b',role:'damage',self:true,accepted:true},{characterId:'c',role:'tank',self:false,accepted:true},{characterId:'d',role:'support',self:false,accepted:true}]};
equal(liveLobbySlots(undefined,party).filter(s=>s.member).length,4);
const refill=liveLobbySlots(undefined,{...party,status:'refilling'});
equal(refill.filter(s=>s.member).length,3);equal(refill.filter(s=>s.self).length,1);equal(refill.find(s=>!s.member)?.role,'damage');
console.log('PASS four role slots preserve self, duplicate damage roles and refill vacancies');
