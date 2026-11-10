const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async({window,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 await until(()=>js('!!document.querySelector("#new-host")'));
 const host=await js(`window.harbor.saveHost({label:'Delete fixture',address:'127.0.0.1',username:'fixture',port:22,auth:'password'})`);
 const reload=async()=>{window.reload();await until(()=>js('!!document.querySelector("#new-host")'));};
 await reload();await click(`.edit-host[data-id="${host.id}"]`);
 await js(`const input=document.querySelector('#host-form [name=label]');input.value='Queued deletion edit';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#delete-host').click()`);
 assert.equal(await js('!!document.querySelector("dialog[open]")'),false,'delete must not open a confirmation');
 await until(()=>js(`window.harbor.snapshot().then(s=>!s.hosts.some(h=>h.id===${JSON.stringify(host.id)}))`));
 await new Promise(r=>setTimeout(r,600));
 assert.equal(await js(`window.harbor.snapshot().then(s=>s.hosts.some(h=>h.id===${JSON.stringify(host.id)}))`),false,'autosave must not resurrect deletion');
 assert.equal(await js('document.querySelector("#drawer-layer").hidden'),true);
 const api=async(method,value)=>js(`window.harbor.${method}(${JSON.stringify(value)})`);
 const keeper=await api('saveHost',{label:'Protected delete fixture',address:'127.0.0.1',username:'fixture',port:22,auth:'password'});
 const tunnel=await api('saveTunnel',{name:'Delete tunnel',type:'local',hostId:keeper.id,bindAddress:'127.0.0.1',bindPort:12345,targetAddress:'localhost',targetPort:80});
 await reload();await click(`.edit-host[data-id="${keeper.id}"]`);await click('#delete-host');
 await until(()=>js('document.querySelector("#toast")?.textContent.includes("referenced") || document.querySelector("#toast")?.textContent.includes("used")'));
 assert.equal(await js('!!document.querySelector("dialog[open]")'),false);
 assert.ok((await js('window.harbor.snapshot()')).hosts.some(h=>h.id===keeper.id));
 await js(`(()=>{const f=document.querySelector('#host-form');f.elements.label.value='Editable after rejected deletion';f.elements.label.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await until(async()=> (await js('window.harbor.snapshot()')).hosts.some(h=>h.id===keeper.id&&h.label==='Editable after rejected deletion'));
 await click('#close-drawer');
 const group=await api('saveGroup',{name:'Delete group'});
 const snippet=await api('saveSnippet',{name:'Delete snippet',command:'printf fixture'});
 const key=await api('generateKey','Delete key');
 const workspace=await api('saveWorkspace',{name:'Delete workspace',panes:[{id:'one',type:'local',label:'Local'}],layout:'one'});
 const rows=[['forwarding',`[data-tunnel-delete="${tunnel.id}"]`,'tunnels',tunnel.id],['snippets',`[data-delete-snippet="${snippet.id}"]`,'snippets',snippet.id],['keychain',`[data-delete-key="${key.id}"]`,'keys',key.id],['groups',`.delete-group[data-id="${group.id}"]`,'groups',group.id]];
 await reload();
 for(const [view,selector,collection,id] of rows){
  if(view==='groups'){await click('[data-view="hosts"]');await click('#host-options');await click('#manage-groups');}else await click(`[data-view="${view}"]`);
  if(collection==='snippets'){
   await click(`[data-edit-snippet="${id}"]`);
   await js(`(()=>{const f=document.querySelector('#snippet-form');f.elements.name.value='Pending snippet change';f.elements.name.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  await click(selector);
  await until(async()=>!(await js('window.harbor.snapshot()'))[collection].some(x=>x.id===id));
  assert.equal(await js('!!document.querySelector("dialog[open]")'),false,collection+' deletes without modal');
 }
 await click('#new-tab');await click(`[data-delete-workspace="${workspace.id}"]`);
 await until(async()=>!(await js('window.harbor.snapshot()')).workspaces.some(x=>x.id===workspace.id));
 assert.equal(await js('!!document.querySelector("dialog[open]")'),false);
 await api('deleteHost',keeper.id);await click('[data-view="hosts"]');await reload();
 pass('all six library delete actions work without confirmation and dependency rejection keeps the editor usable');
 pass('host deletion is immediate and pending autosave cannot resurrect the record');
};
if(require.main===module||path.resolve(process.argv[1]||'')===__filename){
 process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');
 require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async args=>{const until=async fn=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Delete UI check timed out');};await module.exports({...args,until,pass:m=>console.log('PASS '+m)});}};
 require('../src/main.cjs');
}
