/** Existing chat rows contain a historical snapshot; current account names win.
 * System messages and accounts unavailable to the viewer keep their snapshot.
 */
export type ChatSenderRow={account_id:string|null;sender_name:string};
export type CurrentChatSenderName={account_id:string;sender_name:string};
export function projectChatSenderNames<T extends ChatSenderRow>(
 rows:readonly T[],current:readonly CurrentChatSenderName[],
):T[]{
 const byAccount=new Map<string,string>();
 for(const row of current){
  const name=typeof row.sender_name==='string'?row.sender_name.trim():'';
  if(row.account_id&&name)byAccount.set(row.account_id,name);
 }
 return rows.map(row=>{
  const name=row.account_id?byAccount.get(row.account_id):undefined;
  return name&&name!==row.sender_name?{...row,sender_name:name}:row;
 });
}
