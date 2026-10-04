import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {View} from 'react-native';
import {CommerceProductRow} from './CommerceProductRow';
import type {CommerceProductId} from '../content/commerce-products';
import type {ServerCommerceEntitlements} from '../core/account-entitlements';
import {premiumProductRows} from '../core/commerce-presentation';
import {spacing} from '../theme/theme';

export function CommerceCatalog({language:languageOverride,owned,checking=false,ready,price,available,onBuy}:{language?:Language;
  owned:ServerCommerceEntitlements|undefined;checking?:boolean;ready:boolean;
  price:(id:CommerceProductId)=>string;
  available:(id:CommerceProductId)=>boolean;
  onBuy:(id:CommerceProductId)=>void;
}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  return <View style={{gap:spacing.sm,marginVertical:spacing.sm}}>
    {premiumProductRows(owned,checking).map(row=><CommerceProductRow
      key={row.id} language={language} productId={row.id}
      title={row.id==='supporter_monthly'&&row.owned?row.title:a(row.id==='supporter_monthly'?'{name} · monthly':'{name} · permanent',{name:row.title})}
      price={row.owned?(row.id==='supporter_monthly'?supporterExpiry(owned?.supporterExpiresAt,language):a("Permanent access")):a(price(row.id))}
      status={row.status?a(row.status):undefined} action={a(row.action)}
      owned={row.owned} disabled={!ready||!row.confirmed||row.owned||!available(row.id)}
      onPress={()=>onBuy(row.id)}
    />)}
  </View>;
}

function supporterExpiry(value:string|null|undefined,language:Language){const expiry=Date.parse(value??'');return Number.isFinite(expiry)?accountText(language,'Access until {date}',{date:new Date(expiry).toLocaleDateString(language,{year:'numeric',month:'short',day:'numeric'})}):accountText(language,'Active');}
