const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
module.exports=async({window,until,pass,applicationService})=>{
 const wc=window.webContents,js=c=>wc.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 await until(()=>js('!!document.querySelector("#new-host")'));
 const before=await js('window.harbor.snapshot()');
 assert.equal(await js('document.querySelectorAll("[data-local-host]").length'),1,'fresh Hosts includes one built-in local host');
 assert.equal(await js('document.querySelector("#host-count").textContent'),String(before.hosts.length+1));
 assert.equal(await js('!!document.querySelector("[data-local-host] .edit-host")'),false,'local entry has no SSH editor');
 await click('#connect-local-host');
 await until(()=>js('!!document.querySelector(".terminal-pane")'));
 const id=await js('document.querySelector(".terminal-pane").dataset.session');
 assert.equal(applicationService.entry(id).type,'local');
 assert.equal(applicationService.connector.leases.size,0,'local entry never opens an SSH connection');
 assert.equal(await js('!!document.querySelector("dialog[open]")'),false,'no credential prompt');
 await js(`window.harbor.input(${JSON.stringify(id)},"printf 'BUILTIN_LOCAL_%s\\n' OK\\n")`);
 await until(()=>js('document.querySelector(".xterm-accessibility-tree")?.textContent.includes("BUILTIN_LOCAL_OK")'));
 await click('[data-close-tab]');await until(()=>js('document.querySelector("#session-count").textContent==="0 active sessions"'));
 await click('[data-view="hosts"]');
 const search=async value=>js(`(()=>{const e=document.querySelector('#search');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input'));})()`);
 for(const value of ['local','This Mac','本机','127.0.0.1']){await search(value);assert.equal(await js('document.querySelectorAll("[data-local-host]").length'),1);}
 await search('unmatched-local-host-fixture');assert.equal(await js('document.querySelectorAll(".host-card").length'),0);await search('');
 await click('#host-layout');assert.equal(await js('!!document.querySelector(".host-grid.list-layout [data-local-host]")'),true);await click('#host-layout');
 const group=await js(`window.harbor.saveGroup({name:'Local host filter fixture'})`);
 const remote=await js(`window.harbor.saveHost({label:'AAAA remote fixture',address:'fixture.invalid',username:'fixture',groupId:${JSON.stringify(group.id)},tags:['fixture-tag']})`);
 const reload=async()=>{await new Promise(r=>{wc.once('did-finish-load',r);wc.reload();});await until(()=>js('!!document.querySelector("#connect-local-host")'));};
 await reload();
 await click('#host-sort');await click('[data-sort="az"]');
 assert.equal(await js('document.querySelector(".host-card").hasAttribute("data-local-host")'),true,'local entry stays first when SSH hosts are sorted');
 await click(`[data-group="${group.id}"]`);assert.equal(await js('!!document.querySelector("[data-local-host]")'),false,'local entry is not a member of SSH groups');await click('#all-hosts');
 await click('#host-tags');await js(`(()=>{const f=document.querySelector('#tag-filter-form');f.querySelector('input').checked=true;f.requestSubmit();})()`);
 assert.equal(await js('!!document.querySelector("[data-local-host]")'),false,'tag filters only show matching hosts');await click('#host-tags');await click('#clear-tags');
 await js(`window.harbor.deleteHost(${JSON.stringify(remote.id)})`);await js(`window.harbor.deleteGroup(${JSON.stringify(group.id)})`);await reload();
 assert.equal(await js('document.querySelectorAll("[data-local-host]").length'),1,'reload does not duplicate built-in card');
 assert.deepEqual((await js('window.harbor.snapshot()')).hosts,before.hosts,'built-in card does not create a stored SSH host');
 assert.equal(applicationService.store.exportLibrary().hosts.length,before.hosts.length,'export contains only configured SSH hosts');
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 fs.writeFileSync(path.join(__dirname,'../shots/local-host-default.png'),(await wc.capturePage()).toPNG());
 pass('built-in local host opens a real local shell without SSH or credentials and releases it on close');
 pass('local host survives reload once, supports search/list view, stays first and respects group/tag filters without polluting exports');
};
if(require.main===module||path.resolve(process.argv[1]||'')===__filename){
 process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');
 require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async args=>{const until=async fn=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Local host UI check timed out');};await module.exports({...args,until,pass:m=>console.log('PASS '+m)});}};
 require('../src/main.cjs');
}
