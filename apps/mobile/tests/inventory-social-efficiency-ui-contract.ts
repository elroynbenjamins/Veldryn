const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
const inventory=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
const bulk=fs.readFileSync('src/core/inventory-bulk.ts','utf8');
const friends=fs.readFileSync('src/screens/FriendsScreen.tsx','utf8');
const social=fs.readFileSync('src/online/social.ts','utf8');
const profile=fs.readFileSync('src/online/profile-extension-v43.ts','utf8');
ok(inventory.includes('useMemo(()=>visibleStacks(')&&inventory.includes('useMemo(()=>bulkSelectionSummary('),'Inventory screen memoizes list sorting and selection calculations');
ok(inventory.includes('useMemo(()=>workingTowardInventoryProtectionMap(state),[state])'),'Recipe reservation cache invalidates on any game-state change');
ok(inventory.includes('equipmentSnapshot=useMemo(')&&inventory.includes('equipmentSnapshotRef=useRef(equipmentSnapshot)'),'Equipment summary is not eagerly recomputed on modal interaction');
ok(bulk.includes('if(!stacks.length)return {'),'Empty selection skips recipe reservation work');
ok(friends.includes('friendsOverview()')&&social.includes('client.rpc(\'friend_list\'),client.rpc(\'friend_request_list\'),client.rpc(\'blocked_player_list\')'),'Friends screen loads account lists together');
ok(social.includes('socialListIdentityIds(friendRows,requestRows)')&&social.includes('withSocialListIdentities(friendRows,identities)'),'Social list identity lookup is batched');
ok(friends.includes('Searching doesn\'t mutate friendships')&&!friends.includes('await run(async()=>{const next=await searchPlayers('),'Player search does not reload friends after each query');
ok(profile.includes('pendingPublicProfiles.run(viewer+')&&profile.includes('profile_public_v43'),'Public profiles share in-flight requests only and remain server-authorized');
console.log('PASS inventory and social screen navigation efficiency contracts');
