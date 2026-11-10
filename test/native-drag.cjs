// Diagnostic host for native mouse verification. Uses production code with a temporary profile.
const {app}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'harbor-native-drag-'));
app.setPath('userData',root);
app.on('browser-window-created',(_e,win)=>{
 win.webContents.on('console-message',event=>{if(event.message.startsWith('DRAG_'))console.log(event.message);});
 win.webContents.on('did-finish-load',()=>win.webContents.executeJavaScript(`
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','mousedown','mousemove','mouseup','dragstart','dragenter','dragover','drop','dragend','blur']){
  window.addEventListener(type,e=>{if((type==='mousemove'||type==='pointermove')&&!e.buttons)return;console.log('DRAG_TRACE '+JSON.stringify({type,buttons:e.buttons,x:e.clientX,y:e.clientY,target:e.target?.className,tag:e.target?.tagName,workspace:e.target?.closest?.('[data-workspace]')?.dataset.workspace}));},true);
 }
 `));
});
app.on('will-quit',()=>fs.rmSync(root,{recursive:true,force:true}));
require('../src/main.cjs');
