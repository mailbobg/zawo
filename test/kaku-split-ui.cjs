const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({window,until,pass,keepOpen=false})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const open=async()=>{await click('#new-tab');await click('#new-local-session');await until(()=>js(`!!document.querySelector('.xterm-helper-textarea')`));};
 const theme=async value=>{
  await js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);
  await click('[data-menu-action="settings"]');
  await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(value)};f.elements.theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>js(`document.body.dataset.terminalTheme===${JSON.stringify(value)}`));await click('#cancel-settings');
 };
 const merge=async(tabIndex,paneIndex,edge)=>{
  await js(`(()=>{const source=document.querySelectorAll('.session-tab')[${tabIndex}],target=document.querySelectorAll('.terminal-pane')[${paneIndex}],s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:81,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+80,clientY:s.y+15}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:${edge==='right'?'t.right-4':'t.x+t.width/2'},clientY:${edge==='right'?'t.y+t.height/2':'t.bottom-4'}}));})()`);
 };
 await open();await open();await open();await click('[data-tab]');
 await merge(1,0,'right');await until(()=>js(`document.querySelectorAll('.terminal-pane').length===2`));
 await merge(1,1,'bottom');await until(()=>js(`document.querySelectorAll('.terminal-pane').length===3`));
 for(const value of ['kaku-dark','kaku-light']){
  await theme(value);
  const styles=await js(`(()=>{const panes=[...document.querySelectorAll('.terminal-pane')].map(p=>{const s=getComputedStyle(p),h=p.querySelector('.pane-header');return {border:s.borderTopWidth,radius:s.borderRadius,header:getComputedStyle(h).position,label:getComputedStyle(h.querySelector('.pane-label')).display};});const dividers=[...document.querySelectorAll('.split-divider')].map(d=>{const s=getComputedStyle(d,'::after');return {direction:d.classList.contains('row')?'row':'column',width:s.width,height:s.height,color:s.backgroundColor};});return {panes,dividers};})()`);
  for(const p of styles.panes)assert.deepEqual(p,{border:'0px',radius:'0px',header:'absolute',label:'none'});
  const dragAreas=await js(`Array.from(document.querySelectorAll('.terminal-pane')).map(p=>{const h=p.querySelector('.pane-header'),r=h.getBoundingClientRect(),pane=p.getBoundingClientRect(),text=p.querySelector('.xterm-screen').getBoundingClientRect();return {fullWidth:Math.abs(r.width-pane.width)<1,clearOfText:r.bottom<=text.top,leftHit:document.elementFromPoint(r.left+12,r.top+8)===h,centerHit:document.elementFromPoint(r.left+r.width/2,r.top+8)===h};})`);
  for(const area of dragAreas)assert.deepEqual(area,{fullWidth:true,clearOfText:true,leftHit:true,centerHit:true});
  assert.equal(styles.dividers.length,2);
  assert.ok(await js(`Array.from(document.querySelectorAll('.workspace-split')).every(e=>getComputedStyle(e).overflow==='visible')`),'nested divider joins must not be clipped');
  assert.equal(await js(`getComputedStyle(document.querySelector('.split-divider.column'),'::after').left`),'-5px','horizontal line reaches the vertical midpoint');
  for(const d of styles.dividers){assert.equal(d.direction==='row'?d.width:d.height,'1px');assert.notEqual(d.color,'rgba(0, 0, 0, 0)');}
  // A generous invisible hit area still resizes each one-pixel divider.
  for(const orientation of ['row','column']){
   const selector='.split-divider.'+orientation;
   const before=await js(`document.querySelector('${selector}').getAttribute('aria-valuenow')`);
   await js(`(()=>{const d=document.querySelector('${selector}'),r=d.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,base={bubbles:true,cancelable:true,pointerId:82,isPrimary:true,pointerType:'mouse',button:0};d.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:x,clientY:y}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:x+${orientation==='row'?35:0},clientY:y+${orientation==='column'?35:0}}));})()`);
   await until(()=>js(`document.querySelector('${selector}').getAttribute('aria-valuenow')!==${JSON.stringify(before)}`));
  }
  const ids=await js(`Array.from(document.querySelectorAll('.terminal-pane')).map(p=>p.dataset.session)`);
  for(let i=0;i<ids.length;i++)await js(`window.harbor.input(${JSON.stringify(ids[i])},${JSON.stringify("printf '\\033[2J\\033[HKaku pane "+(i+1)+" · \\033[32mready\\033[0m\\n'\n")})`);
  await until(()=>js(`Array.from(document.querySelectorAll('.xterm-accessibility-tree')).every(e=>e.textContent.includes('ready'))`));
  await js(`document.querySelector('.xterm-helper-textarea').focus()`);
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  fs.writeFileSync(path.join(__dirname,'../shots/'+value+'-seamless-split.png'),(await window.webContents.capturePage()).toPNG());
 }
 pass('Kaku continuous canvas: three live panes, no outer frames or title rows, 1px horizontal/vertical separators and working resize');
 if(keepOpen)return;
 await theme('green');assert.equal(await js(`getComputedStyle(document.querySelector('.terminal-pane')).borderRadius`),'10px','original theme keeps its layout');
 await click('.session-tab.active [data-close-tab]');await click('[data-view="hosts"]');
};
