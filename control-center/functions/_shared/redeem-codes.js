const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeRedeemCode(value){
  return String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,48);
}

export function validateRedeemCode(value){
  const code=normalizeRedeemCode(value); const errors=[];
  if(code.length<12) errors.push('Redeem code must contain at least 12 letters/numbers.');
  if(code.length>40) errors.push('Redeem code must contain at most 40 letters/numbers.');
  return {code,errors};
}

export function generateRedeemCode(prefix='VELD'){
  const cleanPrefix=normalizeRedeemCode(prefix).slice(0,8)||'VELD';
  const bytes=new Uint8Array(16); crypto.getRandomValues(bytes);
  let body=''; for(const b of bytes) body+=ALPHABET[b%ALPHABET.length];
  const raw=`${cleanPrefix}${body}`; const groups=raw.match(/.{1,4}/g)||[raw];
  return groups.join('-');
}

export async function hashRedeemCode(value){
  const {code,errors}=validateRedeemCode(value); if(errors.length) throw new Error(errors.join(' '));
  const bytes=new TextEncoder().encode(code); const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function redeemCodeHint(value){
  const code=normalizeRedeemCode(value); if(code.length<8) return '••••';
  return `${code.slice(0,4)}…${code.slice(-4)}`;
}
