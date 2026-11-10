const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

// Regression: a focused empty field must not paint its title twice, and
// required markers must survive the transition from hint to border label.
module.exports=async({window,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true);
 // CSS :focus requires an active WebContents, not just activeElement. A
 // system authorization window or another test window can take that focus.
 window.show();window.focus();window.webContents.focus();
 await until(()=>js('document.hasFocus()'));
 const click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const inspect=(selector,phase,value='')=>js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),l=e.closest('label');e.value=${JSON.stringify(value)};e.${phase==='focus'?'focus':'blur'}();const label=getComputedStyle(l,'::before'),hint=getComputedStyle(e,'::placeholder');return {label:label.display!=='none',title:label.content,hintHidden:hint.color==='rgba(0, 0, 0, 0)'||hint.opacity==='0',value:e.value};})()`);
 const open=async(view,button)=>{await click('[data-view="'+view+'"]');await until(()=>js(`!!document.querySelector(${JSON.stringify(button)})`));await click(button);};
 const close=async()=>{await click('.drawer-footer .button');await until(()=>js('document.querySelector("#drawer-layer").hidden'));};
 const check=async(selector,title)=>{
  let s=await inspect(selector,'blur');assert.equal(s.label,false,selector+' empty blur: no floating label');assert.equal(s.hintHidden,false,selector+' empty blur: hint visible');
  s=await inspect(selector,'focus');assert.equal(s.hintHidden,true,selector+' empty focus: hint disappears');assert.equal(s.label,true);assert.equal(s.title,JSON.stringify(title));
  s=await inspect(selector,'blur','123');assert.equal(s.label,true,selector+' filled blur: label remains');assert.equal(s.value,'123');
  s=await inspect(selector,'focus');assert.equal(s.label,true,selector+' cleared focus: label remains');assert.equal(s.hintHidden,true);
  s=await inspect(selector,'blur');assert.equal(s.label,false,selector+' cleared blur: hint returns');assert.equal(s.hintHidden,false);
 };
 await open('forwarding','#new-tunnel');
 for(const [name,title] of [['name','Label'],['bindPort','Local port number *'],['bindAddress','Bind address'],['targetAddress','Destination address *'],['targetPort','Destination port number *']])await check('#tunnel-form [name="'+name+'"]',title);
 await click('[data-forward-type="remote"]');await check('#tunnel-form [name="bindPort"]','Remote port number *');
 await click('[data-forward-type="dynamic"]');await check('#tunnel-form [name="bindPort"]','Local port number *');
 await click('[data-forward-type="local"]');
 const select=await js(`(()=>{const e=document.querySelector('#tunnel-form [name="hostId"]');e.focus();return {hint:getComputedStyle(e).color,label:getComputedStyle(e.closest('label'),'::before').content,option:getComputedStyle(e.options[0]).color};})()`);
 assert.equal(select.hint,'rgba(0, 0, 0, 0)');assert.equal(select.label,'"Intermediate host *"');assert.notEqual(select.option,select.hint,'native menu options remain readable');
 await inspect('#tunnel-form [name="bindPort"]','focus');
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 fs.writeFileSync(path.join(__dirname,'../shots/field-states-forwarding.png'),(await window.webContents.capturePage()).toPNG());
 await close();
 await open('snippets','#new-snippet');await check('#snippet-form [name="command"]','Script *');
 for(const phase of ['focus','blur']){const s=await inspect('#snippet-form [name="name"]',phase);assert.equal(s.label,true,'description label stays visible');assert.equal(s.hintHidden,false,'example is not a duplicate field title');}
 await inspect('#snippet-form [name="command"]','focus');
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 fs.writeFileSync(path.join(__dirname,'../shots/field-states-snippet.png'),(await window.webContents.capturePage()).toPNG());
 await close();
 await open('hosts','#new-host');
 const group=await js(`(()=>{const e=document.querySelector('#host-form [name="groupId"]');e.focus();return getComputedStyle(e.closest('label'),'::before').display;})()`);
 assert.equal(group,'none','empty Parent Group must not duplicate its title above the selection');
 for(const name of ['address','label','username','credential'])for(const phase of ['focus','blur']){const s=await inspect('#host-form [name="'+name+'"]',phase);assert.equal(s.label,false,name+' keeps reference inline hint');assert.equal(s.hintHidden,false);}
 await close();
 await open('keychain','#new-key');await check('#key-form [name="passphrase"]','Passphrase');await close();
 pass('editor fields avoid duplicate focused hints, preserve required labels and restore empty hints after blur');
 pass('host inline hints and snippet persistent description labels follow their distinct reference behavior');
};

if(require.main===module||path.resolve(process.argv[1]||'')===__filename){
 process.argv.push('--self-test');
 const entry=require.resolve('./integration.cjs');
 require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({window})=>{
  const until=async fn=>{for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Field state check timed out');};
  await until(()=>window.webContents.executeJavaScript('!!document.querySelector("#new-host")'));
  await module.exports({window,until,pass:m=>console.log('PASS '+m)});
 }};
 require('../src/main.cjs');
}
