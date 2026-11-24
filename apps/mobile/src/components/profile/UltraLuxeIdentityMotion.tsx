import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {Animated,Text,type StyleProp,type TextStyle} from 'react-native';
type Context={clock:Animated.Value;fullSet:boolean};
const IdentityMotion=createContext<Context|null>(null);
export function UltraLuxeIdentityMotionProvider({clock,fullSet,children}:{clock:Animated.Value;fullSet:boolean;children:ReactNode}){
 const value=useMemo(()=>({clock,fullSet}),[clock,fullSet]);
 return <IdentityMotion.Provider value={value}>{children}</IdentityMotion.Provider>;
}
export function useUltraLuxeIdentityMotion(){return useContext(IdentityMotion);}
export function UltraLuxeTitleText({title,color,style,verified}:{title:string;color:string;style?:StyleProp<TextStyle>;verified:boolean}){
 const motion=useUltraLuxeIdentityMotion();
 if(!verified||!motion)return <Text numberOfLines={1} style={[style,{color}]}>{title}</Text>;
 const opacity=motion.clock.interpolate({inputRange:[0,.125,.25,.375,.5,14/24,16/24,19/24,.875,1],outputRange:[.92,1,.92,1,.92,.95,1,.96,1,.92]});
 return <Animated.Text numberOfLines={1} style={[style,{color,opacity,textShadowColor:color,textShadowRadius:motion.fullSet?3:1,textShadowOffset:{width:0,height:0}}]}>{title}</Animated.Text>;
}
