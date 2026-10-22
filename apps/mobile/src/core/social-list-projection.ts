/** The Friends screen collects cosmetic IDs only from authorized friend/request rows.
 * Blocked identities are intentionally excluded from the public icon lookup.
 */
export function socialListIdentityIds(
 friends:readonly {account_id:string}[],
 requests:readonly {account_id:string}[],
):string[]{
 return [...new Set([...friends,...requests].map(row=>row.account_id).filter(Boolean))];
}
export function withSocialListIdentities<T extends {account_id:string},V extends object>(
 rows:readonly T[],identities:ReadonlyMap<string,V>,
):Array<T&Partial<V>>{
 return rows.map(row=>({...row,...identities.get(row.account_id)}));
}
