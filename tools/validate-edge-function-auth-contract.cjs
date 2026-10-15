const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

const root=resolve(__dirname,'..');
const read=relative=>readFileSync(resolve(root,relative),'utf8');
const required=(source,fragment,label)=>{
  if(!source.includes(fragment))throw new Error(`${label} is missing: ${fragment}`);
};

const gameplay=read('backend/supabase/functions/gameplay/index.ts');
required(gameplay,'if (!bearer) return json({ error: "auth_required" }, 401);','gameplay bearer guard');
required(gameplay,'const accountId = await services2.authenticate(bearer);','gameplay token verification');
required(gameplay,'if (!accountId) return json({ error: "invalid_session" }, 401);','gameplay invalid-session guard');
required(gameplay,'/auth/v1/user','gameplay Supabase user lookup');

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
