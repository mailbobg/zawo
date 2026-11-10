// Explicit acceptance run, excluded from npm test because it uses the user's CLI accounts.
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const {execFile}=require('node:child_process');const {promisify}=require('node:util');const run=promisify(execFile);
process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');
require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({root,browserPanel:browser,browserCLI})=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<title>Agent CLI verified</title><h1>'+req.url+'</h1>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const cwd=path.join(root,'agent-smoke');fs.mkdirSync(cwd);const env={...process.env,PATH:path.dirname(browserCLI.command)+path.delimiter+process.env.PATH,ZAWO_BRIDGE_CONFIG:browserCLI.configPath};
 try{for(const agent of ['codex','claude']){
  const url=`http://127.0.0.1:${server.address().port}/${agent}`,command=`${browserCLI.command} browser open ${url}`;
  const prompt=`This is an authorized browser CLI smoke test. Run exactly this shell command once: ${command}\nDo not read files, edit anything, use other tools, or run additional commands. Report its output and stop.`;
  const args=agent==='codex'?['exec','--ephemeral','--skip-git-repo-check','--sandbox','workspace-write','-c','sandbox_workspace_write.network_access=true','--json',prompt]:['--print','--no-session-persistence','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--settings','{"disableAllHooks":true}','--tools','Bash','--allowedTools',`Bash(${browserCLI.command} browser open *)`,'--max-turns','3',prompt];
  console.log('RUNNING '+agent+' browser CLI acceptance');
  let failure=null,output;try{const task=run(agent,args,{cwd,env,timeout:120000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});task.child.stdin.end();output=await task;}catch(e){failure=e;output=e;}
  fs.writeFileSync(path.join(__dirname,`../logs/browser-cli-agent-${agent}.log`),String(output.stdout||'')+'\n'+String(output.stderr||''),{mode:0o600});
  const end=Date.now()+10000;while((browser.url!==url||browser.loading)&&Date.now()<end)await new Promise(r=>setTimeout(r,50));
  if(browser.url!==url||browser.title!=='Agent CLI verified')throw Error(agent+' did not open the preview; '+(failure?.code||'see bounded CLI log'));
  console.log('PASS '+agent+' invoked the command and the right-hand browser rendered '+await browser.view.webContents.executeJavaScript('document.querySelector("h1").textContent'));
  if(failure)throw Error(agent+' opened the page but did not exit cleanly: '+failure.code);
 }}finally{await new Promise(r=>server.close(r));}
}};
require('../src/main.cjs');
