/**
 * Hidden EQ2 server-only account projection validation.
 *
 * This is NOT a client payload schema, wallet authority, online route or
 * source of truth. A future authenticated DB adapter must derive these fields
 * from its locked account snapshot before passing them to the Forge planner.
 * No mobile GameState, React Native, item catalog, or Node-only crypto here.
 */
export interface V2ServerProjectionCharacter {
 level:number;
 gold:number;
 professionLevels:Record<'smithing'|'tailoring',number>;
 inventory:Record<string,number>;
}
export interface V2ServerProjection {
 accountId:string;
 activeCharacterId:string;
 version:number;
 forgeSlotCapacity:number;
 characters:Record<string,V2ServerProjectionCharacter>;
 bank:Record<string,number>;
}
const safe=(value:unknown):value is number=>
 typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const record=(value:unknown):value is Record<string,unknown>=>{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const proto=Object.getPrototypeOf(value);
 return proto===Object.prototype||proto===null;
};
const key=(value:string)=>Boolean(value)&&value===value.trim()&&
 value!=='__proto__'&&value!=='prototype'&&value!=='constructor';
function materialBalances(value:unknown){
 if(!record(value))return false;
 for(const [id,quantity] of Object.entries(value)){
  if(!key(id)||!safe(quantity)||id.startsWith('EQ2_'))return false;
 }
 return true;
}
/** Fail closed for all account/character materials before ANY craft mutation.
 * This cannot certify a snapshot came from the database; the caller must
 * independently authenticate the owner and lock the existing online account.
 */
export function isValidEquipmentV2ServerProjection(
 value:unknown,
):value is V2ServerProjection{
 if(!record(value))return false;
 const v=value;
 if(typeof v.accountId!=='string'||!key(v.accountId)||
  typeof v.activeCharacterId!=='string'||!key(v.activeCharacterId)||
  !safe(v.version)||!safe(v.forgeSlotCapacity)||
  v.forgeSlotCapacity<3||v.forgeSlotCapacity>7||
  !record(v.characters)||!materialBalances(v.bank))return false;
 const owners=Object.entries(v.characters);
 if(!owners.length||owners.length>5||
  !Object.hasOwn(v.characters,v.activeCharacterId))return false;
 for(const [id,character] of owners){
  if(!key(id)||!record(character)||!safe(character.level)||!safe(character.gold)||
   !record(character.professionLevels)||!safe(character.professionLevels.smithing)||
   !safe(character.professionLevels.tailoring)||
   !materialBalances(character.inventory))return false;
 }
 return true;
}
