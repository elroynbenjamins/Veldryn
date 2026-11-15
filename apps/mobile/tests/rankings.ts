import {RANKING_BOARDS,rankingBoardDefinition,rankingValueLabel,type RankingEntry} from '../src/core/rankings';
import {RANKING_PAGE_SIZE,rankingPageOffset,projectRankingPage} from '../src/core/ranking-pagination';
const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
assert(RANKING_BOARDS.length===19,'expected all rankings');
assert(rankingBoardDefinition('arena_rating').unit==='rating','arena unit');
assert(rankingValueLabel('dungeon_tier',7)==='Tier 7','tier label');
assert(rankingBoardDefinition('guild').group==='Guilds','guild group');
assert(rankingBoardDefinition('achievement_score').description.includes('earned'),'Journal score reflects earned milestones, not claims');
const rows:Array<RankingEntry>=Array.from({length:RANKING_PAGE_SIZE+1},(_,i)=>({rank:i+1,entityType:'account',displayName:'Adventurer '+i,value:100-i,isSelf:false}));
const first=projectRankingPage(rows,0);
assert(first.entries.length===50&&first.hasNext&&first.firstPosition===1&&first.lastPosition===50,'first page uses a one-row lookahead');
const second=projectRankingPage(rows.slice(50),1);
assert(second.entries.length===1&&!second.hasNext&&second.firstPosition===51&&second.lastPosition===51,'partial final page');
assert(projectRankingPage([],1).firstPosition===0,'empty page has no imaginary rank positions');
const sharedTies:Array<RankingEntry>=[
 {rank:1,entityType:'account',displayName:'A',value:900,isSelf:false},
 {rank:1,entityType:'account',displayName:'B',value:900,isSelf:false},
 {rank:3,entityType:'account',displayName:'C',value:800,isSelf:false},
 {rank:4,entityType:'account',displayName:'D',value:700,isSelf:false},
];
const tiedPage=projectRankingPage(sharedTies,0,3);
assert(tiedPage.hasNext&&tiedPage.entries[0].rank===1&&tiedPage.entries[1].rank===1&&tiedPage.entries[2].rank===3,'ties preserve official ranks');
assert(sharedTies.length===4,'page projection does not mutate source rows');
assert(rankingPageOffset(1)===50&&rankingPageOffset(200)===10000,'bounded offset arithmetic');
assert(!projectRankingPage(rows,200).hasNext,'no next page beyond maximum offset');
let threw=false;try{rankingPageOffset(201)}catch{threw=true}assert(threw,'past maximum offset is rejected');
for(const invalid of [-1,0.5,Infinity,Number.NaN,Number.MAX_SAFE_INTEGER+1]){
 let failed=false;try{rankingPageOffset(invalid)}catch{failed=true}
 assert(failed,'invalid page must throw: '+String(invalid));
}
for(const invalidSize of [0,2.5,100]){
 let failed=false;try{rankingPageOffset(0,invalidSize)}catch{failed=true}
 assert(failed,'invalid page size must throw: '+String(invalidSize));
}
console.log('rankings core + pagination PASS');
