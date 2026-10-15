import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';
import {itemDef} from '../src/content/items';
function eq(a:unknown,b:unknown){if(a!==b)throw Error(String(a)+' != '+String(b))}
function fails(fn:()=>unknown){let threw=false;try{fn()}catch{threw=true}if(!threw)throw Error('Expected rejection')}
let s=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Bank Tester',body:'male'}},1,{characterId:'11111111-1111-4111-8111-111111111111'}).state;
s={...s,character:{...s.character!,gold:1000},bank:{...s.bank,gold:0,stacks:[{itemId:'COPPER_ORE',quantity:10}]}};
const run=(type:string,args:Record<string,unknown>)=>executeGameCommand(s,{type,args},2).state;
s=run('bank_gold_deposit',{amount:600});eq(s.character!.gold,400);eq(s.bank.gold,600);
s=run('bank_gold_withdraw',{amount:250});eq(s.character!.gold,650);eq(s.bank.gold,350);
fails(()=>run('bank_gold_withdraw',{amount:351}));fails(()=>run('bank_gold_deposit',{amount:-1}));
s=run('bank_sell',{id:'COPPER_ORE',quantity:3});
eq(s.bank.stacks.find(x=>x.itemId==='COPPER_ORE')?.quantity,7);
eq(s.bank.gold,350+3*itemDef('COPPER_ORE').value);eq(s.character!.gold,650);
fails(()=>run('bank_sell',{id:'COPPER_ORE',quantity:8}));
console.log('Bank transaction checks passed');
