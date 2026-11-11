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
 // Open two real shells and merge their tabs into a split before theme changes.
 await click('#new-tab');await click('#new-local-session');await until(()=>js(`document.querySelectorAll('.session-tab').length===2`));
 await click('[data-tab]');
 await js(`(()=>{const source=document.querySelectorAll('.session-tab')[1],target=document.querySelector('.terminal-pane'),s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:8,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+80,clientY:s.y+15}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:t.right-4,clientY:t.y+t.height/2}));})()`);
 await until(()=>js(`document.querySelectorAll('.terminal-pane').length===2`));
 const context=()=>js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);
 await context();await click('[data-menu-action="settings"]');
 assert.deepEqual(await js(`Array.from(document.querySelector('#terminal-settings').elements.theme.options,o=>[o.value,o.textContent])`),[['dark','Dark'],['light','Light'],['kaku-light','Kaku Light'],['kaku-dark','Kaku Dark']]);
 assert.equal(await js(`document.querySelector('#terminal-settings').elements.theme.value`),'dark','legacy green theme displays as Dark');
 await click('#cancel-settings');
 for(const theme of ['dark','light','kaku-light','kaku-dark']){
  await context();await click('[data-menu-action="settings"]');
  await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(theme)};f.elements.theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>js(`document.body.dataset.terminalTheme===${JSON.stringify(theme)}`));
  assert.equal(await js(`window.harbor.snapshot().then(s=>s.settings.theme)`),theme,'theme saved before closing settings');
  await click('#cancel-settings');
  await until(()=>js(`!document.querySelector('#modal').open`));
  assert.equal(await color('#terminal-stage'),({'kaku-light':'rgb(255, 252, 240)','kaku-dark':'rgb(21, 20, 27)',light:'rgb(244, 245, 243)'})[theme]||'rgb(28, 34, 32)');
  assert.equal(await color('.session-tab.active'),'rgb('+ ({'kaku-light':'232, 230, 219','kaku-dark':'41, 38, 60',light:'227, 236, 231'}[theme]||'52, 70, 61') +')');
  assert.equal(await color('.xterm-viewport'),await color('#terminal-stage'),'xterm canvas and surrounding panes must match after live theme changes');
  assert.ok(await js(`Array.from(document.querySelectorAll('.xterm-viewport')).every(e=>getComputedStyle(e).backgroundColor===getComputedStyle(document.querySelector('#terminal-stage')).backgroundColor)`),'all existing split panes update');
  await context();await shot('terminal-'+theme+'-menu');await click('[data-menu-action="find"]');
  assert.equal(await color('#terminal-search'),({'kaku-light':'rgb(255, 252, 240)','kaku-dark':'rgb(31, 29, 40)',light:'rgb(237, 241, 238)'})[theme]||'rgb(39, 46, 42)');
  await shot('terminal-'+theme);await click('#terminal-search button[aria-label="Close search"]');
 }
 await click('#new-tab');await click('#new-local-session');await until(()=>js(`document.querySelectorAll('.session-tab').length===2`));
 assert.equal(await color('.xterm-viewport'),'rgb(21, 20, 27)','new terminal inherits Kaku Dark');
 await click('.session-tab.active [data-close-tab]');
 await context();await click('[data-menu-action="settings"]');await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value='dark';f.requestSubmit();})()`);await until(()=>js(`!document.querySelector('#modal').open`));
 await click('[data-close-tab]');await click('[data-view="hosts"]');
 const ratios=await js(`(()=>{const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(),l=c=>{const a=c.match(/\\w\\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;},ratio=(a,b)=>{const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};return {text:ratio(v('--text'),v('--canvas')),secondary:ratio(v('--muted'),v('--selection')),button:ratio('#ffffff',v('--accent')),terminal:ratio(v('--terminal-text'),v('--terminal-bg')),terminalSecondary:ratio(v('--terminal-muted'),v('--terminal-surface')),focus:ratio(v('--terminal-accent'),v('--terminal-bg'))};})()`);
 for(const [name,ratio]of Object.entries(ratios))assert.ok(ratio>=4.5,name+' contrast '+ratio);
 fs.writeFileSync(path.join(__dirname,'../logs/findmy-contrast.json'),JSON.stringify(ratios,null,2));
 pass('Four palettes including Kaku Light/Dark, automatic theme saving, live split updates, new terminal inheritance and contrast');
};
