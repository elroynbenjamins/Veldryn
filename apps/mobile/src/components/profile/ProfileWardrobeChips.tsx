import {profileT,profileText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {StyleSheet,View} from 'react-native';
import type {WardrobeCategory} from '../../core/profile-wardrobe';
import type {ChipKind} from './ProfileLookPanel';
import {type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {OptionPager,type PagerOption} from '../OptionPager';

/** One category at a time in the pinned header beside the stage, stepped with the arrows,
 * dragged across the middle or picked straight from the dots. The wrapped chip row this
 * replaces cost three lines of a header that has to share the screen with the stage. */
export function ProfileWardrobeChips({categories,chip,onChange,reduceMotion}:{
 categories:readonly WardrobeCategory[];chip:ChipKind;onChange:(next:ChipKind)=>void;reduceMotion?:boolean;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const selected=categories.find(row=>row.kind===chip);
 const options:PagerOption[]=[
  ...categories.map(row=>({key:row.kind,label:profileText(language,row.label),meta:row.owned+'/'+row.total})),
  {key:'badge',label:profileT(language,"Badges")},
 ];
 return <View style={s.root}>
  <OptionPager options={options} value={chip} onChange={next=>onChange(next as ChipKind)}
   accessibilityLabel={profileT(language,"Cosmetic category")}
   previousLabel={profileT(language,"Previous category")} nextLabel={profileT(language,"Next category")}
   reduceMotion={reduceMotion}/>
  {selected?<View accessible accessibilityRole="progressbar" accessibilityValue={{min:0,max:Math.max(1,selected.total),now:Math.min(selected.owned,selected.total)}} accessibilityLabel={profileT(language,'{owned} of {total} unlocked',{owned:selected.owned,total:selected.total})} style={s.bar}>
   <View style={[s.barFill,{width:`${selected.total?Math.round(selected.owned/selected.total*100):0}%`}]}/>
  </View>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:7},
 bar:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:C.panel2},
 barFill:{height:'100%',borderRadius:99,backgroundColor:C.info},
});}
