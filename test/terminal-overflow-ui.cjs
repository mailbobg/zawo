const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({window,applicationService,root,until,pass,keepOpen=false})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const dir=path.join(root,'cursor-list');fs.mkdirSync(dir,{recursive:true});for(let i=0;i<150;i++)fs.writeFileSync(path.join(dir,'entry-'+String(i).padStart(3,'0')),'');
 const originalSize=window.getSize();window.setSize(950,620);
 await click('#local-terminal');await until(()=>applicationService.sessions.size===1);const id=await js(`document.querySelector('.terminal-pane').dataset.session`);
 const theme=async value=>{await js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);await click('[data-menu-action="settings"]');await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(value)};f.elements.theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until(()=>js(`document.body.dataset.terminalTheme===${JSON.stringify(value)}`));await click('#cancel-settings');window.show();window.focus();await js(`document.querySelector('.xterm-helper-textarea').focus()`);};
 const check=async(id,value)=>{
  applicationService.write(id,"printf '\\033[2J\\033[H'; ls -1 '"+dir+"'\r");
  await until(()=>js(`document.querySelector('[data-session=\"'+${JSON.stringify(id)}+'\"] .xterm-rows').textContent.includes('entry-149')`));await new Promise(r=>setTimeout(r,250));
  const geometry=await js(`(()=>{const pane=document.querySelector('[data-session=\"'+${JSON.stringify(id)}+'\"]'),mount=pane.querySelector('.terminal-mount'),screen=pane.querySelector('.xterm-screen'),cursor=pane.querySelector('.xterm-cursor'),m=mount.getBoundingClientRect(),s=screen.getBoundingClientRect(),c=cursor?.getBoundingClientRect(),style=getComputedStyle(mount);return {theme:document.body.dataset.terminalTheme,mountBottom:m.bottom,contentBottom:m.bottom-parseFloat(style.paddingBottom),contentRight:m.right-parseFloat(style.paddingRight),screenBottom:s.bottom,screenRight:s.right,cursorBottom:c?.bottom,cursorRight:c?.right,focus:document.activeElement?.className,mountScroll:mount.scrollTop,padding:style.padding,boxSizing:style.boxSizing};})()`);
  console.log('overflow geometry',JSON.stringify(geometry));
  assert.ok(geometry.cursorBottom<=geometry.contentBottom+1,`${value}: prompt cursor clipped below content area`);
  assert.ok(geometry.screenBottom<=geometry.contentBottom+1,`${value}: terminal row count must fit visible height`);
  assert.ok(geometry.screenRight<=geometry.contentRight+1,`${value}: terminal column count must fit visible width`);
  assert.equal(geometry.mountScroll,0,'browser must not scroll the mount to reveal hidden cursor rows');
 };
 for(const value of ['kaku-light','kaku-dark','dark','light']){await theme(value);await check(id,value);}
 await theme('kaku-light');await click('#new-tab');await click('#new-local-session');await until(()=>applicationService.sessions.size===2);await click('[data-tab]');
 await js(`(()=>{const source=document.querySelectorAll('.session-tab')[1],target=document.querySelector('.terminal-pane'),s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:81,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+60,clientY:s.y+12}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:t.x+t.width/2,clientY:t.bottom-4}));})()`);
 await until(()=>js(`document.querySelectorAll('.terminal-pane').length===2`));window.setSize(760,480);await new Promise(r=>setTimeout(r,250));
 for(const session of applicationService.sessions.keys())await check(session,'resized Kaku split');
 pass('real ls output beyond one screen keeps final prompt cursor visible across four themes and resized split panes');
 if(keepOpen){console.log('OVERFLOW PREVIEW READY');await new Promise(()=>{});}
 await click('.session-tab.active [data-close-tab]');await until(()=>applicationService.sessions.size===0);window.setSize(...originalSize);await new Promise(r=>setTimeout(r,150));
};
