const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {execFile}=require('node:child_process');const {promisify}=require('node:util');const run=promisify(execFile);
const {BrowserCLI}=require('../src/browser-cli.cjs');
test('local CLI opens the requested preview from a subprocess and rejects unauthenticated browser requests',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-cli-'));const opened=[];const bridge=new BrowserCLI({home,open:async request=>{opened.push(request);}});t.after(async()=>{await bridge.close();fs.rmSync(home,{recursive:true,force:true});});await bridge.start();
 const url='http://localhost:3000/demo?q=a%20b#hello';const r=await run(bridge.command,['browser','open',url],{env:{...process.env,HOME:home,ZAWO_BRIDGE_CONFIG:bridge.configPath}});
 assert.equal(JSON.parse(r.stdout).url,url);assert.equal(opened[0].url,url);assert.equal(fs.statSync(bridge.configPath).mode&0o777,0o600);
 const endpoint=`http://127.0.0.1:${bridge.port}/v1/browser/open`;
 assert.equal((await fetch(endpoint,{method:'POST',body:url})).status,401);
 assert.equal((await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${bridge.localToken}`,Origin:'http://untrusted.test'},body:url})).status,403);
 assert.equal((await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${bridge.localToken}`},body:'file:///etc/passwd'})).status,400);
 assert.equal((await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${bridge.localToken}`},body:'http://example.test/'+ 'x'.repeat(9000)})).status,413);
 await assert.rejects(()=>run(bridge.command,['browser','open','@/etc/passwd'],{env:{...process.env,HOME:home,ZAWO_BRIDGE_CONFIG:bridge.configPath}}),/http/);
 assert.equal(opened.length,1);await bridge.close();await assert.rejects(()=>run(bridge.command,['browser','open',url],{env:{...process.env,HOME:home,ZAWO_BRIDGE_CONFIG:bridge.configPath}}),/Zawo|not running|connect/);
});
test('remote helper opens pages through its SSH session, forwards loopback with path intact and revokes on disconnect',async t=>{
 const http=require('node:http');const {fixture}=require('./fixture.cjs');const {Store}=require('../src/store.cjs');const {Service}=require('../src/service.cjs');const {remoteExec}=require('../src/browser-cli.cjs');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-remote-cli-')),remote=path.join(home,'remote');fs.mkdirSync(remote);
 const ssh=await fixture(remote),store=new Store(path.join(home,'store'),null),service=new Service(store,async()=>true,{test:true,cwd:home});let latest;
 const target=http.createServer((req,res)=>res.end('REMOTE_PREVIEW '+req.url));await new Promise(r=>target.listen(0,'127.0.0.1',r));
 const bridge=new BrowserCLI({home,service,open:async request=>{latest=request;}});await bridge.start();
 t.after(async()=>{await bridge.close();service.closeAll();await ssh.close();await new Promise(r=>target.close(r));fs.rmSync(home,{recursive:true,force:true});});
 const host=store.saveHost({label:'SSH fixture',address:'127.0.0.1',port:ssh.port,username:'fixture'}),session=await service.ssh(host.id,{credential:'throwaway-password'});
 const [info,same]=await Promise.all([bridge.enable(session.id),bridge.enable(session.id)]);assert.equal(info.activation,same.activation);
 const entry=service.entry(session.id),scope=bridge.sessions.get(session.id),source=`http://localhost:${target.address().port}/preview?q=yes#fragment`;
 const empty=JSON.parse(await remoteExec(entry.client,`${info.activation}; zawo browser open`));assert.equal(empty.newTab,true);assert.equal(empty.forwarded,false);assert.equal(latest.url,null);assert.equal(scope.forwards.size,0);
 const output=await remoteExec(entry.client,`${info.activation}; zawo browser open '${source}'`);
 const result=JSON.parse(output);assert.equal(result.forwarded,true);assert.equal(latest.sessionId,session.id);assert.equal(latest.remoteName,'SSH fixture');
 assert.equal(new URL(result.url).pathname,'/preview');assert.equal(new URL(result.url).search,'?q=yes');assert.equal(new URL(result.url).hash,'#fragment');
 assert.equal(await (await fetch(result.url)).text(),'REMOTE_PREVIEW /preview?q=yes');
 assert.equal(store.snapshot().tunnels.length,0,'ephemeral preview does not create saved forwarding rules');
 await remoteExec(entry.client,`${info.activation}; zawo browser open 'https://example.com/docs'`);assert.equal(latest.url,'https://example.com/docs');assert.equal(latest.forwardId,null);
 const second=await service.ssh(host.id,{credential:'throwaway-password'}),secondInfo=await bridge.enable(second.id);
 assert.notEqual(info.activation,secondInfo.activation);
 const secondResult=JSON.parse(await remoteExec(service.entry(second.id).client,`${secondInfo.activation}; zawo browser open '${source}'`));
 assert.equal(latest.sessionId,second.id);assert.notEqual(secondResult.url,result.url);
 const port=scope.port,token=scope.token;service.close(session.id);await new Promise(r=>setTimeout(r,50));
 assert.equal(bridge.sessions.size,1);assert.equal((await fetch(`http://127.0.0.1:${bridge.port}/v1/browser/open`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:source})).status,401);
 await assert.rejects(()=>fetch(result.url));await assert.rejects(()=>fetch(`http://127.0.0.1:${port}`));
 assert.equal(await (await fetch(secondResult.url)).text(),'REMOTE_PREVIEW /preview?q=yes');service.close(second.id);await new Promise(r=>setTimeout(r,50));assert.equal(bridge.sessions.size,0);
});
test('CLI setup does not overwrite an unrelated user command',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-conflict-'));fs.mkdirSync(path.join(home,'.local/bin'),{recursive:true});const command=path.join(home,'.local/bin/zawo');fs.writeFileSync(command,'#!/bin/sh\necho unrelated\n');const bridge=new BrowserCLI({home,open:async()=>{throw Error('must not open');}});t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 await assert.rejects(()=>bridge.start(),/unrelated/);assert.equal(fs.readFileSync(command,'utf8'),'#!/bin/sh\necho unrelated\n');await bridge.close();
});

test('no URL opens a new tab locally without accepting blank URL arguments',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-newtab-')),opened=[];const bridge=new BrowserCLI({home,open:async r=>opened.push(r)});t.after(async()=>{await bridge.close();fs.rmSync(home,{recursive:true,force:true});});await bridge.start();const options={env:{...process.env,ZAWO_BRIDGE_CONFIG:bridge.configPath}};
 const r=await run(bridge.command,['browser','open'],options);assert.deepEqual(JSON.parse(r.stdout),{opened:true,newTab:true,forwarded:false});assert.equal(opened[0].url,null);
 await assert.rejects(()=>run(bridge.command,['browser','open',''],options),/http/);assert.equal(opened.length,1);
});
