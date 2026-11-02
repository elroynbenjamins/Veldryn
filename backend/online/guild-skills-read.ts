// Authenticated Guild Skill Tree routes. The player's account ID is always taken
// from the verified bearer token, never from the request body. Both underlying
// RPCs (guild_skill_snapshot_server_v1, guild_skill_upgrade_server_v1) are
// service_role only and authoritative; this layer only authenticates, validates
// request shape, and maps known rejection codes to HTTP status.
export interface GuildSkillsServices {
 authenticate(token: string): Promise<string | null>;
 rpc<T>(name: string, args: Record<string, unknown>): Promise<T>;
}

const responseHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: responseHeaders });

interface SkillNode {
 id: string; name: string; branch: string; perTier: number;
 maxRank: number; rank: number; released: boolean;
 costs: Array<{ rank: number; resourceId: string; amount: number }>;
}
export interface GuildSkillsSnapshot {
 guildId: string; guildLevel: number; role: string; canUpgrade: boolean;
 totalSkillPoints: number; spentSkillPoints: number; skillPoints: number;
 nodes: SkillNode[]; bank: Array<{ resourceId: string; amount: number }>;
}

function validSnapshot(value: unknown): value is GuildSkillsSnapshot {
 if (!value || typeof value !== "object") return false;
 const s = value as Record<string, unknown>;
 return typeof s.guildLevel === "number"
  && Number.isSafeInteger(s.totalSkillPoints) && Number.isSafeInteger(s.spentSkillPoints)
  && Number.isSafeInteger(s.skillPoints) && Array.isArray(s.nodes) && Array.isArray(s.bank);
}

/** GET /functions/v1/gameplay?view=guild-skills — read the authoritative snapshot. */
export function guildSkillsReadHandler(services: GuildSkillsServices) {
 return async (request: Request): Promise<Response> => {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "auth_required" }, 401);
  const accountId = await services.authenticate(token);
  if (!accountId) return json({ error: "invalid_session" }, 401);
  try {
   const snapshot = await services.rpc<GuildSkillsSnapshot>("guild_skill_snapshot_server_v1", { p_account_id: accountId });
   if (!validSnapshot(snapshot)) return json({ error: "invalid_guild_skill_snapshot" }, 503);
   return json(snapshot);
  } catch (reason) {
   const code = reason instanceof Error ? reason.message : "";
   if (code === "guild_membership_required") return json({ error: code }, 403);
   return json({ error: "guild_skill_snapshot_unavailable" }, 503);
  }
 };
}

/** POST /functions/v1/gameplay?view=guild-skills&action=upgrade — authoritative rank purchase. */
export function guildSkillsUpgradeHandler(services: GuildSkillsServices) {
 return async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "auth_required" }, 401);
  const accountId = await services.authenticate(token);
  if (!accountId) return json({ error: "invalid_session" }, 401);
  const raw = await request.text();
  if (raw.length > 1024) return json({ error: "request_too_large" }, 413);
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "invalid_request" }, 400);
  const body = input as Record<string, unknown>;
  // Only {skillId,requestKey} is accepted; the account ID is never read from the body.
  if (Object.keys(body).length !== 2
   || typeof body.skillId !== "string" || !/^[a-z][a-z0-9_]{1,63}$/.test(body.skillId)
   || typeof body.requestKey !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(body.requestKey))
   return json({ error: "invalid_guild_skill_upgrade" }, 400);
  try {
   const result = await services.rpc<{ alreadyProcessed: boolean; skillId: string; rank: number; costs: Array<{ resourceId: string; amount: number }> }>(
    "guild_skill_upgrade_server_v1",
    { p_account_id: accountId, p_skill_id: body.skillId, p_request_key: body.requestKey },
   );
   if (!result || typeof result.alreadyProcessed !== "boolean" || result.skillId !== body.skillId
    || !Number.isSafeInteger(result.rank) || !Array.isArray(result.costs))
    return json({ error: "invalid_guild_skill_receipt" }, 503);
   return json(result);
  } catch (reason) {
   const code = reason instanceof Error ? reason.message : "";
   if (code === "guild_skill_not_released") return json({ error: code }, 409);
   if (["guild_membership_required", "guild_skill_not_leader", "guild_skill_max_rank",
     "guild_skill_request_conflict", "character_required"].includes(code)) return json({ error: code }, 409);
   if (["insufficient_skill_points", "insufficient_guild_bank_materials"].includes(code)) return json({ error: code }, 422);
   if (code === "unknown_guild_skill") return json({ error: code }, 404);
   return json({ error: "guild_skill_upgrade_unavailable" }, 503);
  }
 };
}
