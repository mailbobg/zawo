// Bounded UI acceptance against a disposable profile and loopback SFTP fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./fixture.cjs');
process.argv.push('--self-test');
const entry=require.resolve('./integration.cjs');
require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({window,root})=>{
 const {dialog}=require('electron'),oldDialog=dialog.showMessageBox;
 const remote=path.join(root,'controls-remote');fs.mkdirSync(remote);fs.writeFileSync(path.join(remote,'alpha.txt'),'a');fs.writeFileSync(path.join(remote,'beta.txt'),'b');
 const server=await fixture(remote),wc=window.webContents,js=c=>wc.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const until=async fn=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('SFTP controls timed out');};
 dialog.showMessageBox=async()=>({response:1});
 try{
  await until(()=>js(`!!document.querySelector('#new-host')`));
  const host=await js(`window.harbor.saveHost({label:'SFTP controls fixture',address:'127.0.0.1',port:${server.port},username:'fixture',auth:'password',saveCredential:true,credential:'throwaway-password'})`);
  await new Promise(resolve=>{wc.once('did-finish-load',resolve);wc.reload();});await until(()=>js(`!!document.querySelector('#new-host')`));
  await click('[data-view="sftp"]');await until(()=>js(`!!document.querySelector('#sftp-host')`));
  await js(`document.querySelector('#sftp-host').value=${JSON.stringify(host.id)};document.querySelector('#sftp-connect-form').requestSubmit()`);
  await until(()=>js(`document.querySelectorAll('#remote-pane .file-row').length===2`));
  await js(`const s=document.querySelector('#remote-pane .file-sort');s.value='name-desc';s.dispatchEvent(new Event('change'))`);
  assert.deepEqual(await js(`Array.from(document.querySelectorAll('#remote-pane .file-name span')).map(e=>e.textContent)`),['beta.txt','alpha.txt']);
  await until(()=>js(`document.querySelector('#toast').hidden`));
  const observations=[];
  for(const width of [1280,900,820]){
   window.setSize(width,800);await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   const problems=await js(`(()=>{const errors=[];for(const side of ['local','remote']){const pane=document.querySelector('#'+side+'-pane'),pb=pane.getBoundingClientRect();for(const selector of ['.file-sort','[data-file-actions]','input[aria-label*="Filter"]']){const e=pane.querySelector(selector),r=e.getBoundingClientRect();if(r.left<pb.left||r.right>pb.right||r.bottom>innerHeight)errors.push(side+' '+selector+' outside pane');}const t=pane.querySelector(side==='local'?'.local-toolbar':'.file-toolbar'),tr=t.getBoundingClientRect();for(const c of t.children){const r=c.getBoundingClientRect();if(r.bottom>tr.bottom+1)errors.push(side+' toolbar child overlap');}}return errors;})()`);
   assert.deepEqual(problems,[],width+' px toolbar controls fit');observations.push({width,problems});
   fs.writeFileSync(path.join(__dirname,'../shots/sftp-polish-'+width+'.png'),(await wc.capturePage()).toPNG());
  }
  await click('#remote-pane [data-file-actions]');assert.ok(await js(`document.querySelector('.file-action-menu')`));
  wc.sendInputEvent({type:'keyDown',keyCode:'Escape'});wc.sendInputEvent({type:'keyUp',keyCode:'Escape'});
  await until(()=>js(`!document.querySelector('.file-action-menu')`));assert.equal(await js(`document.activeElement.dataset.fileActions`),'remote');
  fs.writeFileSync(path.join(__dirname,'../logs/sftp-polish-layout.json'),JSON.stringify(observations,null,2));
  console.log('PASS SFTP sorting updates real listings; both pane controls fit 1280/900/820 px; Escape restores action-button focus');
 }finally{dialog.showMessageBox=oldDialog;await server.close();}
}};
require('../src/main.cjs');
