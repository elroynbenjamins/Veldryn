import {
  previewProfessionCraftMaterialCustodyV2,
  type TrustedCraftReviewStateV2,
  type TrustedProfessionCraftRecipeV2,
  type CraftReviewRequestV2,
  CRAFT_CUSTODY_HANDOFF_ENABLED_V2,
} from '../crafting-material-custody-handoff-review';
import {professionTotalXpForLevelV2} from '../character-progression';

const account='11111111-1111-4111-8111-111111111111';
const smith='22222222-2222-4222-8222-222222222222';
const seller='33333333-3333-4333-8333-333333333333';
const sellerAccount='44444444-4444-4444-8444-444444444444';
const other='55555555-5555-4555-8555-555555555555';
const hash='a'.repeat(64);
const request:CraftReviewRequestV2={
 accountId:account,characterId:smith,expectedRevision:25,requestId:'CRAFT_REQUEST_001',
 requestHash:hash,recipeId:'SMITH_TOOL_T2',quantity:2,
};
const recipe:TrustedProfessionCraftRecipeV2={
 recipeId:request.recipeId,itemId:'TRAVEL_TOOL_T2',tier:2,profession:'smithing',
 requiredProfessionLevel:12,goldCost:700,combatWearLevel:48,
 inputs:[
  {itemId:'COPPER_ORE',units:4,requiredOriginalOrigin:'any'},
  {itemId:'IRONWOOD_FANG',units:2,requiredOriginalOrigin:'combat'},
  {itemId:'IRONWOOD_BINDING_RESIN',units:1,requiredOriginalOrigin:'any'},
 ],
 authoredAndReviewed:true,
};
const stock=[
 {lotId:'LOT_COPPER_INV',itemId:'COPPER_ORE',custody:'inventory' as const,
  accountId:account,characterId:smith,availableQuantity:3,provenanceId:'PROOF_COPPER_INV'},
 {lotId:'LOT_COPPER_BANK',itemId:'COPPER_ORE',custody:'bank' as const,
  accountId:account,characterId:null,availableQuantity:7,provenanceId:'PROOF_COPPER_BANK'},
 {lotId:'LOT_COPPER_ESCROW',itemId:'COPPER_ORE',custody:'market_escrow' as const,
  accountId:account,characterId:smith,availableQuantity:100,provenanceId:'PROOF_COPPER_ESCROW'},
 {lotId:'LOT_FANG_MARKET',itemId:'IRONWOOD_FANG',custody:'inventory' as const,
  accountId:account,characterId:smith,availableQuantity:2,provenanceId:'PROOF_FANG_MARKET'},
 {lotId:'LOT_FANG_BANK',itemId:'IRONWOOD_FANG',custody:'bank' as const,
  accountId:account,characterId:null,availableQuantity:2,provenanceId:'PROOF_FANG_BANK'},
 {lotId:'LOT_RESIN_INV',itemId:'IRONWOOD_BINDING_RESIN',custody:'inventory' as const,
  accountId:account,characterId:smith,availableQuantity:2,provenanceId:'PROOF_RESIN_INV'},
 ];
const proofs=stock.map(lot=>({
 provenanceId:lot.provenanceId,
 sourceReceiptId:'SOURCE_'+lot.lotId,
 sourceAccountId:lot.lotId==='LOT_FANG_MARKET'?sellerAccount:account,
 sourceCharacterId:lot.lotId==='LOT_FANG_MARKET'?seller:smith,
 originalOrigin:(lot.itemId==='IRONWOOD_FANG'?'combat':
   lot.itemId==='IRONWOOD_BINDING_RESIN'?'processing':'gathering') as
   'combat'|'processing'|'gathering',
 itemId:lot.itemId,originalLotId:lot.lotId,
 originalGrantedQuantity:lot.availableQuantity,completed:true as const,
 ...(lot.custody==='bank'?{bankDeposit:{
  receiptId:'DEPOSIT_'+lot.lotId,
  accountId:account,depositedByCharacterId:smith,lotId:lot.lotId,
  committed:true as const,
 }}:{}),
 ...(lot.lotId==='LOT_FANG_MARKET'?{settledTransfer:{
  transferReceiptId:'TRANSFER_MARKET_FANG_001',kind:'market' as const,
  originalSourceReceiptId:'SOURCE_LOT_FANG_MARKET',
  fromAccountId:sellerAccount,toAccountId:account,
  recipientCharacterId:smith,settled:true as const,
 }}:{}),
}));
const state:TrustedCraftReviewStateV2={
 accountId:account,characterId:smith,ownedCharacterIds:[smith,other],
 revision:25,availableGold:2000,
 progression:{combatLevel:1,overallCharacterXp:0,professionXp:{
  smithing:professionTotalXpForLevelV2(12),
 }},
 ownedLots:stock,originalSourceProofs:proofs,
 registrations:['COPPER_ORE','IRONWOOD_FANG','IRONWOOD_BINDING_RESIN'].map(itemId=>({
  itemId,kind:'stackable_material' as const,registered:true,
  originalSourceRegistered:true,
 })),
 priorRequests:[],
};
const eq=(a:unknown,b:unknown,label:string)=>{
 if(a!==b)throw Error(label+': expected '+String(b)+' got '+String(a));
};
const rejection=(fn:()=>unknown,rx:RegExp,label:string)=>{
 try{fn();}catch(e){if(rx.test(String(e)))return;throw Error(label+': '+String(e));}
 throw Error(label+': unexpectedly allowed');
};
function test(){
 eq(CRAFT_CUSTODY_HANDOFF_ENABLED_V2,false,'never enables payments');
 const base=previewProfessionCraftMaterialCustodyV2(request,state,recipe);
 eq(base.reviewable,true,'pure preview may calculate');
 eq(base.canCommit,false,'cannot actually reserve');
 eq(base.canGrantItemsOrXp,false,'cannot award XP or items');
 eq(base.releaseEnabled,false,'cannot ship');
 eq(base.mayMoveMarketEscrow,false,'cannot move escrow');
 eq(base.combatLevelUsedForCraft,false,'combat Lv1 smith can craft when profession qualifies');
 eq(base.goldDebit,1400,'two crafts require 1400 gold');
 eq(base.debits.length,5,'inventory first then Bank per required material');
 eq(base.debits.filter(d=>d.itemId==='COPPER_ORE').map(x=>x.quantity).join(','),
    '3,5','copper debited from owned character then account Bank');
 eq(base.debits.filter(d=>d.itemId==='IRONWOOD_FANG').map(x=>x.quantity).join(','),
    '2,2','traded combat-origin Fangs retain original provenance');
 eq(base.debits.find(d=>d.lotId==='LOT_FANG_MARKET')?.transferReceiptId,
    'TRANSFER_MARKET_FANG_001','market proof traced to finalized trade');
 eq(base.debits.some(d=>!['inventory','bank'].includes(d.custody)),false,
    'listed material cannot be used while held in escrow');
 eq(base.debits.every(d=>d.quantity>0),true,'no zero debits');
 const pooledBank=previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
   p.provenanceId==='PROOF_COPPER_BANK'?{
    ...p,sourceCharacterId:other,
    bankDeposit:{...p.bankDeposit!,depositedByCharacterId:other},
   }:p),
 },recipe);
 eq(pooledBank.goldDebit,1400,'same-account alt can deposit resources for peaceful Smith');
 eq(pooledBank.debits.some(d=>d.lotId==='LOT_COPPER_BANK'),true,
   'alt source is usable only through account Bank deposit receipt');
 eq(JSON.stringify(previewProfessionCraftMaterialCustodyV2(request,state,recipe)),
    JSON.stringify(base),'deterministic review projection');
 const replay=previewProfessionCraftMaterialCustodyV2(request,{...state,priorRequests:[{
  requestId:request.requestId,requestHash:hash,accountId:account,
  characterId:smith,recipeId:recipe.recipeId,quantity:2,settledRevision:25,
 }]},recipe);
 eq(replay.replayReadbackRequired,true,'completed request must re-read stored result');
 eq(replay.goldDebit,0,'replayed request cannot debit twice');
 eq(replay.debits.length,0,'replayed materials cannot debit twice');
 rejection(()=>previewProfessionCraftMaterialCustodyV2({...request,quantity:1},{
   ...state,priorRequests:[{
    requestId:request.requestId,requestHash:hash,accountId:account,
    characterId:smith,recipeId:recipe.recipeId,quantity:2,settledRevision:25,
   }],
 },recipe),/request_collision/,'same request cannot change quantity');
 rejection(()=>previewProfessionCraftMaterialCustodyV2({...request,expectedRevision:24},
   state,recipe),/stale_revision/,'stale state cannot reserve');
 rejection(()=>previewProfessionCraftMaterialCustodyV2({...request,characterId:other},
   state,recipe),/invalid_identity_or_snapshot/,'cross-character spoof');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
   ...state,progression:{...state.progression,professionXp:{
    smithing:professionTotalXpForLevelV2(11),
   }},
 },recipe),/profession_locked/,'Smithing 11 cannot make draft T2 level 12');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,state,{
   ...recipe,requiredProfessionLevel:10,
 }),/unreconciled_profession_tier/,'old tier 10 cannot silently bypass newer tier 12');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,state,{
   ...recipe,profession:'tailoring',
 }),/profession_locked/,'Smithing alone cannot satisfy Tailoring');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,state,{
   ...recipe,inputs:recipe.inputs.map(i=>({...i,requiredOriginalOrigin:'any'})),
 }),/missing_combat_source_requirement/,'finished gear must require combat-origin input');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,state,{
   ...recipe,inputs:recipe.inputs.map(i=>({...i,
     ...(i.itemId==='IRONWOOD_FANG'?{itemId:'EQ2_TROLL_SINEW'}:{})})),
 }),/material_source_unregistered/,'unregistered EQ2 source cannot enter recipe debit');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
   ...state,registrations:[...state.registrations,{
     itemId:'EQ2_TROLL_SINEW',kind:'stackable_material',registered:true,
     originalSourceRegistered:true,
   }],
 },{...recipe,inputs:recipe.inputs.map(i=>
  i.itemId==='IRONWOOD_FANG'?{...i,itemId:'EQ2_TROLL_SINEW'}:i)}),
 /eq2_source_registration_pending/,'claimed EQ2 registration cannot bypass global release gate');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,registrations:state.registrations.map(r=>
   r.itemId==='IRONWOOD_FANG'?{...r,kind:'equipment_copy' as const}:r),
 },recipe),/material_source_unregistered/,'gear copy cannot be spoofed as fungible stack');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:[...proofs,{
   ...proofs[0],provenanceId:'PROOF_UNUSED_EQ2',sourceReceiptId:'SOURCE_UNUSED_EQ2',
   originalLotId:'LOT_UNUSED_EQ2',itemId:'EQ2_FAKE_RESOURCE',
  }],
 },recipe),/invalid_source_material_identity/,
 'unrelated forged EQ2 source row cannot hide outside selected recipe');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
    lot.lotId==='LOT_COPPER_ESCROW'?{...lot,itemId:'EQ2_FAKE_RESOURCE'}:lot),
 },recipe),/invalid_owned_material_identity/,
 'forged EQ2 escrow lot is rejected even when selected recipe never consumes it');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,registrations:[...state.registrations,{
   itemId:'UNISSUED_GEAR_COPY',kind:'equipment_copy',registered:true,
   originalSourceRegistered:true,
  }],
  originalSourceProofs:[...proofs,{
   ...proofs[0],provenanceId:'PROOF_FAKE_EQUIP',sourceReceiptId:'SOURCE_FAKE_EQUIP',
   originalLotId:'LOT_FAKE_EQUIP',itemId:'UNISSUED_GEAR_COPY',
  }],
 },recipe),/invalid_source_material_identity/,
 'registered gear copy is never allowed as a spare stackable material source');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
   lot.lotId==='LOT_COPPER_BANK'?{...lot,availableQuantity:3}:lot),
 },recipe),/insufficient_verified_materials/,'no overspending scarce source-backed lots');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
   lot.lotId==='LOT_COPPER_INV'?{...lot,availableQuantity:10}:lot),
 },recipe),/missing_or_mismatched_source_receipt/,'lot quantity cannot exceed source grant');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:[...stock,stock[0]],
 },recipe),/invalid_or_duplicate_lot/,'same physical source-lot twice');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:[...stock,{
   ...stock[0],lotId:'LOT_COPPER_DUPLICATE',availableQuantity:2,
  }],
 },recipe),/missing_or_mismatched_source_receipt/,'one source receipt cannot sponsor a second spendable lot');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
   lot.lotId==='LOT_COPPER_INV'?{...lot,provenanceId:'PROOF_COPPER_BANK'}:lot),
 },recipe),/missing_or_mismatched_source_receipt/,'cannot move Bank receipt to unrelated inventory lot');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:[...proofs,proofs[0]],
 },recipe),/invalid_source_provenance/,'duplicate immutable proof ID');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
    p.provenanceId==='PROOF_FANG_MARKET'?{
      ...p,settledTransfer:undefined,
    }:p),
 },recipe),/missing_or_mismatched_source_receipt/,'seller source alone cannot put material in buyer inventory');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
    p.provenanceId==='PROOF_FANG_MARKET'?{
      ...p,settledTransfer:{...p.settledTransfer!,settled:false as true},
    }:p),
 },recipe),/invalid_market_transfer_provenance/,'pending transfer cannot become material');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
    p.provenanceId==='PROOF_FANG_MARKET'?{
      ...p,settledTransfer:{...p.settledTransfer!,recipientCharacterId:other},
    }:p),
 },recipe),/missing_or_mismatched_source_receipt/,'alt recipient cannot spend traded rare input');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
    p.provenanceId==='PROOF_FANG_MARKET'?{
      ...p,settledTransfer:{...p.settledTransfer!,
        toAccountId:sellerAccount},
    }:p),
 },recipe),/invalid_market_transfer_provenance/,'self-account trade cannot launder source ancestry');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
   p.provenanceId==='PROOF_COPPER_BANK'?{...p,bankDeposit:undefined}:p),
 },recipe),/missing_or_mismatched_bank_deposit/,'Bank quantity without deposited custody is not spendable');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,originalSourceProofs:proofs.map(p=>
   p.provenanceId==='PROOF_COPPER_BANK'?{
    ...p,bankDeposit:{...p.bankDeposit!,depositedByCharacterId:other},
   }:p),
 },recipe),/missing_or_mismatched_bank_deposit/,'Bank depositor must be the verified source recipient');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedCharacterIds:[smith],
  originalSourceProofs:proofs.map(p=>
   p.provenanceId==='PROOF_COPPER_BANK'?{
    ...p,sourceCharacterId:other,
    bankDeposit:{...p.bankDeposit!,depositedByCharacterId:other},
   }:p),
 },recipe),/missing_or_mismatched_bank_deposit/,'unauthorized alternate character cannot fill Bank');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedCharacterIds:[smith,smith],
 },recipe),/invalid_account_character_roster/,'same character cannot be listed twice');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
   lot.lotId==='LOT_COPPER_BANK'?{
     ...lot,custody:'inventory' as const,characterId:smith,
   }:lot),
 },recipe),/missing_or_mismatched_source_receipt/,'Bank deposit cannot silently become inventory without withdrawal');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,priorRequests:[{
   requestId:'__proto__',requestHash:hash,accountId:account,
   characterId:smith,recipeId:recipe.recipeId,quantity:2,settledRevision:25,
  }],
 },recipe),/invalid_prior_requests/,'poisoned request identity rejected');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
    lot.lotId==='LOT_FANG_MARKET'?{...lot,custody:'market_escrow' as const}:lot),
 },recipe),/insufficient_verified_materials/,'still-listed combat input cannot satisfy recipe');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,ownedLots:stock.map(lot=>
    lot.lotId==='LOT_FANG_MARKET'?{...lot,characterId:other}:lot),
 },recipe),/wrong_character_custody/,'other character cannot spend moved lot');
 rejection(()=>previewProfessionCraftMaterialCustodyV2(request,{
  ...state,availableGold:1399,
 },recipe),/insufficient_gold/,'cannot craft without all gold');
 console.log('PASS: hidden craft handoff preserves independent Smithing, exact owned/Bank lots, combat-source market ancestry, Gold, receipt replay, escrow, source type, anti-alt and EQ2 release hold');
}
test();
