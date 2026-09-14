import type {CharacterClassId} from './policy';
import {validateCompanionLoadout} from './policy';

export interface CompanionCharacterRecord{characterId:string;accountId:string;classId:CharacterClassId;}
export interface CompanionLoadoutRepository{
  getCharacter(characterId:string):Promise<CompanionCharacterRecord|null>;
  listOwnedCompanionIds(accountId:string):Promise<string[]>;
  listBusyCompanionIds?(accountId:string):Promise<string[]>;
  setEquippedCompanion(input:{accountId:string;characterId:string;companionId:string|null;requestId:string}):Promise<void>;
}
export interface EquipCompanionCommand{characterId:string;companionId:string|null;requestId:string;}

/**
 * Authenticated application boundary. The caller supplies only identity + desired ID.
 * Character class, companion role and ownership are resolved server-side.
 */
export class CombatCompanionApplication{
  constructor(private readonly repository:CompanionLoadoutRepository){}
  async equip(authenticatedAccountId:string,command:EquipCompanionCommand){
    if(!authenticatedAccountId)throw new Error('unauthenticated');
    if(!command.requestId)throw new Error('request_id_required');
    const character=await this.repository.getCharacter(command.characterId);
    if(!character||character.accountId!==authenticatedAccountId)throw new Error('character_not_owned');
    const ownedCompanionIds=await this.repository.listOwnedCompanionIds(authenticatedAccountId);
    const busyCompanionIds=this.repository.listBusyCompanionIds?await this.repository.listBusyCompanionIds(authenticatedAccountId):[];
    const checked=validateCompanionLoadout({classId:character.classId,companionId:command.companionId,ownedCompanionIds,busyCompanionIds});
    if(!checked.ok)throw new Error(checked.reason);
    await this.repository.setEquippedCompanion({accountId:authenticatedAccountId,characterId:character.characterId,companionId:checked.companionId,requestId:command.requestId});
    return {characterId:character.characterId,companionId:checked.companionId};
  }
}
