const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({window,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const color=(s,p='backgroundColor')=>js(`getComputedStyle(document.querySelector(${JSON.stringify(s)}))[${JSON.stringify(p)}]`);
 const shot=async name=>{await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.mkdirSync(path.join(__dirname,'../shots'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../shots/findmy-'+name+'.png'),(await window.webContents.capturePage()).toPNG());};
 await until(()=>js(`!!document.querySelector('#new-host')`));
 assert.equal(await color('#page'),'rgba(0, 0, 0, 0)');
 assert.equal(await color('.sidebar','borderRightWidth'),'0px');
 assert.ok(await js(`document.querySelector('.sidebar').getBoundingClientRect().width>=250`),'wide library sidebar at desktop size');
 assert.equal(await color('.quickbar'),'rgba(0, 0, 0, 0)');
 assert.equal(await color('.nav-item.active'),'rgb(255, 255, 255)');
 await shot('hosts');await click('#new-host');await shot('host-editor');await click('#cancel-host');
 await click('#host-options');await shot('dropdown');await js(`document.body.click()`);
 await click('#local-terminal');await until(()=>js(`!!document.querySelector('.xterm-helper-textarea')`));
 const context=()=>js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);
 for(const theme of ['green','light','dark']){
  await context();await click('[data-menu-action="settings"]');
  await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(theme)};f.requestSubmit();})()`);
  await until(()=>js(`!document.querySelector('#modal').open`));
  assert.equal(await color('#terminal-stage'),theme==='light'?'rgb(244, 245, 243)':'rgb(28, 34, 32)');
  assert.equal(await color('.session-tab.active'),'rgb('+ (theme==='light'?'227, 236, 231':'52, 70, 61') +')');
  assert.equal(await color('.xterm-viewport'),await color('#terminal-stage'),'xterm canvas and surrounding panes must match after live theme changes');
  await context();await shot('terminal-'+theme+'-menu');await click('[data-menu-action="find"]');
  assert.equal(await color('#terminal-search'),theme==='light'?'rgb(237, 241, 238)':'rgb(39, 46, 42)');
  await shot('terminal-'+theme);await click('#terminal-search button[aria-label="Close search"]');
 }
 await context();await click('[data-menu-action="settings"]');await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value='green';f.requestSubmit();})()`);await until(()=>js(`!document.querySelector('#modal').open`));
 await click('[data-close-tab]');await click('[data-view="hosts"]');
 const ratios=await js(`(()=>{const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(),l=c=>{const a=c.match(/\\w\\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;},ratio=(a,b)=>{const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};return {text:ratio(v('--text'),v('--canvas')),secondary:ratio(v('--muted'),v('--selection')),button:ratio('#ffffff',v('--accent')),terminal:ratio(v('--terminal-text'),v('--terminal-bg')),terminalSecondary:ratio(v('--terminal-muted'),v('--terminal-surface')),focus:ratio(v('--terminal-accent'),v('--terminal-bg'))};})()`);
 for(const [name,ratio]of Object.entries(ratios))assert.ok(ratio>=4.5,name+' contrast '+ratio);
 fs.writeFileSync(path.join(__dirname,'../logs/findmy-contrast.json'),JSON.stringify(ratios,null,2));
 pass('Find My palette, seamless sidebar, live dark/light terminal chrome and text contrast');
};
