// V31 synthetic review contract. Not imported by runtime or an authorization source.
// Every outcome has marketAuthorized:false. No database or player data.
function reviewMarketCopy(input) {
  // Synthetic review contract, NOT an authority or runtime permission.
  const deny = reason => ({decision:"deny",reason,marketAuthorized:false});
  const result = (decision,reason) => ({decision,reason,marketAuthorized:false});
  if (!input || input.fixtureType !== "synthetic-market-v31") return deny("review_only");
  const {kind,action,mint,custody,policy,actor,recipient,now,offer} = input;
  if (kind === "resource") return result("delegate","independent_resource_policy");
  if (kind !== "equipment") return deny("unknown_asset");
  if (!["list","browse","buy","claim","cancel","expire","return","resale","bank"].includes(action)) return deny("unknown_action");
  const id = x => typeof x === "string" && x.length>0;
  if (!mint || mint.generation !== "equipment-2.0" || mint.original !== true || mint.committed !== true ||
      !["forge","dungeon","monster","world-boss","party-event"].includes(mint.source) ||
      !["instanceId","receiptId","catalogueVersion","policyVersion","snapshotDigest","itemId","originalAccount","sourceEntitlement"].every(k=>id(mint[k]))) return deny("original_mint_missing");
  if (!custody || !["held","banked","escrow","pending_delivery","pending_return"].includes(custody.state) ||
      !id(custody.account) || !id(custody.instanceId) || !id(custody.snapshotDigest) ||
      custody.instanceId !== mint.instanceId || custody.snapshotDigest !== mint.snapshotDigest ||
      custody.copies !== 1 || custody.physical !== true || !Number.isSafeInteger(custody.revision) || custody.revision<0) return deny("exact_custody_missing");
  if (!actor || !id(actor.account) || actor.verified !== true) return deny("actor_missing");
  const owner=actor.account===custody.account;
  const offerValid=offer && id(offer.id) && offer.instanceId===mint.instanceId && offer.seller===custody.account &&
      offer.revision===custody.revision && Number.isSafeInteger(offer.expiresAt) && Number.isSafeInteger(now);
  // Revoked trade policy must not strand legitimate custody. Recovery is a distinct workflow.
  if (action==="cancel" || action==="expire" || action==="return") {
    if (action==="return") return owner && custody.state==="pending_return" ? result("recovery_candidate","return_to_owner") : deny("wrong_return_custody");
    if (custody.state!=="escrow" || !offerValid) return deny("wrong_escrow");
    if (action==="cancel") return owner ? result("recovery_candidate","cancel_to_owner") : deny("not_owner");
    return actor.internalWorker===true && now>=offer.expiresAt ? result("recovery_candidate","expired_to_owner") : deny("not_due_or_worker");
  }
  // A purchased entitlement survives revocation. A trusted sale receipt must
  // bind the paid copy, buyer, sale ordinal and original mint digest.
  if (action==="claim") {
    const paid=input.paidDelivery;
    const eligible=recipient && recipient.verified===true && recipient.account===actor.account &&
      id(recipient.character) && recipient.requirementPolicyVersion===mint.policyVersion && recipient.requirementsMet===true;
    if (!owner || custody.state!=="pending_delivery" || !eligible || !paid ||
        paid.committed!==true || paid.buyer!==actor.account || paid.instanceId!==mint.instanceId ||
        paid.snapshotDigest!==mint.snapshotDigest || !id(paid.saleId) ||
        !Number.isSafeInteger(paid.ordinal) || paid.ordinal<1 || paid.ordinal!==custody.completedSales)
      return deny("claim_ineligible");
    return result("recovery_candidate","requires_atomic_paid_claim");
  }
  if (!policy || policy.approved!==true || policy.tradeable!==true || policy.bound!==false ||
      policy.version!==mint.policyVersion || policy.catalogueVersion!==mint.catalogueVersion ||
      policy.itemId!==mint.itemId || policy.source!==mint.source) return deny("source_policy_unapproved");
  const eligible = recipient && recipient.verified===true && recipient.account===actor.account &&
      id(recipient.character) && recipient.requirementPolicyVersion===policy.version && recipient.requirementsMet===true;
  if (action==="list" || action==="resale") {
    if (!owner || custody.state!=="held" || custody.protected!==false || input.expectedRevision!==custody.revision) return deny("not_listable_custody");
    if (!Number.isSafeInteger(custody.completedSales)||custody.completedSales<0 ||
        (action==="list" ? custody.completedSales!==0 : custody.completedSales<1)) return deny("sale_chain_mismatch");
    return result("candidate","requires_atomic_settlement");
  }
  if (action==="browse" || action==="buy") {
    if (custody.state!=="escrow" || !offerValid || now>=offer.expiresAt) return deny("offer_unavailable");
    if (action==="buy" && (owner || !eligible)) return deny("buyer_ineligible");
    return result("candidate","requires_atomic_settlement");
  }
  if (action==="bank") return owner && ["held","banked"].includes(custody.state) && eligible && custody.protected===false && input.expectedRevision===custody.revision ? result("candidate","requires_atomic_bank_move") : deny("bank_ineligible");
  return deny("unknown_action");
}

function runReviewTests() {
  const base={fixtureType:"synthetic-market-v31",kind:"equipment",action:"list",expectedRevision:2,now:100,
    mint:{generation:"equipment-2.0",original:true,committed:true,source:"forge",instanceId:"copy-1",receiptId:"receipt-1",catalogueVersion:"catalogue-test",policyVersion:"policy-test",snapshotDigest:"digest-test",itemId:"gear-1",originalAccount:"seller",sourceEntitlement:"forge-test"},
    custody:{state:"held",account:"seller",instanceId:"copy-1",snapshotDigest:"digest-test",copies:1,physical:true,revision:2,protected:false,completedSales:0},
    policy:{approved:true,tradeable:true,bound:false,version:"policy-test",catalogueVersion:"catalogue-test",itemId:"gear-1",source:"forge"},
    actor:{account:"seller",verified:true},recipient:{account:"buyer",character:"char-1",verified:true,requirementsMet:true,requirementPolicyVersion:"policy-test"},
    paidDelivery:{committed:true,buyer:"buyer",instanceId:"copy-1",snapshotDigest:"digest-test",saleId:"sale-1",ordinal:1},
    offer:{id:"offer-1",instanceId:"copy-1",seller:"seller",revision:2,expiresAt:200}};
  const cases=[
    ["first sale",{}, "candidate"],
    ["legacy",{mint:{generation:"v33"}},"deny"],
    ["preview",{mint:{original:false}},"deny"],
    ["uncommitted",{mint:{committed:false}},"deny"],
    ["missing entitlement",{mint:{sourceEntitlement:""}},"deny"],
    ["wrong instance",{custody:{instanceId:"copy-2"}},"deny"],
    ["altered stats",{custody:{snapshotDigest:"changed"}},"deny"],
    ["duplicate",{custody:{copies:2}},"deny"],
    ["shadow copy",{custody:{physical:false}},"deny"],
    ["wrong owner",{actor:{account:"other"}},"deny"],
    ["unverified actor",{actor:{verified:false}},"deny"],
    ["protected",{custody:{protected:true}},"deny"],
    ["stale",{expectedRevision:1},"deny"],
    ["bound",{policy:{bound:true}},"deny"],
    ["unapproved",{policy:{approved:false}},"deny"],
    ["wrong policy source",{policy:{source:"dungeon"}},"deny"],
    ["wrong item",{policy:{itemId:"other"}},"deny"],
    ["wrong catalogue",{policy:{catalogueVersion:"other"}},"deny"],
    ["resale",{action:"resale",custody:{completedSales:2}},"candidate"],
    ["resale with no sales",{action:"resale"},"deny"],
    ["first sale on resale",{custody:{completedSales:1}},"deny"],
    ["browse",{action:"browse",custody:{state:"escrow"}},"candidate"],
    ["stale offer",{action:"browse",custody:{state:"escrow"},offer:{revision:1}},"deny"],
    ["expired",{action:"browse",custody:{state:"escrow"},now:200},"deny"],
    ["buy",{action:"buy",custody:{state:"escrow"},actor:{account:"buyer"}},"candidate"],
    ["self purchase",{action:"buy",custody:{state:"escrow"}},"deny"],
    ["underlevel",{action:"buy",custody:{state:"escrow"},actor:{account:"buyer"},recipient:{requirementsMet:false}},"deny"],
    ["foreign recipient",{action:"buy",custody:{state:"escrow"},actor:{account:"buyer"},recipient:{account:"other"}},"deny"],
    ["stale recipient policy",{action:"buy",custody:{state:"escrow"},actor:{account:"buyer"},recipient:{requirementPolicyVersion:"old"}},"deny"],
    ["claim",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:1},actor:{account:"buyer"}},"recovery_candidate"],
    ["revoked paid claim",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:1},actor:{account:"buyer"},policy:{approved:false}},"recovery_candidate"],
    ["unpaid claim",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:1},actor:{account:"buyer"},paidDelivery:null},"deny"],
    ["foreign sale receipt",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:1},actor:{account:"buyer"},paidDelivery:{buyer:"other"}},"deny"],
    ["wrong sale ordinal",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:2},actor:{account:"buyer"}},"deny"],
    ["ineligible paid recipient",{action:"claim",custody:{state:"pending_delivery",account:"buyer",completedSales:1},actor:{account:"buyer"},recipient:{requirementsMet:false}},"deny"],
    ["double claim",{action:"claim",custody:{account:"buyer"},actor:{account:"buyer"}},"deny"],
    ["revoked cancellation",{action:"cancel",custody:{state:"escrow"},policy:{approved:false}},"recovery_candidate"],
    ["unauthorized cancel",{action:"cancel",custody:{state:"escrow"},actor:{account:"other"}},"deny"],
    ["due worker",{action:"expire",custody:{state:"escrow"},actor:{internalWorker:true},now:200},"recovery_candidate"],
    ["early worker",{action:"expire",custody:{state:"escrow"},actor:{internalWorker:true}},"deny"],
    ["ordinary expiry",{action:"expire",custody:{state:"escrow"},now:200},"deny"],
    ["revoked return",{action:"return",custody:{state:"pending_return"},policy:{tradeable:false}},"recovery_candidate"],
    ["wrong return owner",{action:"return",custody:{state:"pending_return"},actor:{account:"other"}},"deny"],
    ["bank move",{action:"bank",recipient:{account:"seller"}},"candidate"],
    ["banked listing",{custody:{state:"banked"}},"deny"],
    ["resource independent",{kind:"resource",mint:null},"delegate"],
    ["no fixture marker",{fixtureType:"runtime"},"deny"],
    ["unknown action",{action:"grant"},"deny"]
  ];
  for (const [name,patch,expected] of cases) {
    const obj={...base,...patch};
    for (const k of ["mint","custody","policy","actor","recipient","offer","paidDelivery"]) if (patch[k] && typeof patch[k]==="object") obj[k]={...base[k],...patch[k]};
    const got=reviewMarketCopy(obj);
    if(got.decision!==expected || got.marketAuthorized!==false) throw Error(name+": "+JSON.stringify(got));
  }
  return cases.length;
}

console.log('Market V31 synthetic review cases passed: '+runReviewTests());
