import {Component,type ReactNode} from 'react';
import {Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

type Props={name:string;body:string;children:ReactNode};
type State={failed:boolean};

/** A broken cosmetic row must not take down its entire Guild conversation. */
export class ChatRowErrorBoundary extends Component<Props,State> {
 state:State={failed:false};
 static getDerivedStateFromError():State {return {failed:true};}
 render(){
  return this.state.failed?<PlainChatRow name={this.props.name} body={this.props.body}/>:this.props.children;
 }
}

function PlainChatRow({name,body}:{name:string;body:string}){
 const C=useGameTheme();
 return <View style={{paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2}}>
  <Text style={{color:C.info,fontWeight:'800'}}>{name}</Text>
  <Text style={{color:C.text}}>{body}</Text>
 </View>;
}
