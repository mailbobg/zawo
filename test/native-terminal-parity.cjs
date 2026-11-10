// Disposable production window for real mouse checks. Never reads the user's profile.
const {app}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'harbor-native-workspace-'));
app.setPath('userData',root);
app.on('browser-window-created',(_event,win)=>{
 win.setSize(1280,1280);
 win.webContents.on('console-message',event=>{if(event.message.startsWith('RESIZE_TRACE '))console.log(event.message);if(event.message.startsWith('WORKSPACE_NATIVE '))fs.writeFileSync(path.join(__dirname,'../logs/terminal-parity-native.json'),event.message.slice(17)+'\n');});
 win.webContents.once('did-finish-load',async()=>{
  const js=code=>win.webContents.executeJavaScript(code,true);
  const until=async fn=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Native setup timed out');};
  await until(()=>js(`!!document.querySelector('#new-host')`));
  await js(`document.querySelector('#local-terminal').click()`);
  await until(()=>js(`!!document.querySelector('.xterm-helper-textarea')`));
  await js(`document.querySelector('#new-tab').click();document.querySelector('#new-local-session').click()`);
  await until(()=>js(`document.querySelectorAll('.session-tab').length===2&&document.body.dataset.view==='terminal'`));
  await js(`for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>console.log('RESIZE_TRACE '+JSON.stringify({type,x:e.clientX,y:e.clientY,target:e.target.className,divider:document.querySelector('.split-divider')?.getBoundingClientRect().toJSON()})),true);window.__nativeInitial=[...document.querySelectorAll('[data-workspace]')].map(e=>e.dataset.workspace);window.__nativeSplitIds=[];const report=()=>{const panes=[...document.querySelectorAll('.terminal-pane')];if(panes.length===2)window.__nativeSplitIds=panes.map(e=>e.dataset.session);console.log('WORKSPACE_NATIVE '+JSON.stringify({tabs:document.querySelectorAll('[data-workspace]').length,panes:panes.length,splitIds:window.__nativeSplitIds,initialTabs:window.__nativeInitial.length,focusMode:!!document.querySelector('.workspace-terminal-list'),ratio:document.querySelector('.split-divider')?.getAttribute('aria-valuenow'),broadcast:[...document.querySelectorAll('.pane-broadcast')].some(b=>b.getAttribute('aria-pressed')==='true')}));};new MutationObserver(report).observe(document.querySelector('#terminal-stage'),{childList:true,subtree:true,attributes:true,attributeFilter:['aria-valuenow']});report();`);
  console.log('NATIVE_WORKSPACE_READY');
 });
});
app.on('will-quit',()=>fs.rmSync(root,{recursive:true,force:true}));
require('../src/main.cjs');
