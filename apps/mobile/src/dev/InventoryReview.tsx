import {useState} from 'react';
import {InventoryScreen} from '../screens/InventoryScreen';
import {ITEMS} from '../content/items';
import {newGame,createCharacter,equipItem,equipFood,eatFood,sellItem,salvageItem,depositToBank,depositAllMaterials,withdrawFromBank,upgradeStorage,claimOverflowToBank} from '../core/game';
import {toggleInventoryFavorite,acknowledgeInventoryItem,acknowledgeAllInventoryItems} from '../core/inventory-view';
import {bulkTransferSelected,bulkSellSelected,bulkSalvageSelected} from '../core/inventory-bulk';

/** Opt-in memory fixture; exercises real Inventory callbacks without touching saves. */
export function InventoryReview(){
 const [state,setState]=useState(()=>{
  const s=createCharacter(newGame(Date.now()),'IRONWARDEN','Aster Nightfall');
  s.character!.level=25;s.character!.gold=4500;s.inventory.capacity=120;
  s.inventory.stacks=[...ITEMS.filter(i=>i.equipmentSetId==='T1_001').map(i=>({itemId:i.id,quantity:1})),...ITEMS.filter(i=>['material','food','gem'].includes(i.type)).slice(0,22).map((i,n)=>({itemId:i.id,quantity:12+n}))];
  return s;
 });
 return <InventoryScreen state={state} onEquip={id=>setState(s=>equipItem(s,id))} onFood={id=>setState(s=>equipFood(s,id))} onEat={id=>setState(s=>eatFood(s,id))} onSell={id=>setState(s=>sellItem(s,id))} onSalvage={id=>setState(s=>salvageItem(s,id))} onDeposit={(id,n)=>setState(s=>depositToBank(s,id,n))} onDepositMaterials={()=>setState(depositAllMaterials)} onUpgradeStorage={location=>setState(s=>upgradeStorage(s,location))} onWithdraw={(id,n)=>setState(s=>withdrawFromBank(s,id,n))} onOverflow={()=>setState(claimOverflowToBank)} onToggleFavorite={id=>setState(s=>toggleInventoryFavorite(s,id))} onAcknowledgeItem={id=>setState(s=>acknowledgeInventoryItem(s,id))} onAcknowledgeAll={()=>setState(acknowledgeAllInventoryItems)} onBulkAction={(kind,location,ids)=>setState(s=>kind==='transfer'?bulkTransferSelected(s,ids,location):kind==='sell'?bulkSellSelected(s,ids):bulkSalvageSelected(s,ids))} onNavigateInspect={()=>{}}/>;
}
