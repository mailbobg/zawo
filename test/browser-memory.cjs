'use strict';
// Real Chromium lifecycle regression and bounded before/after memory probe.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {app}=require('electron');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label)=>{const end=Date.now()+12000;while(Date.now()<end){if(await fn())return;await wait(40);}throw Error('Timed out: '+label);};
process.argv.push('--self-test');
const entry=require.resolve('./integration.cjs');
require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({window:win,browserPanel:browser,root})=>{
 let ticks=0;const measurements=[];
 const ui=js=>win.webContents.executeJavaScript(js,true);
 const measure=label=>{const metrics=app.getAppMetrics(),pids=metrics.map(m=>m.pid);const rss=execFileSync('ps',['-o','rss=','-p',pids.join(',')],{encoding:'utf8'}).trim().split(/\s+/).reduce((a,b)=>a+Number(b),0);measurements.push({label,rssMiB:Math.round(rss/1024),processes:pids.length,livePages:browser.tabs.filter(t=>t.view&&!t.view.webContents.isDestroyed()).length});console.log('MEMORY',JSON.stringify(measurements.at(-1)));};
 const server=http.createServer((req,res)=>{
  if(req.url==='/tick'){ticks++;res.end('ok');return;}
  if(req.url==='/download'){
   res.writeHead(200,{'Content-Disposition':'attachment; filename=memory-fixture.bin','Content-Length':1048576});let n=0;
   const timer=setInterval(()=>{res.write(Buffer.alloc(8192,1));if(++n===128){clearInterval(timer);res.end();}},15);res.on('close',()=>clearInterval(timer));return;
  }
  const respond=()=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':'text/html','Set-Cookie':'release_memory_cookie=retained; Path=/; SameSite=Lax'});
  res.end(`<!doctype html><title>Memory fixture</title><h1>Browser resource fixture</h1><input id="draft"><script>window.buffer=new Uint8Array(64*1024*1024);window.buffer.fill(7);setInterval(()=>fetch('/tick'),200);window.onbeforeunload=()=>false;</script>`);};
  if(req.url==='/delayed')setTimeout(respond,350);else respond();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const loaded=()=>browser.view&&!browser.loading&&browser.title==='Memory fixture';
 try{
  await until(()=>ui("!!document.querySelector('#toggle-browser')"),'app UI');await wait(200);measure('idle');
  browser.open(base+'/a');await until(loaded,'first page');const first=browser.active;
  browser.navigate(base+'/b');await until(()=>loaded()&&browser.url.endsWith('/b'),'second history entry');browser.view.webContents.setZoomFactor(1.2);
  browser.newTab();browser.navigate(base+'/c');await until(loaded,'second heavy tab');await wait(300);measure('two-loaded-tabs');
  const second=browser.active,contents=browser.tabs.map(t=>t.view.webContents),rendererPids=contents.map(w=>w.getOSProcessId());
  await ui("document.querySelector('#toggle-browser').click()");await wait(2200);measure('panel-closed');
  assert.ok(contents.every(w=>w.isDestroyed()),'closing the browser panel must destroy every webpage, not just hide views');
  assert.equal(browser.view,null);assert.equal(browser.opened,false);
  await until(()=>rendererPids.every(pid=>!app.getAppMetrics().some(m=>m.pid===pid)),'webpage renderer processes exit');
  const stopped=ticks;await wait(500);assert.equal(ticks,stopped,'hidden pages must stop fetching');
  console.log('PASS closing panel destroys all webpages and exits their renderer processes');
  await ui("document.querySelector('#toggle-browser').click()");await until(loaded,'resume active tab');
  assert.equal(browser.activeId,second.id);assert.equal(first.view,null,'background tabs must remain unloaded until selected');
  assert.match(await browser.view.webContents.executeJavaScript('document.cookie'),/release_memory_cookie=retained/);
  browser.selectTab(first.id);await until(()=>loaded()&&browser.url.endsWith('/b'),'resume background tab');
  assert.equal(browser.view.webContents.getZoomFactor(),1.2);assert.equal(browser.snapshot().canBack,true);
  await browser.action('back');await until(()=>loaded()&&browser.url.endsWith('/a'),'restored back navigation');
  assert.equal(browser.snapshot().canForward,true);console.log('PASS lazy reopen retains tab identity, cookies, zoom and back/forward history');
  const downloadPath=path.join(root,'memory-fixture.bin');browser.session.once('will-download',(_e,item)=>item.setSavePath(downloadPath));browser.view.webContents.downloadURL(base+'/download');
  await until(()=>browser.downloads.snapshot().some(d=>d.received>0&&!d.done),'download begins');await browser.action('close');
  await until(()=>browser.downloads.snapshot().some(d=>d.state==='completed'),'download finishes while panel is closed');assert.equal(fs.statSync(downloadPath).size,1048576);assert.equal(browser.view,null);
  console.log('PASS active download completes after webpage resources are released');
  for(let i=0;i<3;i++){browser.open();await until(loaded,'repeat open');const wc=browser.view.webContents;await browser.action('close');await until(()=>wc.isDestroyed(),'repeat renderer destroyed');}
  await wait(1000);measure('after-three-reopen-cycles');assert.ok(browser.tabs.every(t=>t.view===null));
  console.log('PASS repeated open/close leaves no live webpage instances');
  browser.open(base+'/delayed');await browser.action('close');await wait(500);assert.equal(browser.view,null);assert.equal(browser.loading,false);
  browser.open();await until(()=>loaded()&&browser.url===base+'/delayed','resume interrupted navigation');
  await browser.action('close');browser.open(base+'/fresh');await until(()=>loaded()&&browser.url===base+'/fresh','rapid close/reopen');
  await wait(400);assert.equal(browser.url,base+'/fresh');assert.equal(browser.error,'');
  console.log('PASS interrupted navigation and rapid reopening cannot resurrect stale webpages');
 }finally{
  fs.mkdirSync(path.resolve('logs'),{recursive:true});const label=process.env.ZAWO_MEMORY_LABEL==='before'?'before':'after';fs.writeFileSync(path.resolve('logs',`browser-memory-${label}.json`),JSON.stringify(measurements,null,2)+'\n');
  browser.dispose();server.closeAllConnections();await new Promise(r=>server.close(r));
 }
}};
require('../src/main.cjs');
