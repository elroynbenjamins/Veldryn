import {supabase} from './supabase';

const normalize=(value:string)=>String(value||'').toUpperCase().replace(/\s+/g,'').slice(0,48);

const redeemErrors:Record<string,string>={
  AUTH_REQUIRED:'Sign in before redeeming a code.',
  LINK_ACCOUNT_REQUIRED:'Link your account with an email before redeeming a code.',
  INVALID_REDEEM_CODE:'That redeem code is invalid.',
  REDEEM_LIMIT_REACHED:'That redeem code has reached its claim limit.',
};

/** Redeem an official Live-Ops code through the authenticated Supabase RPC. */
export async function redeemCode(rawCode:string):Promise<string>{
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const code=normalize(rawCode);
  if(code.length<12)throw new Error('Enter a valid redeem code.');
  const {data,error}=await supabase.rpc('redeem_commerce_code_v1',{p_code:code});
  if(error){
    const message=String(error.message||'').toUpperCase();
    const known=Object.entries(redeemErrors).find(([key])=>message.includes(key));
    throw new Error(known?.[1]??'Unable to redeem this code.');
  }
  const grant=typeof data==='object'&&data!==null&&'grant' in data?String((data as {grant?:unknown}).grant??''):'';
  const labels:Record<string,string>={vip:'VIP access granted.',vip_plus:'VIP+ access granted.',supporter_1m:'Supporter access granted for 1 month.',supporter_3m:'Supporter access granted for 3 months.',supporter_6m:'Supporter access granted for 6 months.',supporter_lifetime:'Lifetime Supporter access granted.'};
  return labels[grant]??'Code redeemed successfully.';
}
