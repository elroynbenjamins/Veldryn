// Synthetic snapshot coverage contract only. Never accepts runtime inputs or grants Market authority.
function custodyReview(input) {
  const out=(decision,reason)=>({decision,reason,marketAuthorized:false});
  const deny=reason=>out("deny",reason);
  const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
  if(!input||input.fixture!=="synthetic-v35")return deny("review_only");
  const {actor,account,mint,ledger,stores,expectedRevision}=input;
  if(!actor||!id(actor.account)||!account||actor.account!==account.id||actor.verified!==true||
    !Number.isSafeInteger(account.revision)||account.revision<0||expectedRevision!==account.revision)
    return deny("actor_or_revision");
  if(!mint||mint.generation!=="equipment-2.0"||mint.committed!==true||!id(mint.instance)||!id(mint.digest)||!id(mint.receipt))return deny("mint");
  if(!ledger||ledger.instance!==mint.instance||ledger.owner!==account.id||ledger.mintDigest!==mint.digest||!id(ledger.currentDigest))return deny("ledger");
  if(!Array.isArray(account.characters)||!account.characters.every(id)||new Set(account.characters).size!==account.characters.length||
     !Array.isArray(stores)||!Array.isArray(account.savedLoadoutInstances)||!Array.isArray(account.protectedInstances))return deny("snapshot");
  const expected=new Set(["bank",...account.characters.flatMap(c=>["inventory:"+c,"pouch:"+c,"equipped:"+c])]);
  const seen=new Set(), copies=[];
  for(const store of stores){
    if(!store||!expected.has(store.key)||seen.has(store.key)||!Array.isArray(store.items))return deny("store_coverage");
    seen.add(store.key);
    for(const copy of store.items){
      if(!copy||!id(copy.instance)||!id(copy.mintDigest)||!id(copy.currentDigest))return deny("invalid_copy");
      if(copy.instance===mint.instance)copies.push({store:store.key,copy});
    }
  }
  if(seen.size!==expected.size)return deny("store_coverage");
  const virtual=["escrow","pending_delivery","pending_return"];
  if(virtual.includes(ledger.location)){
    if(copies.length!==0)return deny("shadow_duplicate");
    if(!id(ledger.entitlement))return deny("entitlement_missing");
    return out("recovery_only","requires_authoritative_entitlement");
  }
  if(copies.length!==1)return deny("copy_count");
  const {store,copy}=copies[0];
  if(store!==ledger.location||copy.mintDigest!==mint.digest||copy.currentDigest!==ledger.currentDigest)return deny("location_or_digest");
  if(store.startsWith("equipped:")||copy.locked!==false||copy.favorite!==false||
     account.savedLoadoutInstances.includes(mint.instance)||account.protectedInstances.includes(mint.instance))return deny("protected");
  if(store==="bank")return out("bank_candidate","withdraw_before_listing");
  return out("held_candidate","requires_locked_physical_recheck");
}
function runCustodyReview() {
  const base={fixture:"synthetic-v35",actor:{account:"a",verified:true},account:{id:"a",revision:9,characters:["a1","a2"],savedLoadoutInstances:[],protectedInstances:[]},
    expectedRevision:9,mint:{instance:"x",receipt:"mint-1",digest:"origin",generation:"equipment-2.0",committed:true},
    ledger:{instance:"x",owner:"a",mintDigest:"origin",currentDigest:"current",location:"inventory:a1"},
    stores:["bank","inventory:a1","pouch:a1","equipped:a1","inventory:a2","pouch:a2","equipped:a2"].map(key=>({key,items:key==="inventory:a1"?[{instance:"x",mintDigest:"origin",currentDigest:"current",locked:false,favorite:false}]:[]}))};
  const copy=base.stores[1].items[0];
  const relocate=(key,patch={})=>base.stores.map(s=>({...s,items:s.key===key?[{...copy,...patch}]:[]}));
  const cases=[
    ["held",{},"held_candidate"],
    ["pouch",{stores:relocate("pouch:a1"),ledger:{location:"pouch:a1"}},"held_candidate"],
    ["bank",{stores:relocate("bank"),ledger:{location:"bank"}},"bank_candidate"],
    ["equipped",{stores:relocate("equipped:a1"),ledger:{location:"equipped:a1"}},"deny"],
    ["locked",{stores:relocate("inventory:a1",{locked:true})},"deny"],
    ["favorite",{stores:relocate("inventory:a1",{favorite:true})},"deny"],
    ["unknown protection",{stores:relocate("inventory:a1",{locked:null})},"deny"],
    ["saved",{account:{savedLoadoutInstances:["x"]}},"deny"],
    ["other protection",{account:{protectedInstances:["x"]}},"deny"],
    ["legacy",{mint:{generation:"v33"}},"deny"],
    ["uncommitted",{mint:{committed:false}},"deny"],
    ["stale",{expectedRevision:8},"deny"],
    ["foreign",{actor:{account:"b"}},"deny"],
    ["unverified",{actor:{verified:false}},"deny"],
    ["duplicate store",{stores:[...base.stores,base.stores[0]]},"deny"],
    ["missing alt store",{stores:base.stores.slice(0,-1)},"deny"],
    ["duplicate across alts",{stores:base.stores.map(s=>s.key==="inventory:a2"?{...s,items:[copy]}:s)},"deny"],
    ["wrong location",{ledger:{location:"inventory:a2"}},"deny"],
    ["wrong mint digest",{stores:relocate("inventory:a1",{mintDigest:"forged"})},"deny"],
    ["wrong current digest",{stores:relocate("inventory:a1",{currentDigest:"forged"})},"deny"],
    ["missing physical copy",{stores:relocate("none")},"deny"],
    ["escrow duplicate",{ledger:{location:"escrow",entitlement:"offer-1"}},"deny"],
    ["escrow",{stores:relocate("none"),ledger:{location:"escrow",entitlement:"offer-1"}},"recovery_only"],
    ["pending delivery",{stores:relocate("none"),ledger:{location:"pending_delivery",entitlement:"sale-1"}},"recovery_only"],
    ["pending return missing entitlement",{stores:relocate("none"),ledger:{location:"pending_return"}},"deny"],
    ["pending return",{stores:relocate("none"),ledger:{location:"pending_return",entitlement:"return-1"}},"recovery_only"],
    ["different owner",{ledger:{owner:"b"}},"deny"],
    ["runtime input",{fixture:"runtime"},"deny"]
  ];
  for(const [name,patch,expected] of cases){
    const fixture={...base,...patch};
    for(const key of ["actor","account","mint","ledger"])if(patch[key])fixture[key]={...base[key],...patch[key]};
    const result=custodyReview(fixture);
    if(result.decision!==expected||result.marketAuthorized!==false)throw Error(name+":"+JSON.stringify(result));
  }
  return cases.length;
}
console.log('Market physical custody synthetic cases passed: '+runCustodyReview());
