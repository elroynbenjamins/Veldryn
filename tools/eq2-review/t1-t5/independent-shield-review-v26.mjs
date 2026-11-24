import {readFileSync} from 'node:fs';
import {contract} from './normalized-effect-review-v18.mjs';
const v17=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-set-trait-authoring-review-v17.json',import.meta.url),'utf8'));
const fail=id=>{throw Error('eq2_v26_source_mismatch:'+id);};
export function sourceAudit(){
 const rows=[];
 for(const [id,value,cd] of [['eq2_t1_citadel',3.2,24],['eq2_t2_citadel',3.6,24],['eq2_t3_citadel',4,24],['EQ2_SET_GLASSBOUND_BULWARK',4.5,22]]){
  const m=v17.sets.find(s=>s.setId===id)?.milestones.find(m=>m.pieces===4);
  if(!m||m.trigger!=='direct_nontrue_hp_loss_at_least_6pct'||m.effect!=='shield'||m.unit!=='percent_target_max_hp'||m.value!==value||m.durationSeconds!==6||m.internalCooldownSeconds!==cd||m.target!=='self')fail(id);
  rows.push({id:id+':4',value,cd,trigger:'loss',threshold:6,duration:6});
 }
 for(const [id,pieces,value,cd,trigger,threshold,field] of [
  ['eq2_dungeon_rootbound_t2_heartward',4,4,22,'direct_nontrue_hp_loss',6,'minActualHpLossPct'],
  ['eq2_rare_t5_citadel',4,6,18,'direct_nontrue_hp_loss',8,'minActualHpLossPct'],
  ['eq2_t4_bastionmail',6,5,35,'cross_below_hp',35,'thresholdHpPct'],
  ['eq2_t5_rimewatch',4,4,24,'direct_nontrue_hp_loss',50,'selfBelowHpPct']
 ]){
  const m=contract.sets.find(s=>s.setId===id&&s.pieces===pieces),o=m?.outputs?.[0];
  if(!m||m.trigger!==trigger||m[field]!==threshold||m.outputs.length!==1||o.channel!=='shield'||o.unit!=='percent_target_max_hp'||o.target!=='self'||o.value!==value||o.durationSeconds!==6||m.internalCooldownSeconds!==cd)fail(id);
  rows.push({id:id+':'+pieces,value,cd,trigger,threshold,duration:6});
 }
 return {sourceIds:rows.length,mechanicFamilies:6,triggerForms:3,rows,reviewOnly:true,releaseApproved:false};
}
