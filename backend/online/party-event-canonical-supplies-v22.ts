/**
 * Hidden Party Events v22: release-safe starter supply catalogue.
 *
 * This adapter executes in the trusted ONLINE server, where the real game
 * gathering and inventory content are available. Do not duplicate source
 * rates in SQL, solicit tiers/rates from a mobile client, or allow crafted
 * reagents to masquerade as ordinary gatherable resources.
 *
 * Initial v22 policy deliberately uses three Level 1 Greenfields sources,
 * available to EVERY member. Later tier expansion must audit skill levels,
 * source zones, and duration at the member/week boundary first.
 */
import {GATHERING,type GatherDef} from '../../apps/mobile/src/content/skills';
import {HERB_NODES} from '../../apps/mobile/src/content/herbalism';
import {itemDef} from '../../apps/mobile/src/content/items';
import {
  buildWeeklyPartySupplyOrders,weeklyPartyBudget,
  type VerifiedSupplyItem,type PartySupplyOrder,
  type WeeklyPartyDifficulty,type WeeklyPartyFamily,
} from '../src/server/party/weekly-party-events-v2';

export const PARTY_EVENT_CANONICAL_SUPPLY_V22_RELEASED=false;
export const PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22='greenfields-verified-gathering-v22' as const;

/** Named source identity, not merely a material ID from an inventory stack. */
const SOURCES=Object.freeze([
  {nodeId:'GREENWOOD_TREE',itemId:'GREENWOOD_LOG',skillId:'woodcutting',category:'wood'},
  {nodeId:'GREENFIELDS_COPPER_OUTCROP',itemId:'COPPER_ORE',skillId:'mining',category:'ore'},
  {nodeId:'DEWLEAF_PATCH',itemId:'DEWLEAF',skillId:'herbalism',category:'herb'},
] as const);

/** Do not change SQL allowlist without updating this invariant/test. */
export const PARTY_EVENT_V22_APPROVED_ITEM_IDS=Object.freeze(
  SOURCES.map(x=>x.itemId).sort()
);

function assert(value:unknown,reason:string):asserts value {
  if(!value)throw new Error('party_event_v22_'+reason);
}
/**
 * Exact source lookup against current gameplay content. A source rename,
 * unavailable herb, zone move, gather time corruption or nonmaterial type
 * fails CLOSED rather than introducing an unobtainable 7-day resource sink.
 */
export function auditedGreenfieldsPartySuppliesV22():readonly VerifiedSupplyItem[] {
  const nodeList:readonly GatherDef[]=[...GATHERING,...HERB_NODES];
  const result:VerifiedSupplyItem[]=SOURCES.map(source=>{
    const matching=nodeList.filter(node=>node.id===source.nodeId);
    assert(matching.length===1,'missing_or_duplicate_gather_source:'+source.nodeId);
    const node=matching[0]!;
    assert(node.itemId===source.itemId&&node.skillId===source.skillId
      &&node.zoneId==='GREENFIELDS'
      &&node.unlockLevel===1
      &&Number.isFinite(node.seconds)&&node.seconds>=1
      &&Number.isSafeInteger(node.min)&&node.min>=1
      &&Number.isSafeInteger(node.max)&&node.max>=node.min,
      'invalid_gather_source:'+source.nodeId);
    const item=itemDef(source.itemId);
    assert(item?.type==='material'
      &&(item.rarity===undefined||item.rarity==='common'),
      'invalid_canonical_material:'+source.itemId);
    // Use minimum guaranteed yield, not optimistic average or fast-mode
    // bonuses. Gathering multipliers may lengthen a particular user's
    // activity but must never overpromise gatherable supply quantities.
    const secondsPerUnit=Math.ceil(node.seconds/node.min);
    assert(secondsPerUnit>=1&&secondsPerUnit<=3600,
      'invalid_gather_seconds:'+source.nodeId);
    return {
      itemId:source.itemId,category:source.category,tier:'common' as const,
      secondsPerUnit,unlocked:true,
    };
  });
  assert(result.length===3&&new Set(result.map(x=>x.itemId)).size===3,
    'starter_supply_catalogue_corrupt');
  return Object.freeze(result.map(x=>Object.freeze(x)));
}

/**
 * Complete 3-stage weekly order plan. Each of the three required categories
 * and three optional improvements is backed by an actual Level 1 source.
 */
export function canonicalPartyEventOrdersV22(input:{
  family:WeeklyPartyFamily;difficulty:WeeklyPartyDifficulty;
  memberCount:number;seed:number;
}):{
  auditVersion:typeof PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22;
  catalog:readonly VerifiedSupplyItem[];
  orders:readonly PartySupplyOrder[];
} {
  const catalog=auditedGreenfieldsPartySuppliesV22();
  const orders=buildWeeklyPartySupplyOrders(
    input.family,weeklyPartyBudget(input.memberCount,input.difficulty),
    catalog,input.seed);
  assert(orders.length===12,'unexpected_plan_order_count');
  assert(orders.filter(x=>x.kind==='required').length===9
    &&orders.filter(x=>x.kind==='optional').length===3,
    'missing_required_or_optional_orders');
  const allowlist=new Set<string>(PARTY_EVENT_V22_APPROVED_ITEM_IDS);
  assert(orders.every(x=>x.quantity>0&&x.estimatedGatherSeconds>0
    &&allowlist.has(x.itemId)),
    'unapproved_order_material');
  return {
    auditVersion:PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22,
    catalog,orders:Object.freeze(orders.map(x=>Object.freeze(x))),
  };
}
