const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/components/coop/CoopRunOverview.tsx');
const route=read('src/components/coop/DungeonRouteChoices.tsx');
const merchant=read('src/components/coop/DungeonMerchantPanel.tsx');
const banner=read('src/components/coop/DungeonRoomOutcomeBanner.tsx');
const screen=read('src/screens/CoopExpeditionScreen.tsx');
const client=read('src/online/coop-client.ts');
const mode=read('src/core/coop-qmode.ts');
const seasonal=read('src/core/coop-event-expeditions.ts');
const backendRoot=path.resolve(root,'../../backend');
const backend=p=>fs.readFileSync(path.join(backendRoot,p),'utf8');
const domain=backend('src/server/expeditions/node-resolution.ts');
const projection=backend('src/server/coop/qmode-public-projection.ts');
const runtime=backend('online/qmode-runtime.ts');
const handler=backend('online/coop.ts');
const sql=backend('supabase/migrations/20261104091107_online_qmode_merchant_purchase_v1.sql');
assert(!source.includes('<DungeonMerchantPanel')&&!source.includes('onPurchaseMerchant'),'The active dungeon run must not render or offer a Merchant purchase');
assert(source.includes("<DungeonRoomOutcomeBanner outcome={run.phase==='awaiting_choice'&&run.mode==='live'?run.lastRoomOutcome:undefined}/>"),'Solo opens its next room immediately while Live outcome feedback remains informational');
assert(merchant.includes('shop.resources>=offer.cost')&&merchant.includes('offer.purchased'),'Retired Merchant component remains safe for historic run snapshots');
assert(merchant.includes('onPurchase?.(offer.id)'),'Offer button transmits the server-defined offer id');
assert(client.includes('purchaseMerchant:(runId:string,body:CoopMerchantPurchaseBody)=>mutate'),'Merchant commands use existing durable retries');
assert(!screen.includes('acceptRun(await coopClient.purchaseMerchant('),'New dungeon screens do not expose legacy Merchant purchases');
assert(handler.includes("run?.[2]==='merchant'")&&handler.includes('runtime.purchaseMerchant('),'Server route validates and dispatches the merchant action');
assert(runtime.includes("const prior=await this.receipt(accountId,operation,runId,request.requestId,hash)"),'Idempotent receipts prevent double spending on retries');
assert(runtime.includes('loaded.privateState.pending')&&runtime.includes("stale_state"),'Pending nodes and old decisions reject merchant purchases');
assert(!projection.includes('merchantShop:'),'Modern dungeon projection does not publish Merchant offers');
assert(projection.includes("publicCoopRoomOutcome")&&!projection.includes('offerRoll:'),'Public outcomes do not expose private RNG details');
assert(domain.includes('resourcesDelta:state.resources-input.state.resources')&&domain.includes('healedHp,revivedCount'),'Noncombat outcomes are measured instead of invented');
assert(banner.includes('outcome.resourcesDelta')&&banner.includes('Restored {amount} HP'),'A compact result banner shows confirmed resource and HP changes');
assert(!banner.includes('setTimeout(')&&!banner.includes('onContinue')&&!banner.includes('<GameButton'),'Outcome banners cannot require a separate Continue tap');
assert(!source.includes('reviewingRoom')&&!source.includes('reviewedRoomNodeId')&&source.includes("run.phase==='awaiting_choice'&&run.options.length&&!enteringUtility")&&source.includes('if(needsBoon&&!selectedBoonId)return;'),'Solo next route is no longer blocked by acknowledgement, but still requires a selected boon');
assert(source.includes("needsBoon&&run.phase==='awaiting_choice'?<FantasyPanel")&&source.includes('onChoose?.(nodeId,needsBoon?selectedBoonId:undefined)'),'Players can choose an available boon immediately and submit it with their next room');
assert(route.includes("const title=room&&(")&&route.includes("st(room.name):seasonalDungeonRoomTitle(language,option.title)"),'Generic room names are translated while seasonal authored titles stay intact');
assert(mode.includes('lastRoomOutcome:projection.lastRoomOutcome')&&seasonal.includes('lastRoomOutcome:projection.lastRoomOutcome'),'Normal and seasonal projections carry room feedback');
assert(sql.includes('for update')&&sql.includes('idempotency_key_conflict')&&sql.includes('insufficient_run_resources'),'Purchase RPC serializes conflicting commands and checks resources');
assert(sql.includes('grant execute on function public.purchase_online_qmode_merchant_server_v1')&&sql.includes('to service_role'),'Purchase procedure remains server-only');
assert(route.includes("const roomMarks=option.kind==='battle'?3:option.kind==='elite'?5:0;")
 &&route.includes("const combatMarks=Math.min(roomMarks,Math.max(0,combatMarksRemaining));")
 &&route.includes("`+${combatMarks} ${st('Marks')}`")
 &&route.includes("st('Combat Marks capped')"),
 'Room choices preview the authoritative 3/5 Mark budget, truncate the final room award at the 25-Mark cap and show capped receipts');
console.log('PASS dungeon room outcomes: no new Merchant shop UI, historic receipt security retained');
