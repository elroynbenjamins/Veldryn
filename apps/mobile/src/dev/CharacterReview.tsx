import {useState} from 'react';
import {CharacterScreen} from '../screens/CharacterScreen';
import {SavedLoadoutsPanel} from '../components/SavedLoadoutsPanel';
import {ITEMS} from '../content/items';
import {newGame,createCharacter,equipItem,unequipItem,equipNoviceSet} from '../core/game';
import {attemptEquipmentUpgrade,socketGem,replaceGem,unsocketGem} from '../core/equipment-enhancement';
/** Memory-only review fixture using the same equipment actions as the game. */
export function CharacterReview(){
 const [state,setState]=useState(()=>{let s=createCharacter(newGame(Date.now()),'IRONWARDEN','Aster Nightfall');s.character!.level=25;s.character!.gold=4500;s.character!.profileIconId='starter:armored-sentinel';s.inventory.capacity=120;s.inventory.stacks=[...ITEMS.filter(i=>i.equipmentSetId==='T1_001').map(i=>({itemId:i.id,quantity:1})),{itemId:'TEMPERING_DUST',quantity:100},{itemId:'TEMPERING_CORE',quantity:100}];for(const item of ITEMS.filter(i=>i.equipmentSetId==='T1_001'))s=equipItem(s,item.id);return s;});
 const noop=()=>{};
 return <CharacterScreen state={state} onProfile={noop} onCompanions={noop} onInventory={noop} onCrafting={noop} onSave={noop} onEquipSet={()=>setState(s=>equipNoviceSet(s))} onUnequip={slot=>setState(s=>unequipItem(s,slot))} onUpgrade={id=>setState(s=>attemptEquipmentUpgrade(s,id,0).state)} onSocket={(id,gem)=>setState(s=>socketGem(s,id,gem))} onReplaceGem={(id,gem)=>setState(s=>replaceGem(s,id,gem))} onUnsocket={(id,index)=>setState(s=>unsocketGem(s,id,index))} onGemRefine={noop} onGemCombine={noop} onGemDismantle={noop} onGemCacheClaim={noop} loadouts={<SavedLoadoutsPanel state={state} onChange={setState}/>}/>;
}
