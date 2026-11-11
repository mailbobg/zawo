// Disposable, isolated manual UI verification; never touches the real profile.
const path=require('node:path');
process.argv.push('--self-test');
const integration=require.resolve('./integration.cjs');
require.cache[integration]={id:integration,filename:integration,loaded:true,exports:async({window,applicationService})=>{
 const js=c=>window.webContents.executeJavaScript(c,true);
 if(process.argv.includes('--split-preview')){
  const until=async fn=>{const end=Date.now()+10000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Preview timed out');};
  await require('./kaku-split-ui.cjs')({window,until,pass:console.log,keepOpen:true});window.show();window.focus();console.log('SPLIT PREVIEW READY');await new Promise(()=>{});
 }
 await js(`document.querySelector('#local-terminal').click()`);
 const end=Date.now()+8000;while(!applicationService.sessions.size&&Date.now()<end)await new Promise(r=>setTimeout(r,30));
 const session=[...applicationService.sessions.keys()][0];
 applicationService.write(session,"printf '\\033[2J\\033[H\\033[32m❯\\033[0m  Zawo · Kaku theme preview\\n\\n\\033[31mError  \\033[32mSuccess  \\033[33mWarning  \\033[34mDirectory  \\033[35mKeyword  \\033[36mLink\\033[0m\\n中文终端 · Local shell · SSH\\n'\r");
 window.show();window.focus();console.log('ISOLATED THEME PREVIEW READY');
 await new Promise(()=>{});
}};
require('../src/main.cjs');
