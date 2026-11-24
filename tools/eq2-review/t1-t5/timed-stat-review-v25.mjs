import {readFileSync} from 'node:fs';
import {contract} from './normalized-effect-review-v18.mjs';
const v17=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-set-trait-authoring-review-v17.json',import.meta.url),'utf8'));
const fail=id=>{throw Error('eq2_v25_source_mismatch:'+id);};
export function sourceAudit(){
 const rows=[];
 for(const [tier,value] of [[1,3.2],[2,3.6],[3,4],[4,4.4]]){
  const id='eq2_t'+tier+'_oathplate',m=v17.sets.find(x=>x.setId===id)?.milestones.find(x=>x.pieces===4);
  if(!m||m.trigger!=='direct_nontrue_hp_loss_at_least_5pct'||m.effect!=='defense_pct'||m.value!==value||m.durationSeconds!==6||m.internalCooldownSeconds!==18)fail(id);
  rows.push({id:id+':4',channel:'defense',pct:value,threshold:5,durationSeconds:6,cd:18});
 }
 for(const [tier,region] of [[2,'ROOTBOUND_T2'],[4,'OBSERVATORY_T4'],[5,'SHIVERLAKE_T5']]){
  const id='EQ2_DUNGEON_'+region+'_WEAPON_IRONWARDEN',m=v17.traits.find(x=>x.itemId===id);
  if(!m||m.classId!=='IRONWARDEN'||m.tier!==tier||m.trigger!=='mitigated_direct_hit'||m.effect!=='defense_pct'||m.value!==4||m.durationSeconds!==5||m.internalCooldownSeconds!==20)fail(id);
  rows.push({id,channel:'defense',pct:4,durationSeconds:5,cd:20});
 }
 for(const s of [
  {setId:'eq2_t5_oathplate',pieces:4,trigger:'direct_nontrue_hp_loss',channel:'defense_pct',pct:4,threshold:5,durationSeconds:6,cd:16},
  {setId:'eq2_t4_bastionmail',pieces:4,trigger:'blocked_or_mitigated_direct_hit',channel:'defense_pct',pct:4,durationSeconds:5,cd:14},
  {setId:'eq2_combo_t5_runeforge_link',pieces:2,trigger:'direct_ability_hit_or_effective_heal',channel:'haste_pp',pct:2,durationSeconds:6,cd:18}
 ]){
  const m=contract.sets.find(x=>x.setId===s.setId&&x.pieces===s.pieces),o=m?.outputs?.[0];
  if(!m||m.trigger!==s.trigger||m.outputs.length!==1||o.channel!==s.channel||o.value!==s.pct||o.durationSeconds!==s.durationSeconds||m.internalCooldownSeconds!==s.cd||(s.threshold&&m.minActualHpLossPct!==s.threshold))fail(s.setId);
  if(s.channel==='haste_pp'&&(o.unit!=='percentage_points'||m.candidateUnitReauthor!==true))fail('haste_unit');
  rows.push({id:s.setId+':'+s.pieces,channel:s.channel,pct:s.pct,durationSeconds:s.durationSeconds,cd:s.cd});
 }
 return {sourceIds:rows.length,distinctMechanics:4,rows,reviewOnly:true,releaseApproved:false};
}
