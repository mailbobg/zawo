const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async({window,until,pass})=>{
 const wc=window.webContents,js=c=>wc.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const key=async(keyCode,modifiers=[])=>{wc.sendInputEvent({type:'keyDown',keyCode,modifiers});wc.sendInputEvent({type:'keyUp',keyCode,modifiers});await new Promise(r=>setTimeout(r,80));};
 await until(()=>js('!!document.querySelector("#new-host")'));
 window.show();window.focus();wc.focus();await until(()=>js('document.hasFocus()'));
 const open=async()=>{await click('#new-tab');await click('#new-local-session');await until(()=>js('document.body.dataset.view==="terminal"'));return js('document.querySelector(".terminal-pane").dataset.session');};
 const first=await open(),second=await open(),third=await open();
 const active=()=>js('document.querySelector(".terminal-pane")?.dataset.session');
 await key('1',['meta']);assert.equal(await active(),first,'Command+1 selects first terminal with xterm focused');
 await key(']',['meta','shift']);assert.equal(await active(),second,'next tab');
 await key('[',['meta','shift']);assert.equal(await active(),first,'previous tab');
 await key('[',['meta','shift']);assert.equal(await active(),third,'previous wraps');
 await key(']',['meta','shift']);assert.equal(await active(),first,'next wraps');
 await key('9',['meta']);assert.equal(await active(),first,'missing tab number is a no-op');
 // Move a real terminal into the first workspace, as in the drag regression.
 await js(`(()=>{const source=document.querySelectorAll('.session-tab')[1],target=document.querySelector('.terminal-pane'),s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:8,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+80,clientY:s.y+15}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:t.right-4,clientY:t.y+t.height/2}));})()`);
 await until(()=>js('document.querySelectorAll(".terminal-pane").length===2'));
 await js(`document.querySelector('[data-session="${first}"] .xterm-helper-textarea').focus()`);
 await key('Right',['meta','alt']);assert.equal(await js('document.activeElement.closest(".terminal-pane")?.dataset.session'),second);
 await key('Left',['meta','alt']);assert.equal(await js('document.activeElement.closest(".terminal-pane")?.dataset.session'),first);
 await key('m',['meta','shift']);assert.equal(await js('!!document.querySelector(".workspace-terminal-list")'),true);
 await key('Right',['meta','alt']);assert.equal(await active(),second,'focus mode switches hidden panes using split layout');
 await key('m',['meta','shift']);assert.equal(await js('document.querySelectorAll(".terminal-pane").length'),2);
 await js(`(()=>{const source=document.querySelectorAll('.session-tab')[1],target=document.querySelector('[data-session="${second}"]'),s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:9,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+80,clientY:s.y+15}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:t.x+t.width/2,clientY:t.bottom-4}));})()`);
 await until(()=>js('document.querySelectorAll(".terminal-pane").length===3'));
 await js(`document.querySelector('[data-session="${second}"] .xterm-helper-textarea').focus()`);
 await key('Down',['meta','alt']);assert.equal(await js('document.activeElement.closest(".terminal-pane")?.dataset.session'),third);
 await key('Up',['meta','alt']);assert.equal(await js('document.activeElement.closest(".terminal-pane")?.dataset.session'),second);
 await js(`document.querySelector('[data-session="${third}"] .pane-header').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))`);
 await click('[data-menu-action="detach"]');await key('1',['meta']);
 pass('real keyboard events switch and wrap terminal tabs, move split focus and toggle workspace view');
 // Ctrl remains terminal input on Mac. Observe the real renderer data stream.

 // UI interception is the regression: none of these may open application views.
 for(const k of ['f','k','t']){await key(k,['control']);assert.equal(await js('document.body.dataset.view'),'terminal');assert.equal(await js('!!document.querySelector("#terminal-search")'),false);}
 await key('f',['meta']);assert.equal(await js('!!document.querySelector("#terminal-search")'),true);await key('Escape');
 await key('l',['meta']);await until(()=>js('document.querySelectorAll(".session-tab").length===3'));
 await key('w',['meta']);await until(()=>js('document.querySelectorAll(".session-tab").length===2'));
 const {Menu}=require('electron');const menu=Menu.getApplicationMenu();assert.equal(menu.getMenuItemById('shortcut-next-tab').accelerator,'Command+Shift+]');
 await key('/', ['meta','shift']);await until(()=>js('document.querySelector("#modal").open'));await key('Escape');
 menu.getMenuItemById('shortcut-help').click();await until(()=>js('!!document.querySelector("#shortcuts-help")'));
 assert.ok(await js('document.querySelector("#shortcuts-help").textContent.includes("⌘⌥")'));
 assert.equal(await js('(()=>{const d=document.querySelector("#modal");return d.scrollHeight>d.clientHeight+1;})()'),false,'help fits the default window without hiding instructions');
 await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 require('node:fs').writeFileSync(path.join(__dirname,'../shots/keyboard-shortcuts.png'),(await wc.capturePage()).toPNG());
 await key('1',['meta']);assert.ok(await js('document.querySelector("#shortcuts-help")'),'shortcuts do not dismiss a dialog');
 await key('Escape');await until(()=>js('!document.querySelector("dialog[open]")'));
 await click('[data-view="hosts"]');await click('#keyboard-shortcuts');await until(()=>js('!!document.querySelector("#shortcuts-help")'));await click('#close-shortcuts');await click('#new-host');await key('1',['meta']);assert.equal(await js('document.querySelector("#drawer-layer").hidden'),false,'navigation respects an open editor');await click('#close-drawer');
 for(let count=2;count>0;count--){await click('[data-close-tab]');await until(()=>js(`document.querySelectorAll('.session-tab').length===${count-1}`));}await until(()=>js('document.querySelector("#session-count").textContent==="0 active sessions"'));
 await click('[data-view="hosts"]');
 pass('terminal control keys stay local; native menus and visible shortcut help expose working bindings');
};
if(require.main===module||path.resolve(process.argv[1]||'')===__filename){process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async args=>{const until=async fn=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Shortcut UI check timed out');};await module.exports({...args,until,pass:m=>console.log('PASS '+m)});}};require('../src/main.cjs');}
