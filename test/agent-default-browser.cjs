// Explicit acceptance: uses the user's signed-in agents and global instructions.
const fs=require('node:fs'),path=require('node:path');const {execFile}=require('node:child_process');const run=require('node:util').promisify(execFile);
process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');
require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({root,browserPanel:browser,browserCLI})=>{
 const cwd=path.join(root,'natural-browser-request');fs.mkdirSync(cwd);const env={...process.env,PATH:path.dirname(browserCLI.command)+path.delimiter+process.env.PATH,ZAWO_BRIDGE_CONFIG:browserCLI.configPath};delete env.NODE_OPTIONS;
 for(const agent of ['codex','claude']){
  const before=browser.tabs.length;const prompt='打开浏览器';
  const args=agent==='codex'?['exec','--ephemeral','--skip-git-repo-check','--sandbox','workspace-write','-c','sandbox_workspace_write.network_access=true','--json',prompt]:['--print','--no-session-persistence','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--settings','{"disableAllHooks":true}','--tools','Bash','--allowedTools','Bash(zawo browser open)',`Bash(${require('node:os').homedir()}/.local/bin/zawo browser open)`,'--max-turns','4',prompt];
  console.log('RUNNING natural-language '+agent);let failure,result;try{const task=run(agent,args,{cwd,env,timeout:120000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});task.child.stdin.end();result=await task;}catch(e){failure=e;result=e;}
  fs.writeFileSync(path.join(__dirname,'../logs/browser-default-agent-'+agent+'.log'),String(result.stdout||'')+'\n'+String(result.stderr||''),{mode:0o600});
  if(failure||browser.tabs.length!==before+1||browser.url!==''||!browser.opened)throw Error(agent+' did not complete natural-language blank-tab request: '+(failure?.code||'browser state unchanged'));
  console.log('PASS '+agent+' followed global rules for “打开浏览器” and created a blank tab');
 }
}};require('../src/main.cjs');
