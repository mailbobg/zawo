// Explicit installed-app acceptance. Requires the upgraded app and configured global rules.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const run=require('node:util').promisify(require('node:child_process').execFile);
(async()=>{const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-installed-default-'));try{for(const agent of ['codex','claude']){
 const prompt='打开浏览器',env={...process.env};delete env.NODE_OPTIONS;delete env.ZAWO_BRIDGE_CONFIG;
 const args=agent==='codex'?['exec','--ephemeral','--skip-git-repo-check','--sandbox','workspace-write','-c','sandbox_workspace_write.network_access=true','--json',prompt]:['--print','--no-session-persistence','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--settings','{"disableAllHooks":true}','--tools','Bash','--allowedTools','Bash(zawo browser open)',`Bash(${os.homedir()}/.local/bin/zawo browser open)`,'--max-turns','4',prompt];
 console.log('RUNNING '+agent+' with only: '+prompt);let result,error;try{const task=run(agent,args,{cwd,env,timeout:120000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});task.child.stdin.end();result=await task;}catch(e){result=e;error=e;}
 fs.writeFileSync(path.join(__dirname,'../logs/browser-default-installed-'+agent+'.log'),String(result.stdout||'')+'\n'+String(result.stderr||''),{mode:0o600});if(error)throw Error(agent+' failed: '+error.code);console.log(agent+' exit 0; verify the installed browser tab and log');
}}finally{fs.rmSync(cwd,{recursive:true,force:true});}})().catch(e=>{console.error(e.message);process.exitCode=1;});
