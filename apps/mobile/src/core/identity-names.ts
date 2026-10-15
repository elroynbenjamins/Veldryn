const LATIN_WORD=String.raw`\p{Script=Latin}[\p{Script=Latin}\p{M}]*`;
const SAFE_IDENTITY_NAME=new RegExp(`^${LATIN_WORD}(?:[ '-]${LATIN_WORD})*$`,'u');
const RESERVED_NAME_TOKENS=new Set(['admin','administrator','moderator','mod','developer','dev','staff','support','system','official','owner','gamemaster','game master','gm','bot','null','undefined','deleted','veldryn']);
const OFFENSIVE_NAME_TOKENS=new Set(['fuck','fucker','fucking','shit','shite','bitch','cunt','dick','pussy','whore','slut','bastard','retard','rape','rapist','pedo','porn','nazi','nigger','nigga']);

export function normalizeIdentityName(value:string){
 return value.normalize('NFKC')
  .replace(/[’‘‛]/g,"'")
  .replace(/[‐‑‒–—−]/g,'-')
  .replace(/[\u00A0\t\r\n]+/g,' ')
  .replace(/ +/g,' ')
  .trim();
}

function identityNameError(value:string,min:number,max:number,label:string){
 const name=normalizeIdentityName(value);
 if(name.length<min)return `Use at least ${min} characters.`;
 if(name.length>max)return `Use no more than ${max} characters.`;
 if(!SAFE_IDENTITY_NAME.test(name))return `Use Latin letters, single spaces, apostrophes, or hyphens for ${label}.`;
 const tokens=name.toLocaleLowerCase().split(/[ '-]+/).filter(Boolean),compact=tokens.join('');
 if(tokens.some(token=>RESERVED_NAME_TOKENS.has(token))||RESERVED_NAME_TOKENS.has(compact))return 'That name is reserved and cannot be used.';
 if(tokens.some(token=>OFFENSIVE_NAME_TOKENS.has(token))||OFFENSIVE_NAME_TOKENS.has(compact))return 'That name is not allowed.';
 return '';
}

export function normalizeCharacterName(value:string){return normalizeIdentityName(value)}
export function characterNameError(value:string){return identityNameError(value,2,20,'character names')}
export function normalizeGuildName(value:string){return normalizeIdentityName(value)}
export const GUILD_NAME_MAX_LENGTH=21;
export function guildNameError(value:string){return identityNameError(value,3,GUILD_NAME_MAX_LENGTH,'Guild names')}
