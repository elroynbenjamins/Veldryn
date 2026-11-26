// Review-only pure fixture model. No production imports, writes, or authorization.
// Bank destination is explicit because live server semantics are not yet verified.
export function projectMaterialRetirement({itemId,unitGold,inventory,bank,characterGold,bankGold,bankCredit,priorReceipt=false}){
  // REVIEW FIXTURE ONLY: this function has no authority to retire an item.
  const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
  if(typeof itemId!=="string"||!itemId||!nonnegative(unitGold)||unitGold===0||!nonnegative(characterGold)||!nonnegative(bankGold)||!["character","bank"].includes(bankCredit)||!Array.isArray(inventory)||!Array.isArray(bank))throw Error("Invalid retirement fixture");
  const partition=rows=>{let quantity=0;const kept=[];for(const row of rows){if(!row||typeof row.itemId!=="string"||!Number.isSafeInteger(row.quantity)||row.quantity<=0)throw Error("Invalid stack");if(row.itemId===itemId){quantity+=row.quantity;if(!nonnegative(quantity))throw Error("Quantity overflow");}else kept.push(row);}return {quantity,kept};};
  const i=partition(inventory),b=partition(bank),quantity=i.quantity+b.quantity;
  if(priorReceipt&&quantity!==0)throw Error("Late or duplicate issuance after retirement");
  const inventoryCredit=i.quantity*unitGold,bankStackCredit=b.quantity*unitGold;
  const characterCredit=inventoryCredit+(bankCredit==="character"?bankStackCredit:0),bankCreditGold=bankCredit==="bank"?bankStackCredit:0;
  const totalGold=inventoryCredit+bankStackCredit;
  if(![quantity,inventoryCredit,bankStackCredit,characterCredit,bankCreditGold,totalGold,characterGold+characterCredit,bankGold+bankCreditGold].every(nonnegative))throw Error("Gold or quantity overflow");
  return {itemId,quantity,inventoryQuantity:i.quantity,bankQuantity:b.quantity,totalGold,characterCredit,bankCreditGold,inventory:i.kept,bank:b.kept,characterGold:characterGold+characterCredit,bankGold:bankGold+bankCreditGold};
}

function runFixtureTests(){
 const eq=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error("Expected "+JSON.stringify(b)+", got "+JSON.stringify(a));};
 const reject=(fn)=>{let caught=false;try{fn()}catch{caught=true}if(!caught)throw Error("Expected rejection");};
 const base={itemId:"ECHO_BAT_WING",unitGold:80,inventory:[{itemId:"ECHO_BAT_WING",quantity:143,locked:true},{itemId:"RUNEBOUND_CORE",quantity:7}],bank:[{itemId:"ECHO_BAT_WING",quantity:707,favorite:true}],characterGold:10,bankGold:20,bankCredit:"bank"};
 const p=projectMaterialRetirement(base);eq([p.quantity,p.totalGold,p.characterCredit,p.bankCreditGold],[850,68000,11440,56560]);eq(p.inventory,[base.inventory[1]]);eq(p.bank,[]);eq(base.inventory.length,2);
 const c=projectMaterialRetirement({...base,bankCredit:"character"});eq([c.characterGold,c.bankGold],[68010,20]);
 const replay=projectMaterialRetirement({...base,inventory:p.inventory,bank:p.bank,characterGold:p.characterGold,bankGold:p.bankGold,priorReceipt:true});eq([replay.quantity,replay.totalGold,replay.characterGold,replay.bankGold],[0,0,p.characterGold,p.bankGold]);
 reject(()=>projectMaterialRetirement({...base,priorReceipt:true}));
 reject(()=>projectMaterialRetirement({...base,bankCredit:undefined}));
 reject(()=>projectMaterialRetirement({...base,inventory:[{itemId:base.itemId,quantity:-1}]}));
 reject(()=>projectMaterialRetirement({...base,unitGold:Number.MAX_SAFE_INTEGER}));
 return "PASS: 7 fixture cases (full-value, protected stock, bank routing alternatives, replay, late grant, invalid route/stack, overflow)";
}
console.log(runFixtureTests());
