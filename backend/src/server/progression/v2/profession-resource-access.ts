/**
 * Isolated Veldryn 2.0 non-combat resource-route *eligibility* contract.
 *
 * This does not change travel, unlock any actual world zone or create an
 * accessible in-game route. Content must explicitly author a SAFE profession
 * access route before a node may be used independently from combat.
 *
 * Character XP and Combat Level never unlock a profession resource.
 * Only the skill trained for that exact node does.
 */
import {
  type TrustedCharacterProgressionV2, type ProfessionIdV2,
  projectCharacterProgressionV2,
} from './character-progression';

const GATHERING:ReadonlySet<string>=new Set(['mining','woodcutting','fishing','herbalism']);
const SAFE_CODE=/^[A-Za-z0-9_:-]{3,100}$/;
export interface ProfessionResourceRouteV2{
  readonly nodeId:string;
  readonly professionId:ProfessionIdV2;
  readonly requiredProfessionLevel:number;
  readonly regionId:string;
  /** Absent means an independent noncombat route has NOT been authored. */
  readonly safeAccessRouteId:string|null;
  readonly available:boolean;
}
export interface ProfessionResourceEligibilityV2{
  readonly canGather:boolean;
  readonly reason:'available'|'skill_required'|'route_unavailable';
  readonly combatLevelUsed:false;
  readonly grantsWorldOrCombatAccess:false;
}
export function professionResourceEligibilityV2(
  owner:TrustedCharacterProgressionV2,resource:ProfessionResourceRouteV2,
):ProfessionResourceEligibilityV2{
  const projection=projectCharacterProgressionV2(owner);
  if(!resource||typeof resource.nodeId!=='string'||!SAFE_CODE.test(resource.nodeId)||
     !GATHERING.has(resource.professionId) ||
     typeof resource.regionId!=='string'||!SAFE_CODE.test(resource.regionId)||
     !Number.isSafeInteger(resource.requiredProfessionLevel) ||
     resource.requiredProfessionLevel<1||resource.requiredProfessionLevel>100 ||
     typeof resource.available!=='boolean' ||
     (resource.safeAccessRouteId!==null &&
       (typeof resource.safeAccessRouteId!=='string'||!SAFE_CODE.test(resource.safeAccessRouteId))))
    throw new Error('profession_route_v2_invalid_catalogue');
  const level=projection.professionLevels[resource.professionId]??1;
  const allowed=level>=resource.requiredProfessionLevel;
  const route=resource.available&&resource.safeAccessRouteId!==null;
  return {
    canGather:allowed&&route,
    reason:!allowed?'skill_required':!route?'route_unavailable':'available',
    combatLevelUsed:false,
    grantsWorldOrCombatAccess:false,
  };
}
