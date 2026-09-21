const LATIN_WORD=String.raw`\p{Script=Latin}[\p{Script=Latin}\p{M}]*`;
const SAFE_IDENTITY_NAME=new RegExp(`^${LATIN_WORD}(?:[ '-]${LATIN_WORD})*$`,'u');

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
 return '';
}

export function normalizeCharacterName(value:string){return normalizeIdentityName(value)}
export function characterNameError(value:string){return identityNameError(value,2,20,'character names')}
export function normalizeGuildName(value:string){return normalizeIdentityName(value)}
export function guildNameError(value:string){return identityNameError(value,3,24,'Guild names')}
