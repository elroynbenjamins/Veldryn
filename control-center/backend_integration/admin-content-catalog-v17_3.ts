export interface CatalogEntry { entityType:string; entityKey:string; label:string; description?:string; metadata?:Record<string,unknown>; enabled?:boolean; sourceVersion?:string; }
export interface CatalogSink { replaceType(entityType:string, entries:CatalogEntry[]):Promise<void>; }
export interface VeldrynContentSources {
  items:Array<{id:string;name:string;kind?:string;rarity?:string;enabled?:boolean}>;
  skills:Array<{id:string;name:string;enabled?:boolean}>;
  currencies:Array<{id:string;name:string;premium?:boolean;enabled?:boolean}>;
  rewards:Array<{id:string;name:string;tier?:string;enabled?:boolean}>;
  companions:Array<{id:string;name:string;rarity?:string;role?:string;enabled?:boolean}>;
  entitlements:Array<{id:string;name:string;scope?:string;enabled?:boolean}>;
  pets?:Array<{id:string;name:string;enabled?:boolean}>;
  profileBackgrounds?:Array<{id:string;name:string;enabled?:boolean}>;
  profileBorders?:Array<{id:string;name:string;enabled?:boolean}>;
  skins?:Array<{id:string;name:string;classId?:string;enabled?:boolean}>;
  achievements?:Array<{id:string;name:string;enabled?:boolean}>;
  titles?:Array<{id:string;name:string;enabled?:boolean}>;
  sourceVersion:string;
}
const map=(type:string,rows:Array<{id:string;name:string;enabled?:boolean}&Record<string,unknown>>,version:string):CatalogEntry[]=>rows.map(row=>({entityType:type,entityKey:String(row.id),label:String(row.name),metadata:{...row},enabled:row.enabled!==false,sourceVersion:version}));
export async function syncAdminContentCatalog(sink:CatalogSink,src:VeldrynContentSources):Promise<void>{
  await sink.replaceType('item',map('item',src.items as never[],src.sourceVersion));
  await sink.replaceType('skill',map('skill',src.skills as never[],src.sourceVersion));
  await sink.replaceType('currency_nonpremium',map('currency_nonpremium',src.currencies.filter(x=>!x.premium) as never[],src.sourceVersion));
  await sink.replaceType('premium_currency',map('premium_currency',src.currencies.filter(x=>x.premium) as never[],src.sourceVersion));
  await sink.replaceType('reward_bundle',map('reward_bundle',src.rewards as never[],src.sourceVersion));
  await sink.replaceType('companion',map('companion',src.companions as never[],src.sourceVersion));
  await sink.replaceType('entitlement',map('entitlement',src.entitlements as never[],src.sourceVersion));
  await sink.replaceType('pet',map('pet',(src.pets??[]) as never[],src.sourceVersion));
  await sink.replaceType('profile_background',map('profile_background',(src.profileBackgrounds??[]) as never[],src.sourceVersion));
  await sink.replaceType('profile_border',map('profile_border',(src.profileBorders??[]) as never[],src.sourceVersion));
  await sink.replaceType('skin',map('skin',(src.skins??[]) as never[],src.sourceVersion));
  await sink.replaceType('achievement',map('achievement',(src.achievements??[]) as never[],src.sourceVersion));
  await sink.replaceType('title',map('title',(src.titles??[]) as never[],src.sourceVersion));
}
