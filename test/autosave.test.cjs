const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAutosave}=require('../src/autosave.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('autosave serializes rapid edits and reuses the created ID',async()=>{
 let value={name:'initial'},release,calls=[],states=[];
 const c=createAutosave({read:()=>({...value}),save:async(v,id)=>{calls.push({v,id});if(calls.length===1)await new Promise(r=>release=r);return {id:id||'one'};},onStatus:s=>states.push(s),delay:10000});
 value={name:'first'};c.changed();const work=c.flush();await tick();
 value={name:'second'};c.changed();value={name:'latest'};c.changed();release();
 assert.equal(await work,true);assert.deepEqual(calls,[{v:{name:'first'},id:undefined},{v:{name:'latest'},id:'one'}]);
 assert.equal(c.dirty,false);assert.equal(states.at(-1),'saved');await c.flush();assert.equal(calls.length,2);c.dispose();
});
test('invalid or failed changes stay dirty and are retryable without replacing saved data',async()=>{
 let value='old',saved='old',fail=true;
 const c=createAutosave({id:'one',read:()=>value,validate:v=>v.trim()?'':'Complete the name',save:async v=>{if(fail)throw Error('disk unavailable');saved=v;return {id:'one'};},delay:10000});
 value='';c.changed();assert.equal(await c.flush(),false);assert.equal(saved,'old');assert.equal(c.dirty,true);
 value='new';c.changed();assert.equal(await c.flush(),false);assert.equal(saved,'old');fail=false;
 assert.equal(await c.flush(),true);assert.equal(saved,'new');assert.equal(c.dirty,false);c.dispose();
});
test('untouched editors do not save; discard cancels queued changes',async()=>{
 let value='old',calls=0;
 const c=createAutosave({read:()=>value,save:async()=>{calls++;return {id:'one'};},delay:5});
 assert.equal(await c.flush(),true);assert.equal(calls,0);value='new';c.changed();c.dispose();await new Promise(r=>setTimeout(r,20));assert.equal(calls,0);
});
test('debounced typing automatically persists the latest value without submit',async()=>{
 let value='',saved;
 const c=createAutosave({read:()=>value,save:async v=>{saved=v;return {id:'one'};},delay:5});
 value='a';c.changed();value='ab';c.changed();await new Promise(r=>setTimeout(r,25));assert.equal(saved,'ab');assert.equal(c.dirty,false);c.dispose();
});
test('an edit made during a failing write is retried as the latest revision',async()=>{
 let value='old',release,calls=0,saved;
 const c=createAutosave({id:'one',read:()=>value,save:async v=>{calls++;if(calls===1){await new Promise(r=>release=r);throw Error('rejected old value');}saved=v;return{id:'one'};},delay:10000});
 value='invalid';c.changed();const work=c.flush();await tick();value='corrected';c.changed();release();assert.equal(await work,true);assert.equal(saved,'corrected');assert.equal(calls,2);c.dispose();
});
test('a name typed during explicit key generation remains dirty against the generated record',async()=>{
 let saved;
 const c=createAutosave({id:'generated',initialValue:{name:'at generation'},read:()=>({name:'typed meanwhile'}),save:async(v,id)=>{saved={...v,id};return{id};}});
 assert.equal(c.dirty,true);assert.equal(await c.flush(),true);assert.deepEqual(saved,{name:'typed meanwhile',id:'generated'});c.dispose();
});
test('invalid drafts can be preserved for closing without becoming runnable records',async()=>{
 let value='ready',saved=0,stashed=[];
 const c=createAutosave({id:'one',read:()=>value,save:async()=>{saved++;return{id:'one'};},validate:v=>v?'':'Required',preserve:async(v,id)=>stashed.push({v,id}),delay:10000});
 value='';c.changed();assert.equal(await c.flush(),false);assert.equal(c.preserved,true);assert.equal(saved,0);assert.deepEqual(stashed,[{v:'',id:'one'}]);value='next';assert.equal(c.preserved,false);assert.equal(await c.flush(),true);assert.equal(saved,1);c.dispose();
});
test('failed draft preservation cannot authorize closing',async()=>{let value='old';const c=createAutosave({read:()=>value,validate:()=> 'Incomplete',save:async()=>({id:'one'}),preserve:async()=>{throw Error('disk unavailable');}});value='new';assert.equal(await c.flush(),false);assert.equal(c.preserved,false);c.dispose();});
test('returning to the saved value clears an older invalid draft before closing',async()=>{let value='saved',draft;const c=createAutosave({id:'one',read:()=>value,validate:v=>v?'':'Incomplete',save:async()=>({id:'one'}),preserve:async v=>{draft=v;},clearPreserved:async()=>{draft=undefined;},delay:10000});value='';await c.flush();assert.equal(draft,'');value='saved';c.changed();assert.equal(c.dirty,true);await c.flush();assert.equal(c.dirty,false);assert.equal(draft,undefined);c.dispose();});
test('deletion pauses queued writes, drains an in-flight write and resumes after rejection',async()=>{
 let value='old',release,calls=[];
 const c=createAutosave({id:'one',read:()=>value,save:async v=>{calls.push(v);if(calls.length===1)await new Promise(r=>release=r);return{id:'one'};},delay:5});
 value='first';const writing=c.flush();await tick();value='queued';c.changed();
 const paused=c.pause();release();await paused;await writing;
 await new Promise(r=>setTimeout(r,20));assert.deepEqual(calls,['first']);
 assert.equal(await c.flush(),false);c.resume();await new Promise(r=>setTimeout(r,20));
 assert.deepEqual(calls,['first','queued']);
 value='deleted';c.changed();await c.pause();c.dispose();await new Promise(r=>setTimeout(r,20));assert.equal(calls.length,2);
});
