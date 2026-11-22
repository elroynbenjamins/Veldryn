/**
 * Read-only parsers for the *actual staging* receipt column shapes.
 * Structurally valid receipt != authorized/completed profession action.
 *
 * These parsers intentionally DO NOT classify activity_id/recipe_id as a
 * skill, mint any XP, or authenticate ownership. The transaction adapter must
 * query the receipt from DB, enforce owner+account, and resolve canonical
 * server content and source completion rules before granting a career award.
 *
 * No Supabase connection or live game code imports this preview.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_:-]{1,160}$/;
/** Source completion time must originate from the database and include an offset. */
function completedAtFromSql(value:unknown):number{
  if(typeof value!=='string' ||
     !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value))
    throw Error('receipt_v2_invalid_completion_time');
  const epoch=Date.parse(value);
  if(!Number.isSafeInteger(epoch)||epoch<0)
    throw Error('receipt_v2_invalid_completion_time');
  return epoch;
}

function safeNonnegativeInteger(value:unknown):number|null{
  const n=typeof value==='string' && /^(0|[1-9]\d*)$/.test(value)
    ?Number(value):value;
  return typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null;
}

export interface StoredIdleClaimRowV1{
  readonly claim_id:unknown;
  readonly character_id:unknown;
  readonly activity_id:unknown;
  readonly elapsed_sec:unknown;
  readonly xp_amount:unknown;
  readonly created_at:unknown;
  readonly idempotency_key?:unknown;
}
export interface StoredCraftReceiptRowV1{
  readonly receipt_id:unknown;
  readonly character_id:unknown;
  readonly recipe_id:unknown;
  readonly quantity:unknown;
  readonly created_at:unknown;
  readonly idempotency_key?:unknown;
}
export interface ParsedIdleClaimReceiptV2{
  readonly canonicalReceiptId:string;
  readonly persistedCharacterId:string;
  readonly sourceCompletedAtMs:number;
  readonly activityId:string;
  readonly claimedElapsedSeconds:number;
  readonly recordedSourceXp:number;
  readonly actionClassification:'unclassified';
}
export interface ParsedCraftReceiptV2{
  readonly canonicalReceiptId:string;
  readonly persistedCharacterId:string;
  readonly sourceCompletedAtMs:number;
  readonly recipeId:string;
  readonly quantity:number;
  readonly actionClassification:'unclassified';
}

/**
 * Receipt identity MUST use immutable claim_id, not reusable client retry key.
 * xp_amount may arrive as PostgreSQL bigint text, but must be a safe integer.
 */
export function parseStagingIdleReceiptV2(row:StoredIdleClaimRowV1):ParsedIdleClaimReceiptV2{
  if(!row || typeof row.claim_id!=='string'||!UUID.test(row.claim_id)||
     typeof row.character_id!=='string'||!UUID.test(row.character_id)||
     typeof row.activity_id!=='string'||!TOKEN.test(row.activity_id))
    throw Error('receipt_v2_invalid_idle_identity');
  const elapsed=safeNonnegativeInteger(row.elapsed_sec);
  const completedAtMs=completedAtFromSql(row.created_at);
  const xp=safeNonnegativeInteger(row.xp_amount);
  if(elapsed===null||elapsed<1||elapsed>86400||xp===null)
    throw Error('receipt_v2_invalid_idle_values');
  return {
    canonicalReceiptId:row.claim_id.toLowerCase(),
    persistedCharacterId:row.character_id.toLowerCase(),
    sourceCompletedAtMs:completedAtMs,
    activityId:row.activity_id,
    claimedElapsedSeconds:elapsed,
    recordedSourceXp:xp,
    actionClassification:'unclassified',
  };
}
export function parseStagingCraftReceiptV2(row:StoredCraftReceiptRowV1):ParsedCraftReceiptV2{
  if(!row || typeof row.receipt_id!=='string'||!UUID.test(row.receipt_id)||
     typeof row.character_id!=='string'||!UUID.test(row.character_id)||
     typeof row.recipe_id!=='string'||!TOKEN.test(row.recipe_id))
    throw Error('receipt_v2_invalid_craft_identity');
  const completedAtMs=completedAtFromSql(row.created_at);
  const qty=safeNonnegativeInteger(row.quantity);
  if(qty===null||qty<1||qty>100000)
    throw Error('receipt_v2_invalid_craft_quantity');
  return {
    canonicalReceiptId:row.receipt_id.toLowerCase(),
    persistedCharacterId:row.character_id.toLowerCase(),
    sourceCompletedAtMs:completedAtMs,
    recipeId:row.recipe_id,
    quantity:qty,
    actionClassification:'unclassified',
  };
}
