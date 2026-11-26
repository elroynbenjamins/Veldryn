const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

const root=resolve(__dirname,'..');
const read=relative=>readFileSync(resolve(root,relative),'utf8');
const required=(source,fragment,label)=>{
  if(!source.includes(fragment))throw new Error(`${label} is missing: ${fragment}`);
};

const gameplay=read('backend/supabase/functions/gameplay/index.ts');
required(gameplay,'if (!bearer) return json({ error: "auth_required" }, 401);','gameplay bearer guard');
required(gameplay,'const player = await authenticatePlayer2(bearer);','gameplay token verification');
required(gameplay,'if (!player) return json({ error: "invalid_session" }, 401);','gameplay invalid-session guard');
required(gameplay,'const { accountId, adminQa } = player;','gameplay verified identity and QA authority');
required(gameplay,'var gameplay = gameplayHandler(services, authenticatePlayer);','gameplay verified authenticator wiring');
required(gameplay,'async function authenticatePlayer(token) {','gameplay authenticator definition');
required(gameplay,'fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } })','gameplay Supabase bearer verification');
required(gameplay,'if (!response.ok) return null;','gameplay rejected authentication guard');
required(gameplay,'if (typeof user?.id !== "string" || !user.id) return null;','gameplay verified nonempty identity guard');
required(gameplay,'const meta = user.app_metadata;','gameplay trusted QA metadata source');
required(gameplay,'return { accountId: user.id, adminQa: meta?.admin_qa === true || Array.isArray(meta?.roles) && meta.roles.includes("admin_qa") };','gameplay QA derives from verified server metadata');
required(gameplay,'return accountId ? { accountId, adminQa: false } : null;','gameplay default authenticator denies QA authority');

const coop=read('backend/supabase/functions/coop/index.ts');
required(coop,'if (!token) return json({ error: "auth_required" }, 401);','co-op bearer guard');
required(coop,'const accountId = await services.authenticate(token);','co-op token verification');
required(coop,'if (!accountId) return json({ error: "invalid_session" }, 401);','co-op invalid-session guard');
required(coop,'/auth/v1/user','co-op Supabase user lookup');

const billing=read('backend/supabase/functions/play-billing/index.ts');
required(billing,'const {data,error}=await client.auth.getUser(jwt);','billing user lookup');
required(billing,'user.is_anonymous','billing anonymous-account guard');

const rtdn=read('backend/supabase/functions/play-billing-rtdn/index.ts');
required(rtdn,'await verifyGooglePubSubOidc(req);','RTDN Google OIDC verification');

console.log('PASS: Edge Function source retains its explicit authorization contract');
