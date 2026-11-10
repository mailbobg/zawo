const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const {promisify}=require('node:util');const exec=promisify(require('node:child_process').execFile);const {createHash}=require('node:crypto');const {utils}=require('ssh2');const {fixture}=require('./fixture.cjs');
module.exports=async({root,window,applicationService:service,browserPanel:browser,browserCLI,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<title>CLI live preview</title><h1 id="result">CLI preview works</h1><p>'+req.url+'</p>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://localhost:${server.address().port}/cli?from=agent#ready`;
 const remote=path.join(root,'cli-ssh');fs.mkdirSync(remote);const ssh=await fixture(remote);
 try{
  await until(()=>js('!!document.querySelector("#connect-local-host")'));
  window.webContents.send('harbor:event',{kind:'agent-integrations'});await until(()=>js('!!document.querySelector("[data-agent-install=codex]")'));
  const original='# Keep my instructions\n';fs.mkdirSync(path.join(root,'.codex'),{recursive:true});fs.writeFileSync(path.join(root,'.codex/AGENTS.md'),original);
  await click('[data-agent-install=codex]');await until(()=>js('!!document.querySelector("[data-agent-remove=codex]")'));
  assert.ok(fs.readFileSync(path.join(root,'.codex/AGENTS.md'),'utf8').startsWith(original));
  await click('[data-agent-remove=codex]');await until(()=>js('!!document.querySelector("[data-agent-install=codex]:not(:disabled)")'));
  assert.equal(fs.readFileSync(path.join(root,'.codex/AGENTS.md'),'utf8'),original);
  await click('[data-agent-install=claude]');await until(()=>js('!!document.querySelector("[data-agent-remove=claude]")'));
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.writeFileSync(path.join(__dirname,'../shots/ai-tool-integrations.png'),(await window.webContents.capturePage()).toPNG());
  await click('#close-agent-integrations');pass('Bundled AI integration UI configures and removes global rules without changing existing instructions');

  await exec(browserCLI.command,['browser','open',url],{env:{...process.env,ZAWO_BRIDGE_CONFIG:browserCLI.configPath}});
  await until(()=>browser.title==='CLI live preview'&&!browser.loading);
  assert.equal(await js('document.querySelector("#browser-panel").hidden'),false);
  assert.equal(await browser.view.webContents.executeJavaScript('document.querySelector("#result").textContent'),'CLI preview works');
  const previousTab=browser.activeId,tabCount=browser.tabs.length;
  await exec(browserCLI.command,['browser','open'],{env:{...process.env,ZAWO_BRIDGE_CONFIG:browserCLI.configPath}});
  await until(()=>js('document.querySelector("#browser-address")===document.activeElement').catch(()=>false));
  assert.equal(browser.url,'');assert.equal(browser.tabs.length,tabCount+1);assert.equal(browser.view,null);assert.equal(browser.opened,true);
  assert.equal(browser.tabs.find(t=>t.id===previousTab).url,url);
  pass('No-URL CLI opens a blank browser tab, focuses its address field and preserves the loaded page');

  await click('#connect-local-host');const local=await js('document.querySelector(".terminal-pane").dataset.session');
  service.write(local,`zawo browser open '${url.replace('/cli?','/local-terminal?')}'\n`);await until(()=>browser.url.includes('/local-terminal?'));
  await click('[data-close-tab]');await until(()=>service.sessions.size===0);await click('[data-view="hosts"]');
  pass('CLI subprocess and local PTY command open a real webpage in the right-hand browser');
  const host=service.store.saveHost({label:'CLI remote fixture',address:'127.0.0.1',port:ssh.port,username:'fixture',credential:'throwaway-password',saveCredential:true});service.store.trust(`127.0.0.1:${ssh.port}`,'SHA256:'+createHash('sha256').update(utils.parseKey(ssh.hostKey).getPublicSSH()).digest('base64').replace(/=+$/,''));
  window.reload();await until(()=>js(`!!document.querySelector('.connect-host[data-id="${host.id}"]')`));await click(`.connect-host[data-id="${host.id}"]`);await until(()=>js('!!document.querySelector(".terminal-pane")'));const session=await js('document.querySelector(".terminal-pane").dataset.session');
  await js(`document.querySelector('.pane-header').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))`);await click('[data-menu-action="browser-cli"]');await until(()=>js('!!document.querySelector("#enable-cli-browser")'));await click('#enable-cli-browser');await until(()=>js('!!document.querySelector("#cli-activation textarea")?.value'));
  const activation=await js('document.querySelector("#cli-activation textarea").value');assert.ok(!activation.includes('Bearer'));
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.writeFileSync(path.join(__dirname,'../shots/remote-cli-setup.png'),(await window.webContents.capturePage()).toPNG());
  await click('#close-cli-setup');service.write(session,`${activation}\nzawo browser open '${url.replace('/cli?','/remote-terminal?')}'\n`);
  await until(()=>browser.url.includes('/remote-terminal?')&&!browser.loading&&browser.title==='CLI live preview');
  assert.notEqual(new URL(browser.url).port,String(server.address().port));assert.equal(browser.link.ephemeral,true);assert.equal(service.store.snapshot().tunnels.length,0);
  assert.equal(await browser.view.webContents.executeJavaScript('document.querySelector("#result").textContent'),'CLI preview works');
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');fs.writeFileSync(path.join(__dirname,'../shots/remote-cli-preview.png'),(await window.webContents.capturePage()).toPNG());
  await click('[data-close-tab]');await until(()=>browser.link?.status==='stopped');assert.equal(browser.view.getVisible(),false);assert.equal(await js('document.querySelector("#browser-reconnect").hidden'),true);assert.equal(await js('document.querySelector("#browser-message").textContent'),'SSH session closed');
  await click('#toggle-browser');service.store.deleteHost(host.id);await click('[data-view="hosts"]');window.reload();await until(()=>js('!!document.querySelector("#new-host")'));
  pass('SSH setup, remote CLI command, ephemeral HTTP forwarding and disconnect cleanup work through the rendered app');
 }finally{await ssh.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
};
if(require.main===module||path.resolve(process.argv[1]||'')===__filename){process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async args=>{const until=async fn=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Browser CLI UI check timed out');};await module.exports({...args,until,pass:m=>console.log('PASS '+m)});}};require('../src/main.cjs');}
