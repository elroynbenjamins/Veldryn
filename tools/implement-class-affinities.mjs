import {readFileSync,writeFileSync} from 'node:fs';
const pending=new Map();const read=p=>pending.has(p)?pending.get(p):readFileSync(p,'utf8');
function edit(p,from,to){const text=read(p);if(text.includes(to)){console.log('Already applied:',p);return;}const count=text.split(from).length-1;if(count!==1)throw new Error(`${p}: expected one source match, found ${count}: ${from.slice(0,100)}`);pending.set(p,text.replace(from,to));}
const game='apps/mobile/src/core/game.ts';
// Millisecond timestamps already carry the server's authority. Discarding a fraction at every
// claim loses time; preserve it before converting to cycle progress, without changing timers.
for(const reward of ['previewAlchemyReward','previewProcessingReward'])for(const name of ['base','baseReward']){
 const from=`const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,Math.floor((nowMs-state.activity.lastClaimAtMs)/1000))),${name}=${reward}(state,elapsed)`;
 const to=`const elapsed=Math.min(offlineCapSeconds(state),Math.max(0,(nowMs-state.activity.lastClaimAtMs)/1000)),${name}=${reward}(state,elapsed)`;
 edit(game,from,to);
}
const test='apps/mobile/tests/class-skill-affinities.ts';
edit(test,'console.log(`Class affinity checks: ${passes} passed, ${failures.length} failed`);',`check('processing preserves sub-second claims exactly like one claim',()=>{
 let state=startProcessingBatch(funded('IRONWARDEN',smelt.inputs),smelt.id,5,NOW);
 const once=claimActivity(state,NOW+60000).state;
 for(let i=1;i<=120;i++)state=claimActivity(state,NOW+i*500).state;
 assert.equal(state.skills.find(row=>row.skillId==='smithing')!.xp,once.skills.find(row=>row.skillId==='smithing')!.xp);
 assert.equal(state.activity!.processing!.remainingBatches,once.activity!.processing!.remainingBatches);
 near(state.activity!.progressFraction!,once.activity!.progressFraction!);
 assert.deepEqual(state.inventory.stacks,once.inventory.stacks);
});
check('brewing preserves sub-second claims exactly like one claim',()=>{
 const r=ALCHEMY_RECIPES[0];let state=startAlchemyBatch(funded('DREADGUARD',r.inputs),r.id,5,NOW);
 const once=claimActivity(state,NOW+60000).state;
 for(let i=1;i<=120;i++)state=claimActivity(state,NOW+i*500).state;
 assert.equal(state.skills.find(row=>row.skillId==='alchemy')!.xp,once.skills.find(row=>row.skillId==='alchemy')!.xp);
 assert.equal(state.activity!.brew!.remainingBatches,once.activity!.brew!.remainingBatches);
 near(state.activity!.progressFraction!,once.activity!.progressFraction!);
 assert.deepEqual(state.inventory.stacks,once.inventory.stacks);
});
console.log(\`Class affinity checks: \${passes} passed, \${failures.length} failed\`);`);
for(const [file,text] of pending){writeFileSync(file,text);console.log('Updated',file);}
console.log('Sub-second profession settlement and regression checks integrated.');
