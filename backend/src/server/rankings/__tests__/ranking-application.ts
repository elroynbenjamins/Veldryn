import {strict as assert} from 'node:assert';
import {SupabaseRankingRepository} from '../supabase-ranking-repository';
import {RankingApplicationService} from '../ranking-application';
import {RankingHttpApplication} from '../ranking-http-application';
import {parseRankingBoard,parseRankingLimit,parseRankingOffset} from '../ranking-api-contracts';
import type {RankingRepository} from '../ranking-persistence';
import type {RankingBoardId,RankingBoardProjection} from '../ranking-types';
class Memory implements RankingRepository{last?:{accountId:string;board:RankingBoardId;limit:number;offset:number;nowMs:number};async board(accountId:string,board:RankingBoardId,limit:number,offset:number,nowMs:number){this.last={accountId,board,limit,offset,nowMs};return{board,title:'Arena Rating',description:'Seasonal rating',unit:'rating',prestigeOnly:true,generatedAtMs:nowMs,entries:[{rank:1,entityType:'account',displayName:'Aster',value:1420,isSelf:true}],self:{listed:true,rank:1,value:1420}} as RankingBoardProjection}}
const expectThrow=(fn:()=>unknown)=>{let threw=false;try{fn()}catch{threw=true}assert.equal(threw,true)};
const main=async()=>{assert.equal(parseRankingBoard('guild'),'guild');assert.equal(parseRankingLimit('50'),50);assert.equal(parseRankingOffset('12'),12);expectThrow(()=>parseRankingBoard('combat_level'));expectThrow(()=>parseRankingLimit(101));expectThrow(()=>parseRankingOffset(-1));const repo=new Memory(),http=new RankingHttpApplication(new RankingApplicationService(repo)),board=await http.board(' account-a ',{board:'arena_rating',limit:50,offset:12},1234);assert.equal(board.entries[0].displayName,'Aster');assert.equal(repo.last?.accountId,'account-a');assert.equal(repo.last?.limit,50);assert.equal(repo.last?.offset,12);assert.equal(repo.last?.nowMs,1234);expectThrow(()=>http.board('a',{board:'arena_rating'},Number.NaN));const calls:Array<{name:string;args:Record<string,unknown>}>=[];
const client={rpc:async <T>(name:string,args:Record<string,unknown>)=>{
 calls.push({name,args});
 return {data:{board:args.p_board,title:'Verified',description:'server-sourced',unit:'level',prestigeOnly:true,generatedAtMs:1234,entries:[]} as unknown as T,error:null};
}};
const legacy=new SupabaseRankingRepository(client);
await legacy.board('account-a','mining',51,50,1234);
assert.equal(calls[0]?.name,'rankings_board_server_v2','production default must use existing v2');
const selected=new SupabaseRankingRepository(client,true);
const selectedBoard=await selected.board('account-a','dungeon_clears',51,50,1234);
assert.equal(selectedBoard.board,'dungeon_clears');
assert.equal(calls[1]?.name,'rankings_board_server_v3');
assert.deepEqual(calls[1]?.args,{p_requester:'account-a',p_board:'dungeon_clears',p_limit:51,p_offset:50});
const missingCalls:string[]=[];
const missing={rpc:async <T>(name:string,_args:Record<string,unknown>)=>{
 missingCalls.push(name);
 return {data:null as T|null,error:{code:'PGRST202',message:'not deployed'}};
}};
let v3MissingRejected=false;try{await new SupabaseRankingRepository(missing,true).board('account-a','mining',51,0,1234)}catch(error){v3MissingRejected=String(error).includes('rankings_persistence')};assert.equal(v3MissingRejected,true,'missing v3 RPC must fail closed with persistence error');
assert.deepEqual(missingCalls,['rankings_board_server_v3'],'missing v3 must fail closed and never query v2');
console.log('ranking application PASS')};void main();
