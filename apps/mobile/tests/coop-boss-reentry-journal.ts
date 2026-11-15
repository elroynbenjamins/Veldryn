import assert from 'node:assert/strict';
import {CoopCommandJournal,type PendingCoopCommand} from '../src/core/coop-command-journal';

async function main(){
 let saved:PendingCoopCommand|null={path:'/coop/runs/boss-run/choose',body:{requestId:'original-key',optionId:'boss'}};
 const sent:PendingCoopCommand[]=[];
 const journal=new CoopCommandJournal({
  read:async()=>saved,
  write:async value=>{saved=value;}
 },async command=>{sent.push(command);return {accepted:true};});
 assert.equal(await journal.pendingForRun('boss-run'),true,'interrupted room choice must be recoverable');
 assert.equal(await journal.pendingForRun('another-run'),false,'never replay an unrelated dungeon choice');
 await journal.execute();
 assert.equal(sent.length,1);
 assert.equal(sent[0].body.requestId,'original-key','retry must preserve original idempotency key');
 assert.equal(saved,null,'confirmed replay clears the local journal');
 assert.equal(await journal.pendingForRun('boss-run'),false);
 saved={path:'/coop/shop',body:{requestId:'shop-operation'}};
 assert.equal(await journal.pendingForRun('boss-run'),false,'shop mutations are not resumed as dungeon choices');
 console.log('PASS dungeon boss re-entry only replays the original pending command for the same run');
}
void main();
