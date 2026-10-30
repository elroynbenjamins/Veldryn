export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function check(value:boolean,reason:string){if(!value)throw new Error(reason);}
const source=fs.readFileSync('src/components/GatheringActivityList.tsx','utf8');
check(source.includes('card:{minHeight:64'),'Collapsed gathering cards must retain their existing 64px height');
check(source.includes('const [expandedDropId,setExpandedDropId]'),'Drop disclosure is local and starts closed');
check(source.includes('const drops=expanded?gatheringDropPreview(activity,state):[]'),'Drop details must only be built while expanded');
check(source.includes('return <View key={activity.id}'),'The card container is not an outer pressable');
check(source.includes('onPress={start}'),'Existing one-tap resource selection must still work');
check(source.includes('onPress={()=>setExpandedDropId('),'Drops must have a separate toggle handler');
check(source.includes('accessibilityState={{expanded}}'),'Disclosure must expose its expanded state to accessibility services');
check(source.includes('disabled={active||!inCurrentRegion||(!unlocked&&!onNavigate)}'),'The existing gather action gating remains intact');
check(source.includes('drop.kind===\'essence\'?gt(\'base chance\')'),'Botanical essence labels must distinguish base from effective odds');
check(source.includes("drop.kind==='event_discovery'?gt('per event minute')"),'Event minutes must not be described as gathering action odds');
check(source.includes('petArtSource(drop.petId)'),'Pet drops should reuse the compact canonical pet artwork');
check(source.includes('drop.owned'),'Already-owned pets should have a visible status');
console.log('PASS: compact gathering disclosure preserves original card and action behavior');
