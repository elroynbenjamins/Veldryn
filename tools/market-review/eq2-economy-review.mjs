// Synthetic analytics review. Never an automatic pricing or sanctions engine.
function economyReview(rows, options) {
  // Synthetic review only. No account penalties, price overrides or trading authority.
  const fail=reason=>({valid:false,reason,marketAuthorized:false});
  if(!Array.isArray(rows)||!options||options.fixture!=="synthetic-market-economy"||
     !Number.isSafeInteger(options.minTrades)||options.minTrades<1||
     !Number.isSafeInteger(options.minAccounts)||options.minAccounts<2)return fail("review_only");
  const groups=new Map(), ids=new Set();
  for(const row of rows){
    if(!row||!["id","item","buyer","seller"].every(k=>typeof row[k]==="string"&&row[k].length>0)||
      ids.has(row.id)||row.buyer===row.seller||!Number.isSafeInteger(row.quantity)||row.quantity<1||
      !Number.isSafeInteger(row.unitPrice)||row.unitPrice<1||!Number.isSafeInteger(row.quantity*row.unitPrice))
      return fail("invalid_or_duplicate_trade");
    ids.add(row.id);
    const list=groups.get(row.item)||[];list.push(row);groups.set(row.item,list);
  }
  const metrics=[];
  for(const [item,list] of groups){
    let volume=0,gross=0,fee=0;
    const accounts=new Set(),sellerVolume=new Map(),directions=new Map();
    for(const row of list){
      const amount=row.quantity*row.unitPrice;
      volume+=row.quantity;gross+=amount;fee+=Math.ceil(amount/20);
      if(![volume,gross,fee].every(Number.isSafeInteger))return fail("aggregate_overflow");
      accounts.add(row.buyer);accounts.add(row.seller);
      sellerVolume.set(row.seller,(sellerVolume.get(row.seller)||0)+amount);
      // Tuple JSON avoids delimiter collisions.
      const key=JSON.stringify([row.seller,row.buyer]);
      directions.set(key,(directions.get(key)||0)+amount);
    }
    let reciprocal=0;
    for(const [key,amount] of directions){
      const [seller,buyer]=JSON.parse(key);
      reciprocal+=Math.min(amount,directions.get(JSON.stringify([buyer,seller]))||0);
    }
    const sorted=[...list].sort((a,b)=>a.unitPrice-b.unitPrice);
    let cumulative=0,median=null;
    for(const row of sorted){cumulative+=row.quantity;if(cumulative>=Math.ceil(volume/2)){median=row.unitPrice;break;}}
    const sufficient=list.length>=options.minTrades&&accounts.size>=options.minAccounts;
    metrics.push({item,trades:list.length,uniqueAccounts:accounts.size,volume,gross,fee,net:gross-fee,
      effectiveFeePct:100*fee/gross,roundingPremium:fee-gross/20,
      candidateVolumeWeightedMedian:sufficient?median:null,
      largestSellerGrossShare:Math.max(...sellerVolume.values())/gross,
      reciprocalGrossShare:reciprocal/gross,
      priceEvidence:sufficient?"review_candidate":"insufficient_sample",
      manipulationConfirmed:false,marketAuthorized:false});
  }
  return {valid:true,metrics,marketAuthorized:false};
}
function economyTests() {
  const options={fixture:"synthetic-market-economy",minTrades:20,minAccounts:5};
  const row=(id,quantity,unitPrice,seller="s",buyer="b",item="ore")=>({id,item,buyer,seller,quantity,unitPrice});
  const get=rows=>economyReview(rows,options);
  let count=0;const check=(v,name)=>{if(!v)throw Error(name);count++};
  let x=get([row("1",125,1)]).metrics[0];
  check(x.fee===7&&x.net===118,"ceil fee");
  check(x.candidateVolumeWeightedMedian===null,"thin market");
  check(x.largestSellerGrossShare===1,"concentration");
  check(x.reciprocalGrossShare===0,"one way");
  x=get([row("1",1,1)]).metrics[0];check(x.effectiveFeePct===100,"small lot rounding");
  x=get([row("1",1,1),row("2",1,1)]).metrics[0];check(x.fee===2&&x.roundingPremium===1.9,"per fill fee");
  x=get([row("1",100,1),row("2",100,1,"b","s")]).metrics[0];check(x.reciprocalGrossShare===1&&!x.manipulationConfirmed,"reciprocal not guilt");
  x=get([row("1",100,1),row("2",50,1,"b","s")]).metrics[0];check(Math.abs(x.reciprocalGrossShare-2/3)<1e-12,"asymmetric reciprocal");
  const balanced=Array.from({length:20},(_,i)=>row("t"+i,10,10,"s"+i%5,"b"+i%5));
  x=get(balanced).metrics[0];check(x.candidateVolumeWeightedMedian===10&&x.uniqueAccounts===10,"sample");
  check(x.volume===200&&x.gross===2000&&x.fee===100&&x.net===1900,"gold sums");
  check(x.largestSellerGrossShare===.2,"diverse sellers");
  x=get([...balanced,row("outlier",1,1000,"s6","b6")]).metrics[0];check(x.candidateVolumeWeightedMedian===10,"thin outlier");
  x=get([...balanced,row("whale",1000,1000,"s6","b6")]).metrics[0];check(x.candidateVolumeWeightedMedian===1000&&x.largestSellerGrossShare>.99,"volume manipulation sensitivity");
  x=get(Array.from({length:20},(_,i)=>row("t"+i,10,10))).metrics[0];check(x.candidateVolumeWeightedMedian===null,"same pair sample");
  check(get([row("1",10,10),row("1",10,10)]).valid===false,"duplicate");
  check(get([row("1",10,10,"s","s")]).valid===false,"self sale");
  check(get([row("1",0,10)]).valid===false,"zero");
  check(get([row("1",10,1.1)]).valid===false,"fraction");
  check(get([row("1",Number.MAX_SAFE_INTEGER,2)]).valid===false,"overflow");
  check(get([row("1",10,1),row("2",10,2,"s","b","wood")]).metrics.length===2,"separate items");
  check(economyReview([], {...options,fixture:"runtime"}).valid===false,"runtime");
  check(get([]).metrics.length===0,"no sample");
  check(get(balanced).marketAuthorized===false,"no authorization");
  return count;
}
console.log('Market economy synthetic checks passed: '+economyTests());
