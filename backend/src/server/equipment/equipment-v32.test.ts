import {compareEquipV32,loadoutSummaryV32,type EquipContextV32} from './equipment-equip-v32';
import {setCollectionPayloadV32,craftingScreenPayloadV32} from './equipment-mobile-api-v32';
import type {EquipmentItemInstanceV26} from './equipment-item-instance-v26';
function assert(x:boolean,m:string){if(!x)throw new Error(m)}
const common:EquipmentItemInstanceV26={id:'c',characterId:'char',pieceId:'T9P_1513',rarity:'Common',upgradeRank:0,acquireSource:'craft',createdAt:'x'};
const mythic:EquipmentItemInstanceV26={...common,id:'m',rarity:'Mythic'};
const ctx:EquipContextV32={characterId:'char',className:'Ironwarden',level:70,instances:[common,mythic],loadout:{Helmet:'c'}};
const c=loadoutSummaryV32(ctx);const cmp=compareEquipV32(ctx,'m');assert(Object.values(cmp.statDelta).some(v=>v>0),'mythic comparison must increase base stats');
const payload=craftingScreenPayloadV32('T1P_001',{characterLevel:5,skills:{SKL_012:5,SKL_014:5,SKL_015:5,SKL_008:5},inventory:{}});assert(payload.detail.pieceId==='T1P_001','crafting payload');
const col=setCollectionPayloadV32('Ironwarden',[],[]);assert(col.skins.length===27,'9 tiers x 3 paths skins');
assert(c.equipped.length===1,'loadout summary');
console.log('equipment-v32.test ok');
