import {useCallback,useEffect,useRef,useState} from 'react';

/** Crafting confirmations live in the existing button, not a toast or modal. */
export type CraftActionOutcome='queued'|'completed';

export type CraftActionFeedback={
  recipeId:string;
  quantity:number;
  phase:'pending'|'success'|'error';
  error?:string;
  outcome?:CraftActionOutcome;
}|null;

export function useCraftActionFeedback(){
  const [feedback,setFeedback]=useState<CraftActionFeedback>(null);
  const inFlight=useRef(false);
  const resetTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(resetTimer.current)clearTimeout(resetTimer.current)},[]);

  const run=useCallback(async(recipeId:string,quantity:number,action:()=>void|CraftActionOutcome|Promise<void|CraftActionOutcome>)=>{
    // Protect repeated taps while a signed command is being saved.
    if(inFlight.current)return;
    inFlight.current=true;
    if(resetTimer.current){clearTimeout(resetTimer.current);resetTimer.current=null;}
    setFeedback({recipeId,quantity,phase:'pending'});
    try{
      const outcome=await action();
      setFeedback({recipeId,quantity,phase:'success',...(outcome?{outcome}:{})});
      resetTimer.current=setTimeout(()=>{
        setFeedback(current=>current?.recipeId===recipeId&&current.phase==='success'?null:current);
        resetTimer.current=null;
      },1200);
    }catch(error){
      setFeedback({recipeId,quantity,phase:'error',error:error instanceof Error?error.message:'Crafting failed. Please retry.'});
    }finally{
      inFlight.current=false;
    }
  },[]);

  return {feedback,run};
}
