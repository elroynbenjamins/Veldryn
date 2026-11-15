function equal(actual:unknown,expected:unknown,message='Expected values to match'){if(actual!==expected)throw new Error(message+`: ${String(actual)} !== ${String(expected)}`);}
import {CoopCommandJournal,type PendingCoopCommand} from '../src/core/coop-command-journal';

async function main(){
 let saved:PendingCoopCommand|null={path:'/coop/runs/boss-run/choose',body:{requestId:'original-key',optionId:'boss'}};
 const sent:PendingCoopCommand[]=[];
 const journal=new CoopCommandJournal({
  read:async()=>saved,
  write:async value=>{saved=value;}
 },async command=>{sent.push(command);return {accepted:true};});
 equal(await journal.pendingForRun('boss-run'),true,'interrupted room choice must be recoverable');
 equal(await journal.pendingForRun('another-run'),false,'never replay an unrelated dungeon choice');
 await journal.execute();
 equal(sent.length,1);
 equal(sent[0].body.requestId,'original-key','retry must preserve original idempotency key');
 equal(saved,null,'confirmed replay clears the local journal');
 equal(await journal.pendingForRun('boss-run'),false);
 saved={path:'/coop/shop',body:{requestId:'shop-operation'}};
 equal(await journal.pendingForRun('boss-run'),false,'shop mutations are not resumed as dungeon choices');
 console.log('PASS dungeon boss re-entry only replays the original pending command for the same run');
}
void main();
