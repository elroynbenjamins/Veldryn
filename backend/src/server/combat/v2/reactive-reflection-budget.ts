/**
 * Hidden 2.0 per-encounter rolling reflection budget.
 * One shared allocator for Equipped 2.0 reflect affixes / Thornbound Riposte
 * and dungeon Thornbound Aegis. No public service or legacy import.
 */
export class ReactiveReflectionBudgetV2 {
 private history:Array<{atMs:number;attackerId:string;amount:number}>=[];
 /** Reserve ONLY actual authorized retaliation. All callers share the same
  * rolling five-second, enemy-specific budget, regardless of defender count. */
 reserve(args:{atMs:number;attackerId:string;attackerMaxHp:number;
  regionalBoss:boolean;requested:number}):number{
  const {atMs,attackerId,attackerMaxHp,regionalBoss,requested}=args;
  if(!Number.isSafeInteger(atMs)||atMs<0||
   !Number.isFinite(attackerMaxHp)||attackerMaxHp<=0||
   !Number.isFinite(requested)||requested<=0||
   !attackerId||attackerId.length>128)return 0;
  this.history=this.history.filter(x=>atMs-x.atMs>=0&&atMs-x.atMs<5000);
  const budget=attackerMaxHp*(regionalBoss?.001:.002);
  const spent=this.history.filter(x=>x.attackerId===attackerId)
   .reduce((sum,x)=>sum+x.amount,0);
  const approved=Math.max(0,Math.min(requested,budget-spent));
  if(approved>0)this.history.push({atMs,attackerId,amount:approved});
  return Math.round(approved*1e6)/1e6;
 }
}
