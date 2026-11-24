import {SCOUTING_TRAINING_MINUTES,type ScoutingDispatchCommand,type ScoutingFoodSelection,type ScoutingTrainingMinutes} from './scouting-types';
const object=(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_REQUEST');return input as Record<string,unknown>};
const id=(value:unknown,name:string)=>{if(typeof value!=='string'||value.trim().length<1||value.trim().length>128||!/^[A-Za-z0-9:_-]+$/.test(value.trim()))throw Error('INVALID_'+name.toUpperCase());return value.trim()};
const requestId=(value:unknown)=>{const v=id(value,'request_id');if(v.length<8)throw Error('INVALID_REQUEST_ID');return v};
const companions=(value:unknown,min=0)=>{if(!Array.isArray(value)||value.length<min||value.length>3)throw Error('INVALID_COMPANION_TEAM');const ids=value.map(v=>id(v,'companion_id'));if(new Set(ids).size!==ids.length)throw Error('INVALID_COMPANION_TEAM');return ids};
function food(value:unknown):ScoutingFoodSelection[]{if(!Array.isArray(value)||value.length>16)throw Error('INVALID_FOOD');const rows=value.map(row=>{const r=object(row),quantity=Number(r.quantity);if(!Number.isSafeInteger(quantity)||quantity<=0||quantity>9999)throw Error('INVALID_FOOD');return{itemId:id(r.itemId,'item_id'),quantity}});if(new Set(rows.map(r=>r.itemId)).size!==rows.length)throw Error('INVALID_FOOD');return rows}
export function parseScoutingDispatchBody(input:unknown):{requestId:string;command:ScoutingDispatchCommand}{
 const row=object(input),kind=row.kind;
 if(kind==='route')return{requestId:requestId(row.requestId),command:{kind,routeId:id(row.routeId,'route_id'),companionIds:companions(row.companionIds)}};
 if(kind==='practice'||kind==='survey'){const minutes=Number(row.trainingMinutes);if(!(SCOUTING_TRAINING_MINUTES as readonly number[]).includes(minutes))throw Error('INVALID_TRAINING_DURATION');return{requestId:requestId(row.requestId),command:{kind,routeId:id(row.routeId,'route_id'),companionIds:companions(row.companionIds,kind==='survey'?1:0),trainingMinutes:minutes as ScoutingTrainingMinutes}};}
 if(kind==='camp'){if(typeof row.earnExplorationXp!=='boolean')throw Error('INVALID_XP_MODE');return{requestId:requestId(row.requestId),command:{kind,missionId:id(row.missionId,'mission_id'),companionIds:companions(row.companionIds,1),earnExplorationXp:row.earnExplorationXp,food:food(row.food)}};}
 throw Error('INVALID_SCOUTING_KIND');
}
export function parseScoutingClaimBody(input:unknown){const row=object(input);return{requestId:requestId(row.requestId),assignmentId:id(row.assignmentId,'assignment_id')}}
