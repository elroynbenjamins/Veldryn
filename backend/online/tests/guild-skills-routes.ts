import { guildSkillsReadHandler, guildSkillsUpgradeHandler, type GuildSkillsServices } from "../guild-skills-read";

function assert(value: unknown, message: string): asserts value {
 if (!value) throw new Error(message);
}

const VERIFIED = "11111111-1111-4111-8111-111111111111";
const ATTACKER = "99999999-9999-4999-8999-999999999999";

function baseServices(overrides: Partial<GuildSkillsServices> = {}): { services: GuildSkillsServices; calls: Array<{ name: string; args: Record<string, unknown> }> } {
 const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
 const services: GuildSkillsServices = {
  authenticate: async token => token === "valid" ? VERIFIED : null,
  rpc: async <T>(name: string, args: Record<string, unknown>) => {
   calls.push({ name, args });
   if (name === "guild_skill_snapshot_server_v1")
    return { guildId: "g", guildLevel: 5, role: "leader", canUpgrade: true, totalSkillPoints: 4, spentSkillPoints: 0, skillPoints: 4, nodes: [], bank: [] } as unknown as T;
   return { alreadyProcessed: false, skillId: "fellowship_membership", rank: 1, costs: [] } as unknown as T;
  },
  ...overrides,
 };
 return { services, calls };
}

async function run() {
 // ---- read route ----
 {
  const { services, calls } = baseServices();
  const read = guildSkillsReadHandler(services);
  assert((await read(new Request("https://x.test/g"))).status === 401, "read: missing token -> 401");
  assert((await read(new Request("https://x.test/g", { headers: { authorization: "Bearer wrong" } }))).status === 401, "read: bad token -> 401");
  assert((await read(new Request("https://x.test/g", { method: "POST", headers: { authorization: "Bearer valid" } }))).status === 405, "read: POST -> 405");
  const ok = await read(new Request("https://x.test/g", { headers: { authorization: "Bearer valid" } }));
  assert(ok.status === 200, "read: valid -> 200");
  const body = await ok.json() as { guildLevel: number; skillPoints: number };
  assert(body.guildLevel === 5 && body.skillPoints === 4, "read: snapshot forwarded");
  assert(calls[0].name === "guild_skill_snapshot_server_v1" && calls[0].args.p_account_id === VERIFIED, "read: verified identity forwarded, not from the request");
 }

 // ---- upgrade route: auth + shape ----
 {
  const { services } = baseServices();
  const upgrade = guildSkillsUpgradeHandler(services);
  assert((await upgrade(new Request("https://x.test/g", { method: "GET", headers: { authorization: "Bearer valid" } }))).status === 405, "upgrade: GET -> 405");
  assert((await upgrade(new Request("https://x.test/g", { method: "POST" }))).status === 401, "upgrade: no token -> 401");
  const badJson = await upgrade(new Request("https://x.test/g", { method: "POST", headers: { authorization: "Bearer valid" }, body: "{" }));
  assert(badJson.status === 400, "upgrade: bad json -> 400");
  const missing = await upgrade(new Request("https://x.test/g", { method: "POST", headers: { authorization: "Bearer valid" }, body: JSON.stringify({ skillId: "fellowship_membership" }) }));
  assert(missing.status === 400, "upgrade: missing requestKey -> 400");
 }

 // ---- CRITICAL: a client-supplied account ID is never trusted ----
 {
  const { services, calls } = baseServices();
  const upgrade = guildSkillsUpgradeHandler(services);
  // Extra keys (including an attacker account id) must be rejected outright.
  const spoof = await upgrade(new Request("https://x.test/g", {
   method: "POST", headers: { authorization: "Bearer valid" },
   body: JSON.stringify({ skillId: "fellowship_membership", requestKey: "req-aaaaaaaa", accountId: ATTACKER }),
  }));
  assert(spoof.status === 400, "upgrade: extra body keys (account spoof) rejected");
  assert(calls.length === 0, "upgrade: spoof attempt never reaches the RPC");

  // A well-formed request still debits only the token's account.
  const ok = await upgrade(new Request("https://x.test/g", {
   method: "POST", headers: { authorization: "Bearer valid" },
   body: JSON.stringify({ skillId: "fellowship_membership", requestKey: "req-bbbbbbbb" }),
  }));
  assert(ok.status === 200, "upgrade: valid -> 200");
  assert(calls[0].args.p_account_id === VERIFIED, "upgrade: account comes from the verified token, never the body");
  assert(calls[0].args.p_skill_id === "fellowship_membership" && calls[0].args.p_request_key === "req-bbbbbbbb", "upgrade: skillId and requestKey forwarded");
 }

 // ---- released gating: an OFF skill cannot charge ----
 {
  const { services } = baseServices({
   rpc: async <T>(name: string) => {
    if (name === "guild_skill_upgrade_server_v1") throw new Error("guild_skill_not_released");
    return {} as T;
   },
  });
  const upgrade = guildSkillsUpgradeHandler(services);
  const gated = await upgrade(new Request("https://x.test/g", {
   method: "POST", headers: { authorization: "Bearer valid" },
   body: JSON.stringify({ skillId: "professions_gathering", requestKey: "req-cccccccc" }),
  }));
  assert(gated.status === 409, "upgrade: unreleased skill -> 409");
  assert((await gated.json() as { error: string }).error === "guild_skill_not_released", "upgrade: not-released code surfaced");
 }

 // ---- idempotent retry passthrough ----
 {
  const { services } = baseServices({
   rpc: async <T>() => ({ alreadyProcessed: true, skillId: "fellowship_membership", rank: 1, costs: [] } as unknown as T),
  });
  const upgrade = guildSkillsUpgradeHandler(services);
  const retry = await upgrade(new Request("https://x.test/g", {
   method: "POST", headers: { authorization: "Bearer valid" },
   body: JSON.stringify({ skillId: "fellowship_membership", requestKey: "req-dddddddd" }),
  }));
  assert(retry.status === 200 && (await retry.json() as { alreadyProcessed: boolean }).alreadyProcessed === true, "upgrade: repeated request key returns alreadyProcessed");
 }

 console.log("PASS: Guild Skills routes authenticate, never trust a client account id, gate unreleased skills and dedupe retries");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
