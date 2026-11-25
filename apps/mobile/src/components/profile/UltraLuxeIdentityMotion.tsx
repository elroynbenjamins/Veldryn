import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {Animated,Text,type StyleProp,type TextStyle} from 'react-native';
import {SIGNATURE_CURVE_PHASE,SIGNATURE_TITLE_OPACITY} from '../../core/ultra-luxe-motion';
type Context={clock:Animated.Value;fullSet:boolean};
const IdentityMotion=createContext<Context|null>(null);
export function UltraLuxeIdentityMotionProvider({clock,fullSet,active=true,children}:{clock:Animated.Value;fullSet:boolean;active?:boolean;children:ReactNode}){
 const value=useMemo(()=>active?{clock,fullSet}:null,[clock,fullSet,active]);
 return <IdentityMotion.Provider value={value}>{children}</IdentityMotion.Provider>;
}
export function useUltraLuxeIdentityMotion(){return useContext(IdentityMotion);}
export function UltraLuxeTitleText({title,color,style,verified}:{title:string;color:string;style?:StyleProp<TextStyle>;verified:boolean}){
 const motion=useUltraLuxeIdentityMotion();
 if(!verified||!motion)return <Text numberOfLines={1} style={[style,{color}]}>{title}</Text>;
 const opacity=motion.clock.interpolate({inputRange:[...SIGNATURE_CURVE_PHASE],outputRange:SIGNATURE_TITLE_OPACITY});
 return <Animated.Text numberOfLines={1} style={[style,{color,opacity,textShadowColor:color,textShadowRadius:motion.fullSet?3:1,textShadowOffset:{width:0,height:0}}]}>{title}</Animated.Text>;
}
