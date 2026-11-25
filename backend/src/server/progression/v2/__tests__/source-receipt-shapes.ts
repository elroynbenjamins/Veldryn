import {parseStagingIdleReceiptV2,parseStagingCraftReceiptV2} from '../source-receipt-shapes';
const c1='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const idle={claim_id:id,character_id:c1,activity_id:'GREENFIELDS_COPPER_OUTCROP',
  elapsed_sec:3600,xp_amount:'1080',created_at:'2026-11-22T13:45:00.123Z',idempotency_key:'user_sends_this'};
const craft={receipt_id:id,character_id:c1,recipe_id:'SMELT_COPPER_INGOT',
  quantity:3,created_at:'2026-11-22T13:45:00.123Z',idempotency_key:'user_sends_this'};
function equal(a:unknown,b:unknown,label:string){if(a!==b)throw Error(label+' expected '+String(b)+' got '+String(a));}
function throws(fn:()=>unknown,pattern:RegExp,label:string){
  try{fn()}catch(e){if(pattern.test(String(e)))return;throw Error(label+': unexpected '+String(e))}
  throw Error(label+': expected failure');
}
const parsedIdle=parseStagingIdleReceiptV2(idle);
equal(parsedIdle.canonicalReceiptId,id,'claim_id is canonical, not client retry key');
equal(parsedIdle.persistedCharacterId,c1,'source-bound character');
equal(parsedIdle.recordedSourceXp,1080,'SQL bigint text parsed to safe integer');
equal(parsedIdle.actionClassification,'unclassified','must not assume any activity yields profession XP');
equal(parsedIdle.claimedElapsedSeconds,3600,'source elapsed');
equal(parsedIdle.sourceCompletedAtMs,Date.parse('2026-11-22T13:45:00.123Z'),'source time comes only from persisted DB field');
const parsedCraft=parseStagingCraftReceiptV2(craft);
equal(parsedCraft.canonicalReceiptId,id,'receipt_id is canonical');
equal(parsedCraft.recipeId,'SMELT_COPPER_INGOT','canonical recipe ID retained');
equal(parsedCraft.actionClassification,'unclassified','must resolve server recipe catalogue before award');
equal(parsedCraft.quantity,3,'quantity is trusted only structurally');
equal(parsedCraft.sourceCompletedAtMs,Date.parse('2026-11-22T13:45:00.123Z'),'craft source completion UTC timestamp');

throws(()=>parseStagingIdleReceiptV2({...idle,claim_id:idle.idempotency_key}),/invalid_idle_identity/,'reject retry key as receipt');
throws(()=>parseStagingIdleReceiptV2({...idle,created_at:'2026-11-22T13:45:00'}),/invalid_completion_time/,'reject missing timezone');
throws(()=>parseStagingCraftReceiptV2({...craft,created_at:undefined}),/invalid_completion_time/,'reject missing craft completion time');
throws(()=>parseStagingIdleReceiptV2({...idle,elapsed_sec:108000}),/invalid_idle_values/,'staging 24h cap');
throws(()=>parseStagingIdleReceiptV2({...idle,xp_amount:'9007199254740993'}),/invalid_idle_values/,'no bigint overflow');
throws(()=>parseStagingIdleReceiptV2({...idle,character_id:'evil'}),/invalid_idle_identity/,'no fake owner');
throws(()=>parseStagingIdleReceiptV2({...idle,activity_id:'<script>'}),/invalid_idle_identity/,'reject invalid source token');
throws(()=>parseStagingCraftReceiptV2({...craft,receipt_id:craft.idempotency_key}),/invalid_craft_identity/,'use UUID not retry key');
throws(()=>parseStagingCraftReceiptV2({...craft,quantity:0}),/invalid_craft_quantity/,'no zero-item craft receipt');
throws(()=>parseStagingCraftReceiptV2({...craft,quantity:100001}),/invalid_craft_quantity/,'no unbounded quantity');
console.log('PASS: canonical staging receipt shape parser never grants XP or trusts idempotency aliases');
