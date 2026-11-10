'use strict';
const {randomUUID}=require('node:crypto');
const {shell}=require('electron');
class BrowserDownloads {
 constructor({session,owns,changed}){Object.assign(this,{session,owns,changed,items:new Map(),disposed:false});this.listener=(e,item,wc)=>this.start(e,item,wc);session.on('will-download',this.listener);}
 start(e,item,wc){
  if(!this.owns(wc)){e.preventDefault();return;}
  let protocol;try{protocol=new URL(item.getURL()).protocol;}catch{}if(!['http:','https:','blob:'].includes(protocol)){e.preventDefault();return;}
  for(const [id,d] of this.items){if(this.items.size<100)break;if(d.done)this.items.delete(id);}
  if(this.items.size>=100){e.preventDefault();return;}
  item.setSaveDialogOptions({title:'Save download',buttonLabel:'Save'});
  const d={id:randomUUID(),name:item.getFilename(),state:'progressing',received:0,total:item.getTotalBytes(),paused:false,canResume:false,path:'',done:false,item};this.items.set(d.id,d);
  const update=state=>{d.state=state;d.received=item.getReceivedBytes();d.total=item.getTotalBytes();d.paused=item.isPaused();d.canResume=item.canResume();d.path=item.getSavePath();if(!this.disposed)this.changed();};
  item.on('updated',(_e,state)=>update(state));item.once('done',(_e,state)=>{d.done=true;update(state);d.item=null;});this.changed();
 }
 snapshot(){return [...this.items.values()].reverse().map(({id,name,state,received,total,paused,canResume,done})=>({id,name,state,received,total,paused,canResume,done}));}
 action(name,id){const d=this.items.get(id);if(!d)throw Error('Download no longer exists.');
  if(name==='download-reveal'){if(d.state!=='completed'||!d.path)throw Error('Download is not complete.');shell.showItemInFolder(d.path);}
  else if(name==='download-cancel'&&!d.done)d.item.cancel();
  else if(name==='download-pause'&&!d.done){d.item.pause();d.paused=true;}
  else if(name==='download-resume'&&!d.done&&(d.paused||d.canResume)){d.item.resume();d.paused=false;}
  else throw Error('This download action is unavailable.');this.changed();
 }
 dispose(){this.disposed=true;this.session.removeListener('will-download',this.listener);for(const d of this.items.values())if(!d.done)d.item?.cancel();this.items.clear();}
}
module.exports={BrowserDownloads};
