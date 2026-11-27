// Disposable in-memory synthetic review only. No real accounts, SQL, auth or runtime import.
function settlementReview() {
  // Synthetic only: immutable original record, one custody row, append-only sales.
  const fail = code => {throw Error(code)};
  const check = (v,code) => {if(!v)fail(code)};
  const clone = v => JSON.parse(JSON.stringify(v));
  const baseline = () => ({accounts:{a:{gold:1000,capacity:1},b:{gold:1000,capacity:1},c:{gold:1000,capacity:1}},
    mint:{id:"eq2-copy",origin:"a",source:"forge",receipt:"mint-1",digest:"immutable-rolls",generation:"equipment-2.0"},
    custody:{owner:"a",state:"held",revision:0,protected:false},offer:null,sales:[],requests:{},tax:0,approved:true});
  const validId = x => typeof x==="string" && /^[a-zA-Z0-9_-]{1,80}$/.test(x) && !["__proto__","constructor","prototype"].includes(x);
  const invariant = s => {
    check(Object.values(s.accounts).every(a=>Number.isSafeInteger(a.gold)&&a.gold>=0),"wallet");
    check(Object.values(s.accounts).reduce((a,b)=>a+b.gold,0)+s.tax===3000,"gold_conservation");
    check(s.tax===s.sales.reduce((a,b)=>a+b.tax,0),"tax_conservation");
    check(s.mint.generation==="equipment-2.0" && s.mint.origin==="a" && s.mint.digest==="immutable-rolls","original_mint");
    check(Object.hasOwn(s.accounts,s.custody.owner),"owner");
    check(["held","escrow","pending_delivery","pending_return"].includes(s.custody.state),"custody");
    check((s.custody.state==="escrow")===(s.offer!==null),"escrow");
    let last=s.mint.origin;
    for(const [i,sale] of s.sales.entries()){
      check(sale.ordinal===i+1 && sale.parent===(i===0?null:i) && sale.seller===last &&
        sale.seller!==sale.buyer && sale.instance===s.mint.id && sale.digest===s.mint.digest &&
        sale.gross===sale.net+sale.tax && sale.tax===Math.ceil(sale.gross/20),"sale_chain");
      last=sale.buyer;
    }
    check(last===s.custody.owner,"sale_owner");
  };
  const apply = (state,cmd) => {
    // All operations operate on a clone and only return a new state after checks.
    invariant(state);
    check(cmd&&validId(cmd.actor)&&Object.hasOwn(state.accounts,cmd.actor)&&validId(cmd.key),"actor_or_key");
    const allowed={list:["price","now","revision"],buy:["offer","now","price","revision","eligible"],cancel:["offer","revision"],expire:["offer","revision","now","worker"],claim:["revision","eligible"],return:["revision"]};
    check(Object.hasOwn(allowed,cmd.op),"unknown_operation");
    const fields=["actor","key","op",...allowed[cmd.op]];
    check(Object.keys(cmd).every(k=>fields.includes(k))&&fields.every(k=>Object.hasOwn(cmd,k)),"command_shape");
    const fingerprint=JSON.stringify(fields.map(k=>cmd[k]));
    const key=cmd.actor+":"+cmd.key;
    if(Object.hasOwn(state.requests,key)){
      check(state.requests[key].fingerprint===fingerprint,"idempotency_conflict");
      return {state,receipt:clone(state.requests[key].receipt),replay:true};
    }
    const s=clone(state),c=s.custody;
    check(Number.isSafeInteger(cmd.revision)&&cmd.revision===c.revision,"stale_revision");
    const owner=cmd.actor===c.owner;
    const validTime=Number.isSafeInteger(cmd.now)&&cmd.now>=0&&cmd.now<=Number.MAX_SAFE_INTEGER-604800;
    const offerMatches=s.offer&&cmd.offer===s.offer.id;
    switch(cmd.op){
      case "list":
        check(s.approved && owner && c.state==="held" && !c.protected,"not_listable");
        check(validTime && Number.isSafeInteger(cmd.price)&&cmd.price>=1&&cmd.price<=1000000000,"invalid_price_or_time");
        c.state="escrow";s.offer={id:"listing-"+(c.revision+1),price:cmd.price,expires:cmd.now+604800,seller:c.owner};break;
      case "buy":{
        check(s.approved&&c.state==="escrow"&&offerMatches&&!owner&&validTime&&cmd.now<s.offer.expires,"not_buyable");
        check(cmd.eligible===true&&cmd.price===s.offer.price,"buyer_or_price");
        const gross=s.offer.price,tax=Math.ceil(gross/20),net=gross-tax;
        check(s.accounts[cmd.actor].gold>=gross,"insufficient_gold");
        s.accounts[cmd.actor].gold-=gross;s.accounts[c.owner].gold+=net;s.tax+=tax;
        const ordinal=s.sales.length+1;
        s.sales.push({ordinal,parent:ordinal===1?null:ordinal-1,seller:c.owner,buyer:cmd.actor,instance:s.mint.id,digest:s.mint.digest,gross,tax,net,offer:s.offer.id});
        c.owner=cmd.actor;c.state="pending_delivery";s.offer=null;break;
      }
      case "cancel":
        check(owner&&c.state==="escrow"&&offerMatches,"not_cancellable");
        c.state="pending_return";s.offer=null;break;
      case "expire":
        check(cmd.worker===true&&c.state==="escrow"&&offerMatches&&validTime&&cmd.now>=s.offer.expires,"not_due");
        c.state="pending_return";s.offer=null;break;
      case "claim":
        // Revocation disables trade, not ownership of an already paid delivery.
        check(owner&&c.state==="pending_delivery"&&cmd.eligible===true,"claim_ineligible");
        check(s.accounts[cmd.actor].capacity>0,"capacity");c.state="held";break;
      case "return":
        check(owner&&c.state==="pending_return","not_returnable");
        check(s.accounts[cmd.actor].capacity>0,"capacity");c.state="held";break;
    }
    c.revision++;
    const receipt={operation:cmd.op,revision:c.revision,owner:c.owner,state:c.state,sales:s.sales.length,marketAuthorized:false};
    s.requests[key]={fingerprint,receipt};invariant(s);
    return {state:s,receipt:clone(receipt),replay:false};
  };
  let s=baseline(), tests=0;
  const make=(op,actor,key,extra={})=>({op,actor,key,revision:s.custody.revision,...extra});
  const run=cmd=>{const out=apply(s,cmd);s=out.state;tests++;return out};
  const rejects=(cmd,reason)=>{const before=JSON.stringify(s);let caught=false;try{apply(s,cmd)}catch(e){if(e.message!==reason)throw e;caught=true}check(caught&&before===JSON.stringify(s),"expected_atomic_reject_"+reason);tests++};
  const assert=(v,code)=>{check(v,code);tests++};
  rejects(make("list","b","foreign",{price:125,now:0}),"not_listable");
  rejects(make("list","a","zero",{price:0,now:0}),"invalid_price_or_time");
  rejects(make("list","a","fraction",{price:125.5,now:0}),"invalid_price_or_time");
  const list=make("list","a","l1",{price:125,now:0});run(list);
  assert(run(list).replay,"list_replay");
  rejects({...list,price:126},"idempotency_conflict");
  const offer=s.offer.id;
  rejects(make("buy","a","self",{offer,now:1,price:125,eligible:true}),"not_buyable");
  rejects(make("buy","b","wrong_price",{offer,now:1,price:124,eligible:true}),"buyer_or_price");
  rejects(make("buy","b","wrong_class",{offer,now:1,price:125,eligible:false}),"buyer_or_price");
  rejects(make("buy","b","expired",{offer,now:604800,price:125,eligible:true}),"not_buyable");
  rejects(make("expire","c","early",{offer,now:1,worker:true}),"not_due");
  const buy=make("buy","b","b1",{offer,now:1,price:125,eligible:true});run(buy);
  assert(s.accounts.a.gold===1118&&s.accounts.b.gold===875&&s.tax===7,"first_sale_tax");
  assert(run(buy).replay,"buy_replay");
  rejects(make("buy","c","race",{offer,now:1,price:125,eligible:true}),"not_buyable");
  rejects(make("cancel","a","late_cancel",{offer}),"not_cancellable");
  rejects(make("claim","c","foreign_claim",{eligible:true}),"claim_ineligible");
  s.accounts.b.capacity=0;
  rejects(make("claim","b","full",{eligible:true}),"capacity");
  s.approved=false;
  rejects(make("claim","b","ineligible",{eligible:false}),"claim_ineligible");
  s.accounts.b.capacity=1;run(make("claim","b","claim1",{eligible:true}));
  rejects(make("list","b","revoked",{price:200,now:2}),"not_listable");
  s.approved=true;run(make("list","b","l2",{price:200,now:2}));
  s.approved=false;run(make("cancel","b","c2",{offer:s.offer.id}));
  s.accounts.b.capacity=0;rejects(make("return","b","fullreturn"),"capacity");
  s.accounts.b.capacity=1;run(make("return","b","r2"));
  s.approved=true;run(make("list","b","l3",{price:200,now:10}));
  const second=make("buy","c","b2",{offer:s.offer.id,now:11,price:200,eligible:true});run(second);
  run(make("claim","c","claim2",{eligible:true}));
  assert(s.sales.length===2&&s.sales[1].parent===1&&s.tax===17,"second_sale_chain");
  run(make("list","c","l4",{price:200,now:12}));s.approved=false;
  const exp=make("expire","a","expire4",{offer:s.offer.id,now:604812,worker:true});run(exp);
  assert(run(exp).replay,"expiry_replay");run(make("return","c","return4"));
  s.approved=true;run(make("list","c","expensive",{price:2000,now:20}));
  rejects(make("buy","b","poor",{offer:s.offer.id,now:21,price:2000,eligible:true}),"insufficient_gold");
  rejects({...make("cancel","c","stale",{offer:s.offer.id}),revision:0},"stale_revision");
  rejects({...make("cancel","c","extra",{offer:s.offer.id}),owner:"a"},"command_shape");
  run(make("cancel","c","lastcancel",{offer:s.offer.id}));run(make("return","c","lastreturn"));
  invariant(s);assert(s.mint.origin==="a"&&s.custody.owner==="c","original_owner_retained");
  return {tests,tax:s.tax,sales:s.sales.length,marketAuthorized:false};
}
console.log(JSON.stringify(settlementReview()));
