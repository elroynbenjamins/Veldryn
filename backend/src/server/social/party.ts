export type PartyRole='tank'|'damage'|'support'; export interface PartyMember{characterId:string;role:PartyRole;power:number;online:boolean}
export function composition(m:PartyMember[]){const c={tank:0,damage:0,support:0};m.forEach(x=>c[x.role]++);return{...c,standard:c.tank===1&&c.damage===2&&c.support===1,size:m.length};}
export function canStartExpedition(m:PartyMember[]){if(m.length<1||m.length>4)return false;return m.every(x=>x.online);}
