/**
 * Password recovery URL handling for the lightweight Control Center auth client.
 * Recovery tokens stay in memory and are removed from the browser address immediately.
 */
export function recoveryRedirectUrl(origin) {
  const url=new URL(origin);
  if(url.protocol!=='https:' && !(url.protocol==='http:' && url.hostname==='localhost'))
    throw new Error('Recovery requires HTTPS.');
  return `${url.origin}/?recover=1`;
}

export function parseRecoveryCallback(hash,search) {
  const params=new URLSearchParams(String(hash||'').replace(/^#/,''));
  const isRecovery=new URLSearchParams(String(search||'').replace(/^\?/,'')).get('recover')==='1'
    || params.get('type')==='recovery';
  if(!isRecovery && !params.has('error'))return {kind:'none'};
  const error=params.get('error');
  if(error)return {kind:'error',message:params.get('error_description')||'The recovery link is invalid or expired.'};
  if(params.get('type')==='recovery' && params.get('access_token'))
    return {kind:'recovery',accessToken:params.get('access_token'),
      expiresIn:Math.max(0,Number(params.get('expires_in')||0))};
  return {kind:'error',message:'This recovery link is incomplete or expired. Request a new email.'};
}

export function validateRecoveryPassword(password,confirmation) {
  if(typeof password!=='string'||password.length<12)return 'Use at least 12 characters.';
  if(password.length>128)return 'Your password is too long.';
  if(password!==confirmation)return 'The passwords do not match.';
  return null;
}
