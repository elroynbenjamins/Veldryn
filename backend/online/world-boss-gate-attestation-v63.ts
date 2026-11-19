/**
 * V63 HIDDEN private DB attestation of first-live World Boss incident controls.
 * No HTTP route or player-visible state. The V61 receipt triggers remain the
 * final transactional authority, even if this read-only preflight passed.
 */
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V63_GATE_ATTESTATION_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface WorldBossGateAttestationV63 {
 assertGates(eventId:string):Promise<void>;
}

/** Must be a server-only private SQL client, never a Supabase mobile RPC. */
export function createWorldBossGateAttestationPgV63(
 pg:WorldBossPgExecutorV19,
):WorldBossGateAttestationV63{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v63_private_pg_required');
 return {
  async assertGates(eventId){
   if(typeof eventId!=='string'||!UUID.test(eventId))
    throw Error('world_boss_v63_invalid_event');
   const r=await pg.query<{ok:boolean}>(
    'SELECT private.world_boss_v63_assert_gates($1::uuid) AS ok',[eventId]);
   if(!r||!Array.isArray(r.rows)||r.rows.length!==1||
    r.rows[0]?.ok!==true)
    throw Error('world_boss_v63_controls_unavailable');
  },
 };
}
