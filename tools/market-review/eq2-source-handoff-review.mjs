// Review-only crosswalk, no runtime exports or authority.
import {readFileSync} from 'node:fs';
function auditSourceCrosswalk(snapshot) {
  const fail=reason=>{throw Error(reason)};
  if(!snapshot||snapshot.schema!=="market-source-review-v1"||snapshot.reviewOnly!==true||
     snapshot.marketAuthorized!==false||!Array.isArray(snapshot.equipment)||!Array.isArray(snapshot.materials))fail("invalid_review");
  const validId=x=>typeof x==="string"&&/^EQ2_[A-Z0-9_]+$/.test(x);
  const knownTypes=new Set(["structural_set_member_proposal","ordinary_forge_template","dungeon_boss_drop_only","elite_or_zone_boss_blueprint_craft_proposal","rare_crafted_set_candidate","craft_recipe_proposal","class_armament_craft_proposal"]);
  const ids=new Map();
  for(const row of snapshot.equipment){
    if(!row||!validId(row.itemId)||!Number.isInteger(row.tier)||row.tier<1||row.tier>5||
       !knownTypes.has(row.sourceType)||typeof row.sourceGroup!=="string"||row.mayTrade!==false||ids.has(row.itemId))fail("bad_equipment");
    ids.set(row.itemId,{kind:"equipment",type:row.sourceType});
  }
  for(const row of snapshot.materials){
    if(!row||!validId(row.itemId)||!Number.isInteger(row.tier)||row.tier<1||row.tier>4||
       !["monster","gathering","either","processing"].includes(row.source)||row.mayTrade!==false||row.registered!==false||ids.has(row.itemId))fail("bad_material");
    ids.set(row.itemId,{kind:"resource",type:row.source});
  }
  if(snapshot.equipment.length!==554||snapshot.materials.length!==29||
    snapshot.equipment.filter(e=>e.sourceType==="dungeon_boss_drop_only").length!==75||
    snapshot.equipment.filter(e=>e.sourceGroup==="pinned_forge_169").length!==169||
    snapshot.materials.filter(e=>e.source==="processing").length!==15)fail("pin_count_mismatch");
  return ids;
}
function reviewSource(ids, request) {
  const result=reason=>({reason,mayMint:false,mayTrade:false,marketAuthorized:false});
  if(!request||request.fixture!=="synthetic-market-source-v1"||typeof request.itemId!=="string")return result("review_only");
  const known=ids.get(request.itemId);
  if(!known)return result(request.source==="world-boss"||request.source==="party-event"?"event_source_not_registered":"unknown_identity");
  if(request.kind!==known.kind)return result("asset_kind_mismatch");
  if(request.source==="world-boss"||request.source==="party-event")return result("event_source_not_registered");
  if(known.kind==="resource"){
    const types=known.type==="either"?["monster","gathering"]:[known.type];
    return result(types.includes(request.source)?"unregistered_material_origin":"source_mismatch");
  }
  if(known.type==="dungeon_boss_drop_only"){
    if(request.source!=="dungeon")return result("boss_only_source_mismatch");
    if(request.humanFinalEntitlement!==true||request.success!==true||request.enhanced!==true)return result("boss_entitlement_not_proven");
    return result("boss_issuer_not_registered");
  }
  if(known.type==="elite_or_zone_boss_blueprint_craft_proposal"){
    return result(request.source==="forge"?"blueprint_and_forge_not_registered":"blueprint_is_not_equipment_mint");
  }
  if(known.type==="structural_set_member_proposal")return result("structural_template_not_registered");
  if(request.source!=="forge")return result("source_mismatch");
  return result("forge_issuer_not_registered");
}
function sourceTests(snapshot) {
  const ids=auditSourceCrosswalk(snapshot);let count=0;
  const check=(v,name)=>{if(!v)throw Error(name);count++};
  const go=(itemId,kind,source,extra={})=>reviewSource(ids,{fixture:"synthetic-market-source-v1",itemId,kind,source,...extra});
  for(const row of snapshot.equipment){
    const source=row.sourceType==="dungeon_boss_drop_only"?"dungeon":"forge";
    const got=go(row.itemId,"equipment",source,{humanFinalEntitlement:true,success:true,enhanced:true,claimedVerified:true});
    check(got.marketAuthorized===false&&got.mayMint===false&&got.mayTrade===false,row.itemId);
    check(go(row.itemId,"resource",source).reason==="asset_kind_mismatch","equipment-as-resource "+row.itemId);
  }
  for(const row of snapshot.materials){
    const got=go(row.itemId,"resource",row.source==="either"?"gathering":row.source,{claimedVerified:true});
    check(got.reason==="unregistered_material_origin"&&!got.mayTrade,row.itemId);
    check(go(row.itemId,"equipment","forge").reason==="asset_kind_mismatch","material-as-equipment "+row.itemId);
  }
  const boss=snapshot.equipment.find(e=>e.sourceType==="dungeon_boss_drop_only").itemId;
  check(go(boss,"equipment","forge").reason==="boss_only_source_mismatch","boss fake forge");
  check(go(boss,"equipment","dungeon",{success:true,enhanced:true}).reason==="boss_entitlement_not_proven","NPC/Echo");
  check(go(boss,"equipment","dungeon",{humanFinalEntitlement:true,success:true,enhanced:false}).reason==="boss_entitlement_not_proven","no charge");
  check(go(boss,"equipment","dungeon",{humanFinalEntitlement:true,success:true,enhanced:true}).reason==="boss_issuer_not_registered","unregistered boss");
  check(go(boss,"equipment","world-boss").reason==="event_source_not_registered","world boss substitute");
  check(go(boss,"equipment","party-event").reason==="event_source_not_registered","party substitute");
  check(go("EQ2_FAKE","equipment","forge").reason==="unknown_identity","unknown");
  check(go("EQ2_FAKE","equipment","world-boss").reason==="event_source_not_registered","unknown event");
  check(go(boss,"equipment","dungeon",{fixture:"runtime"}).reason==="review_only","runtime");
  const raw=snapshot.materials.find(e=>e.source==="gathering").itemId;
  check(go(raw,"resource","processing").reason==="source_mismatch","wrong material origin");
  const blueprint=snapshot.equipment.find(e=>e.sourceType==="elite_or_zone_boss_blueprint_craft_proposal").itemId;
  check(go(blueprint,"equipment","monster").reason==="blueprint_is_not_equipment_mint","blueprint not item");
  for(const mutate of [
    s=>{s.equipment[0].mayTrade=true},
    s=>{s.materials[0].registered=true},
    s=>{s.materials[0].itemId=s.equipment[0].itemId},
    s=>{s.equipment.pop()},
    s=>{s.marketAuthorized=true}
  ]) {
    const s=JSON.parse(JSON.stringify(snapshot));mutate(s);let rejected=false;
    try{auditSourceCrosswalk(s)}catch(e){rejected=true}
    check(rejected,"tampered crosswalk");
  }
  return count;
}
const snapshot=JSON.parse(readFileSync(new URL('./source-crosswalk-v1.json',import.meta.url),'utf8'));
console.log('Market source crosswalk checks passed: '+sourceTests(snapshot));
