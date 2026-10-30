import {launchPlayer} from '../../combat/content/launch-combat';
import {initialPersistentRunState,resolveCoopNode} from '../../expeditions/node-resolution';
import {generateCoopRouteGraph} from '../../expeditions/route-generation';
const tiers=[1,2,3,4,5] as const;
// Opt-in release QA: 1,000 complete dungeon routes per tier and composition.
// Never run in fast mobile CI. These are deterministic synthetic outcomes, not real-player telemetry.
// Lightweight deterministic audit. These figures are diagnostics, not claims
// about production clear rates; larger calibrated trials gate the rollout.
const baselineParties=[
 {name:'restoration',party:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25))},
 {name:'utility',party:['Ironwarden','Hexweaver','Knife Dancer','Stonecaller'].map(name=>launchPlayer(name,25))},
];
const moreVariants=[
 {name:'lean-restoration',party:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25)).map(actor=>({...actor,stats:{...actor.stats,maxHp:Math.round(actor.stats.maxHp*.88),attackPower:Math.round(actor.stats.attackPower*.88),healingPower:Math.round(actor.stats.healingPower*.88),defense:Math.round(actor.stats.defense*.88)}}))},
 {name:'strong-restoration',party:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(name=>launchPlayer(name,25)).map(actor=>({...actor,stats:{...actor.stats,maxHp:Math.round(actor.stats.maxHp*1.12),attackPower:Math.round(actor.stats.attackPower*1.12),healingPower:Math.round(actor.stats.healingPower*1.12),defense:Math.round(actor.stats.defense*1.12)}}))},
];
baselineParties.push(...moreVariants);
const trials=1000;
const audit:{party:string;tier:number;clears:number;rate:number}[]=[];
for(const baseline of baselineParties){
 for(const tier of tiers){
  let wins=0;
  for(let n=0;n<trials;n++){
   const id=`tier-audit-${baseline.name}-${n}`;
   const tree=generateCoopRouteGraph('tier-audit', 'EXP_001',id,'audit-v2','audit-v2');
   let state=initialPersistentRunState(baseline.party),current=tree.entryNodeId,alive=true;
   for(let depth=1;depth<=tree.preBossNodeCount;depth++){
    const currentNode=tree.nodes.find(node=>node.nodeId===current)!;
    const choices=currentNode.nextNodeIds.map(nodeId=>tree.nodes.find(node=>node.nodeId===nodeId)!);
    const node=choices.find(item=>item.kind==='camp')??choices[0];
    const result=resolveCoopNode({runId:id,serverSecret:'tier-audit',node,players:baseline.party,state,tier});
    state=result.state;current=node.nodeId;
    if(!result.success){alive=false;break;}
   }
   if(alive){
    const bossNode=tree.nodes.find(node=>node.nodeId===tree.bossNodeId)!;
    const result=resolveCoopNode({runId:id,serverSecret:'tier-audit',node:bossNode,players:baseline.party,state,tier});
    alive=result.success;
   }
   if(alive)wins++;
  }
  audit.push({party:baseline.name,tier,clears:wins,rate:Number((wins/trials).toFixed(3))});
 }
}
console.log('Tier balance audit (diagnostic, n=1000 per tier/party):',JSON.stringify(audit));

console.log('PASS optional 1,000-run five-tier simulation matrix');
