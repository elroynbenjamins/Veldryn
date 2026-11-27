// Review-only state model. No UI mount, actual purchase, network or release authority.
function reviewMarketView(input) {
  // Synthetic presentation state only. It never issues a network call.
  const closed=(reason)=>({screen:"unavailable",reason,rows:[],action:"none",marketAuthorized:false});
  if(!input||input.fixture!=="synthetic-market-ui"||input.previewApproved!==true)return closed("hidden");
  const {tab,actor,offer,quote,recipient,now,capacity}=input;
  if(!["browse","sell","listings","inbox","history"].includes(tab))return closed("unknown_tab");
  const base={screen:tab,rows:[],action:"none",marketAuthorized:false};
  if(input.loading===true)return {...base,state:"loading"};
  if(input.error===true)return {...base,state:"retry_read"};
  if(tab==="inbox"){
    if(!input.entitlement)return {...base,state:"empty"};
    const e=input.entitlement;
    if(e.owner!==actor||!["paid_delivery","seller_return"].includes(e.kind)||e.status!=="pending")return {...base,state:"not_claimable"};
    return {...base,state:capacity===true?"claim_ready":"capacity_blocked",action:capacity===true?"preview_claim":"none"};
  }
  if(tab==="sell"){
    if(!input.copy)return {...base,state:"empty"};
    const c=input.copy;
    if(c.owner!==actor||c.generation!=="equipment-2.0"||c.provenanceVerified!==true||c.tradePolicyApproved!==true||
       c.protected!==false||!["inventory","pouch"].includes(c.location))return {...base,state:"not_listable"};
    if(!Number.isInteger(input.activeListings)||input.activeListings<0||input.activeListings>=20)return {...base,state:"listing_limit"};
    return {...base,state:"list_preview",action:"preview_list"};
  }
  if(tab==="history"||tab==="listings")return {...base,state:"read_only"};
  if(!offer)return {...base,state:"empty"};
  if(offer.publicApproved!==true||offer.hidden===true||offer.status!=="active"||!Number.isSafeInteger(now)||
    !Number.isSafeInteger(offer.expiresAt)||now>=offer.expiresAt)return {...base,state:"unavailable"};
  if(offer.seller===actor)return {...base,state:"own_listing"};
  if(!quote)return {...base,state:"quote_required"};
  const q=quote.quantity;
  if(quote.offerId!==offer.id||quote.revision!==offer.revision||quote.unitPrice!==offer.unitPrice||
     !Number.isSafeInteger(quote.expiresAt)||now>=quote.expiresAt||
     !Number.isSafeInteger(q)||q<1||!Number.isSafeInteger(offer.remaining)||q>offer.remaining||
     !Number.isSafeInteger(offer.unitPrice)||offer.unitPrice<1||!Number.isSafeInteger(offer.unitPrice*q)||
     quote.total!==offer.unitPrice*q)return {...base,state:"refresh_quote"};
  if(offer.kind==="equipment"){
    if(q!==1||offer.remaining!==1||!recipient||recipient.account!==actor||recipient.eligible!==true)return {...base,state:"recipient_ineligible"};
  }else if(offer.kind==="resource"){
    if(!Number.isSafeInteger(offer.minimumLot)||offer.minimumLot<1||q<offer.minimumLot||
       (offer.remaining-q>0&&offer.remaining-q<offer.minimumLot))return {...base,state:"invalid_lot"};
  }else return {...base,state:"unavailable"};
  if(!Number.isSafeInteger(input.gold)||input.gold<quote.total)return {...base,state:"insufficient_gold"};
  if(input.submitting===true)return {...base,state:"submitting"};
  return {...base,state:"purchase_preview",action:"preview_purchase",total:quote.total};
}
function marketViewTests(){
  const base={fixture:"synthetic-market-ui",previewApproved:true,tab:"browse",actor:"buyer",now:100,gold:1000,capacity:true,
    offer:{id:"lot",revision:2,unitPrice:2,remaining:100,minimumLot:10,kind:"resource",seller:"seller",publicApproved:true,hidden:false,status:"active",expiresAt:200},
    quote:{offerId:"lot",revision:2,unitPrice:2,quantity:20,total:40,expiresAt:150},
    recipient:{account:"buyer",eligible:true},activeListings:19,
    copy:{owner:"buyer",generation:"equipment-2.0",provenanceVerified:true,tradePolicyApproved:true,protected:false,location:"inventory"},
    entitlement:{owner:"buyer",kind:"paid_delivery",status:"pending"}};
  const cases=[
    ["purchase",{},"purchase_preview"],["hidden release",{previewApproved:false},undefined],
    ["hidden item",{offer:{hidden:true}},"unavailable"],["unapproved",{offer:{publicApproved:false}},"unavailable"],
    ["expired",{now:200},"unavailable"],["own",{offer:{seller:"buyer"}},"own_listing"],["loading",{loading:true},"loading"],
    ["read error",{error:true},"retry_read"],["no quote",{quote:null},"quote_required"],["old revision",{quote:{revision:1}},"refresh_quote"],
    ["old quote",{now:151},"refresh_quote"],["price changed",{offer:{unitPrice:3}},"refresh_quote"],
    ["bad total",{quote:{total:41}},"refresh_quote"],["tiny lot",{quote:{quantity:5,total:10}},"invalid_lot"],
    ["remainder",{quote:{quantity:95,total:190}},"invalid_lot"],["all",{quote:{quantity:100,total:200}},"purchase_preview"],
    ["poor",{gold:39},"insufficient_gold"],["submitting",{submitting:true},"submitting"],
    ["equip purchase",{offer:{kind:"equipment",remaining:1},quote:{quantity:1,total:2}},"purchase_preview"],
    ["wrong recipient",{offer:{kind:"equipment",remaining:1},quote:{quantity:1,total:2},recipient:{eligible:false}},"recipient_ineligible"],
    ["sell",{tab:"sell"},"list_preview"],["cap",{tab:"sell",activeListings:20},"listing_limit"],
    ["bank",{tab:"sell",copy:{location:"bank"}},"not_listable"],["protected",{tab:"sell",copy:{protected:true}},"not_listable"],
    ["legacy",{tab:"sell",copy:{generation:"v33"}},"not_listable"],["revoked",{tab:"sell",copy:{tradePolicyApproved:false}},"not_listable"],
    ["inbox",{tab:"inbox"},"claim_ready"],["full",{tab:"inbox",capacity:false},"capacity_blocked"],
    ["foreign entitlement",{tab:"inbox",entitlement:{owner:"other"}},"not_claimable"],["return",{tab:"inbox",entitlement:{kind:"seller_return"}},"claim_ready"],
    ["history",{tab:"history"},"read_only"],["listings",{tab:"listings"},"read_only"],["runtime",{fixture:"runtime"},undefined]
  ];
  for(const [name,patch,expected] of cases){
    const fixture={...base,...patch};
    for(const key of ["offer","quote","recipient","copy","entitlement"])if(patch[key])fixture[key]={...base[key],...patch[key]};
    const got=reviewMarketView(fixture);
    if(got.state!==expected||got.marketAuthorized!==false||(!expected&&got.screen!=="unavailable"))throw Error(name+":"+JSON.stringify(got));
  }
  return cases.length;
}
console.log('Market UI state synthetic checks passed: '+marketViewTests());
