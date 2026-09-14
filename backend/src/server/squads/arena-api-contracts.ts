import type {SquadPosition} from './roster';

export interface ArenaCharacterSelection { characterId:string; position:SquadPosition; }
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_request_body');return value as Record<string,unknown>}
function text(value:unknown,key:string,min=1,max=128){if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new Error(`invalid_${key}`);return value.trim()}
function requestId(row:Record<string,unknown>){return text(row.requestId,'requestId',8,128)}
export function parseArenaFormation(value:unknown):ArenaCharacterSelection[]{
  if(!Array.isArray(value)||value.length!==3)throw new Error('arena_requires_exactly_3_characters');
  const rows=value.map(item=>{const row=object(item),characterId=text(row.characterId,'characterId'),position=text(row.position,'position') as SquadPosition;if(!['front','middle','back'].includes(position))throw new Error('invalid_arena_position');return{characterId,position}});
  if(new Set(rows.map(row=>row.characterId)).size!==3)throw new Error('arena_duplicate_character');
  if(new Set(rows.map(row=>row.position)).size!==3)throw new Error('arena_requires_front_middle_back');
  return rows;
}
export function parseArenaPublishRequest(value:unknown){const row=object(value);if(row.label!==undefined&&typeof row.label!=='string')throw new Error('invalid_label');return{requestId:requestId(row),formation:parseArenaFormation(row.formation),label:typeof row.label==='string'?row.label.slice(0,24):undefined}}
export function parseArenaOpponentRequest(value:unknown){const row=object(value);if(row.limit!==undefined&&(!Number.isInteger(row.limit)||Number(row.limit)<1||Number(row.limit)>5))throw new Error('invalid_limit');return{formation:parseArenaFormation(row.formation),limit:row.limit===undefined?3:Number(row.limit)}}
export function parseArenaStartRequest(value:unknown){const row=object(value);if(row.label!==undefined&&typeof row.label!=='string')throw new Error('invalid_label');return{requestId:requestId(row),opponentKey:text(row.opponentKey,'opponentKey',16,64),formation:parseArenaFormation(row.formation),label:typeof row.label==='string'?row.label.slice(0,24):undefined}}
export function parseArenaClaimRequest(value:unknown){const row=object(value);return{requestId:requestId(row)}}
