import {createContext,useContext,type ReactNode} from 'react';
import {StyleSheet} from 'react-native';

const ChatViewportContext=createContext(false);
export function ChatViewport({children}:{children:ReactNode}){return <ChatViewportContext.Provider value>{children}</ChatViewportContext.Provider>}
export function useChatViewportStyle(){return useContext(ChatViewportContext)?styles.fill:undefined;}
const styles=StyleSheet.create({fill:{flex:1,minHeight:0,maxHeight:'100%'}});
