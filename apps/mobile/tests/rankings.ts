import {RANKING_BOARDS,rankingBoardDefinition,rankingValueLabel} from '../src/core/rankings';
const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
assert(RANKING_BOARDS.length===19,'expected all rankings');
assert(rankingBoardDefinition('arena_rating').unit==='rating','arena unit');
assert(rankingValueLabel('dungeon_tier',7)==='Tier 7','tier label');
assert(rankingBoardDefinition('guild').group==='Guilds','guild group');
console.log('rankings core PASS');
