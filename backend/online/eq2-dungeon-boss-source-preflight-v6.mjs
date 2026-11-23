/**
 * UNMOUNTED, fail-closed source verification PREFLIGHT ONLY.
 *
 * Maps real expedition_runs, coop_reward_entitlements, route_graph_json nodes,
 * coop_node_results, and authoritative boss IDs. The calling SQL transaction,
 * issuer, RNG, new EQ2 instance storage and the Market-positive bridge do
 * not exist here. Even a fully passing synthetic row NEVER authorizes mint.
 *
 * Do not export a public Edge route or import this into claim_coop_reward.
 * The caller must eventually re-read/lock trusted DB rows and original
 * custody inside one privileged server transaction.
 */
export const EQ2_PREMIUM_RELEASED = false;

const AUTHORED_BOSS_IDS = Object.freeze({
  EXP_001: Object.freeze(['BOSS_EXP_ROOT','BOSS_EXP_BELL']),
  EXP_003: Object.freeze(['BOSS_EXP_SOLAR','BOSS_EXP_SPHINX']),
  EXP_005: Object.freeze(['BOSS_EXP_BELLBEAST','BOSS_EXP_CANTOR']),
  EXP_007: Object.freeze(['BOSS_EXP_FEN','BOSS_EXP_PRIME'])
});
const ACTIVE_SOURCE_DUNGEONS = new Set(['EXP_001','EXP_003']);
const RETIRED_DUNGEONS = new Set(['EXP_002','EXP_004','EXP_006','EXP_008']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refuse(reason, details={}) {
  return Object.freeze({
    eligibleInReview:false, reason, ...details,
    mintAuthorized:false, marketAuthorized:false, releaseEnabled:false
  });
}
function validUuid(value) {return typeof value==='string' && UUID_PATTERN.test(value);}
function dateMillis(value) {
  if (typeof value!=='string' || !value) return null;
  const v=Date.parse(value);
  return Number.isFinite(v)?v:null;
}

/**
 * Inspect DB row *shapes* after the SOURCE-OWNED DB join. This function
 * never trusts a browser request or serializable object as authorization.
 * Expected properties mirror the real columns as of 23 November 2026.
 *
 * @param {object} snapshot - a review fixture, NEVER a trusted authorization
 * @returns {object} review candidate and an irrevocable mintAuthorized:false
 */
export function reviewBossRewardSourceV6(snapshot) {
  const {run, entitlement, bossNodeResults} = snapshot??{};
  if (!run || !entitlement || !Array.isArray(bossNodeResults)) return refuse('SOURCE_ROWS_REQUIRED');
  if (!validUuid(run.id) || !validUuid(entitlement.id)) return refuse('BAD_CANONICAL_RECEIPT_ID');
  if (run.status!=='completed' || run.phase!=='completed' || !dateMillis(run.completed_at)) return refuse('RUN_NOT_COMPLETED');
  const dungeonId=run.expedition_id;
  if (RETIRED_DUNGEONS.has(dungeonId)) return refuse('RETIRED_DUNGEON');
  const permitted=AUTHORED_BOSS_IDS[dungeonId];
  if (!permitted || permitted.length!==2) return refuse('UNKNOWN_DUNGEON');
  if (!ACTIVE_SOURCE_DUNGEONS.has(dungeonId)) return refuse('DUNGEON_NOT_PUBLISHED');
  if (entitlement.run_id!==run.id) return refuse('ENTITLEMENT_RUN_MISMATCH');
  if (!validUuid(entitlement.recipient_account_id) || !validUuid(entitlement.character_id)) return refuse('NO_PHYSICAL_HUMAN_RECIPIENT');
  if (entitlement.entitlement_kind!=='participant' || entitlement.reward_stage!=='final') return refuse('NOT_HUMAN_FINAL_PARTICIPANT');
  if (!dateMillis(entitlement.claimed_at) || dateMillis(entitlement.claimed_at)<dateMillis(run.completed_at)) {
    return refuse('MISSING_OR_EARLY_CLAIM');
  }
  if (entitlement.reward_json?.enhanced_reward!==true) return refuse('REQUIRES_ENHANCED_CHARGE');
  if (!run.route_graph_json || run.route_graph_json.runId!==run.id || run.route_graph_json.expeditionId!==dungeonId) {
    return refuse('ROUTE_IDENTITY_MISMATCH');
  }
  const nodes=run.route_graph_json.nodes;
  if (!Array.isArray(nodes) || nodes.length===0) return refuse('MISSING_ROUTE_GRAPH');
  const bossNodes=nodes.filter(n=>n?.kind==='boss');
  if (bossNodes.length<1 || !bossNodes.some(n=>n.nodeId===run.route_graph_json.bossNodeId)) {
    return refuse('UNVERIFIED_BOSS_ROUTE');
  }
  const bossIds=new Set(bossNodes.map(n=>n.contentId));
  if (bossIds.size!==1) return refuse('BOSS_VARIANT_NOT_FROZEN');
  const [bossId]=bossIds;
  if (!permitted.includes(bossId)) return refuse('BOSS_NOT_IN_AUTHORED_VARIANTS');
  const ids=new Set();
  for(const n of bossNodes){
    if(typeof n.nodeId!=='string' || !n.nodeId || ids.has(n.nodeId)) return refuse('DUPLICATE_BOSS_NODE_ID');
    ids.add(n.nodeId);
  }
  const positive=[];
  for (const r of bossNodeResults) {
    if (r?.run_id!==run.id || !ids.has(r.node_id)) return refuse('UNRELATED_BOSS_COMBAT_RESULT');
    if (r.success===true) {
      if (r.result_json?.kind!=='combat' || r.result_json?.reason!=='victory' || !r.result_json?.eventDigest) {
        return refuse('UNVERIFIED_BOSS_COMBAT_VICTORY');
      }
      const at=dateMillis(r.committed_at);
      if (!at || at>dateMillis(run.completed_at) || at>dateMillis(entitlement.claimed_at)) {
        return refuse('BOSS_PROOF_NOT_COMMITTED_BEFORE_REWARD');
      }
      positive.push(r);
    }
  }
  if(positive.length!==1) return refuse('REQUIRES_EXACT_ONE_TERMINAL_BOSS_VICTORY');
  const winningNode= bossNodes.find(n=>n.nodeId===positive[0].node_id);
  if(!winningNode || winningNode.contentId!==bossId) return refuse('WINNING_BOSS_VARIANT_MISMATCH');
  const source={
    dungeonId,bossId,runId:run.id,bossNodeId:winningNode.nodeId,entitlementId:entitlement.id,
    recipientAccountId:entitlement.recipient_account_id,characterId:entitlement.character_id,
    rewardStage:'final',proposedEligibilityPolicy:'ENHANCED_BOSS_CLEAR_ONLY',
    // No object output from this module is authorized to credit items or funds.
    pendingMandatoryDBProof:[
      'unique_ledger_key_for_entitlement_once',
      'server_random_selection_and_frozen_reward_receipt',
      'trusted_eq2_mint_instance_and_item_snapshot',
      'same_transaction_physical_custody_insert',
      'market_v30_legacy_fence_and_positive_eq2_origin_adapter'
    ]
  };
  return Object.freeze({
    eligibleInReview:true, reason:'REVIEW_SOURCE_SHAPE_VALID',
    source:Object.freeze(source),
    mintAuthorized:false,marketAuthorized:false,releaseEnabled:false
  });
}

/**
 * Never trust the proposed above source for a Market or grant. This is a
 * cross-module assertion that no preview result can become its own proof.
 */
export function reviewMarketBossOriginV6(proposedSource, originalItem, currentCustody) {
  if (proposedSource?.mintAuthorized!==false) return refuse('UNTRUSTED_OR_MISSING_PREVIEW_SOURCE');
  if (!proposedSource?.eligibleInReview) return refuse('SOURCE_DID_NOT_PASS_REVIEW');
  if (!originalItem || !currentCustody) return refuse('MISSING_EXACT_PHYSICAL_COPY');
  if (originalItem.generation!=='equipment_2_0' || originalItem.sourceKind!=='dungeon_boss_terminal_victory') {
    return refuse('NEVER_ADMIT_LEGACY_OR_ALTERNATE_SOURCE');
  }
  if(originalItem.originalDungeonId!==proposedSource.source?.dungeonId ||
     originalItem.originalBossId!==proposedSource.source?.bossId ||
     originalItem.originalClaimReceiptId!==proposedSource.source?.entitlementId) {
    return refuse('SOURCE_ORIGIN_MISMATCH');
  }
  if (!validUuid(originalItem.instanceId) ||
      currentCustody.physicalInstanceId!==originalItem.instanceId ||
      currentCustody.currentOwnerId!==originalItem.currentOwnerId ||
      currentCustody.state!=='inventory' ||
      currentCustody.escrowed===true || currentCustody.equipped===true) {
    return refuse('STALE_OR_NONPHYSICAL_CUSTODY');
  }
  return refuse('REQUIRES_DATABASE_VERIFIED_POSITIVE_EQ2_MARKET_BRIDGE', {structurallyEligible:true});
}
