import {readySecondsRemaining,type LiveReadyView} from '../src/core/coop-live-lobby';
const check:LiveReadyView={readyCheckId:'check',rosterRevision:1,status:'open',closesAtMs:20000,refillEndsAtMs:null,serverNow:12001,members:[]};
function equal(actual:unknown,expected:unknown){if(actual!==expected)throw new Error(`Expected ${expected}, got ${actual}`);}
equal(readySecondsRemaining(check),8);
equal(readySecondsRemaining({...check,serverNow:20001}),0);
equal(readySecondsRemaining({...check,status:'committed'}),0);
equal(readySecondsRemaining({...check,status:'refilling',refillEndsAtMs:72001}),60);
equal(readySecondsRemaining({...check,status:'requeued',refillEndsAtMs:72001}),0);
console.log('PASS Live lobby uses database time for ready/refill deadlines and stops terminal countdowns');
