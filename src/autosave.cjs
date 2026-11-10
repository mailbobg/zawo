'use strict';

// One editor owns one serialized write stream. A successful create supplies the
// identity for every later revision; the latest input wins over queued input.
function createAutosave({id,read,save,initialValue,validate=()=>'',onStatus=()=>{},onSaved=()=>{},preserve,clearPreserved=async()=>{},delay=450}){
 let baseline=JSON.stringify(initialValue===undefined?read():initialValue),timer=null,running=null,disposed=false,paused=false,preservedValue;
 const dirty=()=>JSON.stringify(read())!==baseline;
 function changed(){
  if(disposed||paused)return;clearTimeout(timer);
  onStatus(dirty()?'pending':id?'saved':'draft','');
  if(dirty()||preservedValue!==undefined)timer=setTimeout(()=>{timer=null;flush();},delay);
 }
 async function stash(value,serialized,state,message){if(!preserve){onStatus(state,message);return;}try{await preserve(value,id);preservedValue=serialized;onStatus(state==='invalid'?'draft-saved':'error',state==='invalid'?'Complete the required fields when you are ready.':message+' Your draft is saved.');}catch(error){onStatus('error',String(error.message||error));}}
 function flush(){
  clearTimeout(timer);timer=null;
  if(running)return running;
  if(disposed||paused)return Promise.resolve(false);
  running=(async()=>{
   while(!disposed&&!paused&&dirty()){
    const value=read(),serialized=JSON.stringify(value),invalid=validate(value);
    if(invalid){await stash(value,serialized,'invalid',invalid);if(serialized!==JSON.stringify(read()))continue;return false;}
    onStatus('saving','');
    try{
     const result=await save(value,id);
     if(!result?.id)throw Error('The item could not be saved');
     id=result.id;baseline=serialized;
     // A view refresh is presentation, not a second write. Even if it fails,
     // retain the committed identity so a retry can never create a duplicate.
     try{await onSaved(result);}catch{}
    }catch(error){
     if(!disposed&&serialized!==JSON.stringify(read()))continue;
     if(!disposed)await stash(value,serialized,'error',String(error.message||error));if(!disposed&&serialized!==JSON.stringify(read()))continue;return false;
    }
   }
   if(!disposed&&!paused){try{await clearPreserved(id);preservedValue=undefined;}catch(error){onStatus('error',String(error.message||error));return false;}onStatus(id?'saved':'draft','');}return !disposed&&!paused;
  })().finally(()=>{running=null;});
  return running;
 }
 return {changed,flush,async pause(){paused=true;clearTimeout(timer);timer=null;if(running)await running;},resume(){if(!disposed){paused=false;changed();}},get dirty(){return dirty()||preservedValue!==undefined;},get preserved(){return preservedValue===JSON.stringify(read());},get busy(){return !!running;},get id(){return id;},dispose(){disposed=true;clearTimeout(timer);timer=null;}};
}
module.exports={createAutosave};
