import {hasProfileAttention,mergeProfileAttentionKeys,normalizeProfileAttentionKeys} from '../src/core/profile-attention';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(JSON.stringify(normalizeProfileAttentionKeys(['title:pathfinder','title:pathfinder','','bg:harvest'])),JSON.stringify(['title:pathfinder','bg:harvest']),'attention keys are normalized and deduplicated');
equal(JSON.stringify(mergeProfileAttentionKeys(['title:pathfinder'],['frame:amber','title:pathfinder'])),JSON.stringify(['title:pathfinder','frame:amber']),'new profile attention merges without duplicates');
ok(hasProfileAttention(['frame:amber']),'non-empty attention remains actionable');
equal(hasProfileAttention([]),false,'empty attention has no navigation dot');

const many=Array.from({length:140},(_,index)=>'key:'+index);
equal(normalizeProfileAttentionKeys(many).length,100,'attention storage is safely capped');

console.log('PASS: durable profile customization attention');
