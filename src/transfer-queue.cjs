'use strict';
const {EventEmitter}=require('node:events');const {randomUUID}=require('node:crypto');const {pipeline}=require('node:stream/promises');const {Transform}=require('node:stream');
const pending=j=>['queued','running','paused'].includes(j.status);
class TransferQueue extends EventEmitter{
 constructor({confirmOverwrite=async()=>false}={}){super();this.items=[];this.running=false;this.confirmOverwrite=confirmOverwrite;}
 snapshot(){return this.items.map(({id,label,status,bytes,total,error,sessionId,skipped})=>({id,label,status,bytes,total,error,sessionId,skipped}));}
 changed(){this.emit('change',this.snapshot());}
 add({source,target,paths,directory,label,sessionId,skipLinks=false}){
  if(this.items.filter(pending).length>=100)throw Error('Transfer queue is full');if(!Array.isArray(paths)||!paths.length||paths.length>1000)throw Error('Select 1–1000 files or folders');
  const j={id:randomUUID(),source,target,paths:[...new Set(paths)],directory,label,sessionId,skipLinks:skipLinks===true,status:'queued',bytes:0,total:0,skipped:0,completed:new Set(),completedBytes:0,createdDirectories:new Set(),abort:new AbortController()};this.items.push(j);
  while(this.items.length>200){const index=this.items.findIndex(x=>!pending(x));if(index<0)break;this.items.splice(index,1);}this.changed();queueMicrotask(()=>this.pump());return j.id;
 }
 get(id){const j=this.items.find(j=>j.id===id);if(!j)throw Error('Transfer no longer exists');return j;}
 cancel(id){const j=this.items.find(j=>j.id===id);if(j&&pending(j)){j.pauseRequested=false;j.abort.abort();if(j.status!=='running'){j.status='cancelled';this.changed();}}}
 pause(id){const j=this.get(id);if(!['queued','running'].includes(j.status))return;j.pauseRequested=true;j.abort.abort();if(j.status==='queued'){j.status='paused';this.changed();}}
 resume(id){const j=this.get(id);if(j.status!=='paused')throw Error('Transfer is not paused');j.abort=new AbortController();j.pauseRequested=false;j.status='queued';j.error=undefined;j.bytes=j.completedBytes;this.changed();queueMicrotask(()=>this.pump());}
 retry(id){const j=this.get(id);if(!['error','cancelled'].includes(j.status))throw Error('Only failed or cancelled transfers can be retried');return this.add(j);}
 clearFinished(){this.items=this.items.filter(pending);this.changed();}
 cancelSession(id){for(const j of this.items)if(j.sessionId===id)this.cancel(j.id);}
 close(){for(const j of this.items)this.cancel(j.id);}
 async wait(id){const done=()=>!pending(this.items.find(j=>j.id===id)||{});if(done())return;await new Promise(resolve=>{const fn=()=>{if(done()){this.off('change',fn);resolve();}};this.on('change',fn);});}
 async pump(){if(this.running)return;this.running=true;try{let j;while(j=this.items.find(x=>x.status==='queued')){j.status='running';this.changed();try{await this.run(j);j.status='complete';}catch(e){j.status=j.abort.signal.aborted?(j.pauseRequested?'paused':'cancelled'):'error';j.error=j.status==='error'?e.message:undefined;}this.changed();}}finally{this.running=false;}}
 async step(j,fn,late){j.abort.signal.throwIfAborted();return new Promise((resolve,reject)=>{let done=false;const finish=(error,value)=>{if(done){if(value?.destroy){value.on('error',()=>{});if(value.closed)late?.(value);else{value.once('close',()=>late?.(value));value.destroy();}}else late?.(value);return;}done=true;clearTimeout(timer);j.abort.signal.removeEventListener('abort',cancel);error?reject(error):resolve(value);};const cancel=()=>finish(j.abort.signal.reason||Error('Cancelled'));const timer=setTimeout(()=>finish(Error('File operation timed out')),30000);timer.unref?.();j.abort.signal.addEventListener('abort',cancel,{once:true});Promise.resolve().then(fn).then(v=>finish(null,v),e=>finish(e));});}
 async conflict(j,to){if(j.conflictPolicy)return j.conflictPolicy;const result=await this.step(j,()=>this.confirmOverwrite(to,j));if(result==='skip-all'){j.conflictPolicy='skip';return 'skip';}if(result==='replace-all'){j.conflictPolicy='replace';return 'replace';}if(result==='skip')return 'skip';if(result===true||result==='replace')return 'replace';throw Error('Replacement declined: '+to);}
 async run(j){
  const {source,target,abort}=j,signal=abort.signal,check=()=>signal.throwIfAborted(),entries=[],step=(fn,late)=>this.step(j,fn,late);j.total=0;j.skipped=0;j.bytes=j.completedBytes;
  const dest=await step(()=>target.stat(j.directory));if(!dest.isDirectory)throw Error('Choose a destination directory');
  const walk=async(p,rel,depth=0)=>{check();if(depth>32||entries.length>=10000)throw Error('Directory transfer limit exceeded (10,000 entries / 32 levels)');let s;try{s=await step(()=>source.stat(p));}catch(e){if(j.skipLinks&&e.code==='SYMLINK'){j.skipped++;return;}throw e;}if(!s.isDirectory&&!s.isFile)throw Error('Only regular files and directories can be transferred');entries.push({p,rel,...s});if(s.isDirectory){for(const child of await step(()=>source.list(p)))await walk(source.sep.join(p,child),[...rel,child],depth+1);}else j.total+=s.size;};
  for(const p of j.paths)await walk(p,[source.sep.basename(p)]);this.changed();
  for(const e of entries){
   check();const to=target.sep.join(j.directory,...e.rel);if(j.completed.has(e.p))continue;const existing=await step(()=>target.exists(to));
   if(e.isDirectory){if(existing&&!existing.isDirectory)throw Error('Destination is a file: '+to);if(!existing){await step(()=>target.mkdir(to));j.createdDirectories.add(to);}continue;}
   if(existing?.isDirectory)throw Error('Destination is a directory: '+to);let decision;if(existing){decision=await this.conflict(j,to);if(decision==='skip'){j.skipped++;continue;}}
   const temp=to+'.harbor-'+randomUUID()+'.part';let readable,writable;
   try{
    readable=await step(()=>source.read(e.p));writable=await step(()=>target.write(temp),()=>target.remove(temp).catch(()=>{}));let last=0;
    await pipeline(readable,new Transform({transform:(chunk,encoding,cb)=>{j.bytes+=chunk.length;if(Date.now()-last>100){last=Date.now();this.changed();}cb(null,chunk);}}),writable,{signal});check();
    if(target.metadata)await step(()=>target.metadata(temp,e));
    try{await step(()=>target.publish(temp,to));}catch(error){
     check();const latest=await step(()=>target.exists(to));if(!latest||latest.isDirectory)throw error;
     if(!decision||!existing||existing.size!==latest.size||existing.modified!==latest.modified||existing.mode!==latest.mode)decision=await this.conflict(j,to);
     if(decision==='skip'){j.skipped++;continue;}check();await step(()=>target.replace(temp,to));
    }
    j.completed.add(e.p);j.completedBytes+=e.size;
   }finally{readable?.destroy();writable?.destroy();try{await Promise.race([(async()=>{if(await target.exists(temp))await target.remove(temp);})(),new Promise(r=>{const t=setTimeout(r,1000);t.unref?.();})]);}catch{}}
   this.changed();
  }
  for(const e of [...entries].reverse())if(e.isDirectory){const to=target.sep.join(j.directory,...e.rel);if(j.createdDirectories.has(to)&&target.metadata)await step(()=>target.metadata(to,e));}
 }
}
module.exports={TransferQueue};
