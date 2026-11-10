'use strict';
const fs=require('node:fs');const path=require('node:path');const {randomUUID}=require('node:crypto');
const START='<!-- Zawo browser integration: start -->',END='<!-- Zawo browser integration: end -->';
const rules=`## Default browser: Zawo
When the user says “打开浏览器” / “open the browser”, open a new tab in the Zawo right-hand browser by running \`zawo browser open\` with no URL. Do not ask for a URL or choose a website for this request.
When the user asks to open a website or preview a page, run \`zawo browser open '<full-http-or-https-url>'\` with the requested URL (quote shell arguments safely). Start a development server only when needed for a requested project preview.
Use Zawo by default for opening pages. Use another browser only when the user explicitly requests it. If the command fails, report the error; do not silently fall back to \`open\`, \`xdg-open\`, Safari, Chrome, BrowserOS, or another browser tool.
Use \`zawo\` from PATH first. On this Mac, if it is not found, try \`"$HOME/.local/bin/zawo"\`. In SSH sessions, first enable CLI browser access in Zawo and run the session-specific PATH export before starting the agent; do not substitute a local helper on the remote host.
A successful command confirms Zawo accepted the open request; it does not confirm the webpage loaded. This command opens pages only and does not provide page reading, clicking, screenshots, or browser automation. Respect existing tool permissions; do not bypass them.`;
const block='\n'+START+'\n'+rules+'\n'+END+'\n';
function span(text){const a=text.indexOf(START),b=text.indexOf(END);if(a<0&&b<0)return null;if(a<0||b<a||text.indexOf(START,a+1)>=0||text.indexOf(END,b+1)>=0)throw Error('Zawo rule markers are incomplete or duplicated. Repair them before continuing.');return {start:a>0&&text[a-1]==='\n'?a-1:a,end:b+END.length+(text[b+END.length]==='\n'?1:0)};}
class AgentIntegrations{
 constructor({home,env={}}){this.home=home;this.backupDir=path.join(home,'.config/zawo/integration-backups');const dir=(key,fallback)=>env[key]&&path.isAbsolute(env[key])?env[key]:path.join(home,fallback);const codex=dir('CODEX_HOME','.codex');this.agents=[
  {id:'codex',name:'Codex CLI',path:path.join(codex,fs.existsSync(path.join(codex,'AGENTS.override.md'))?'AGENTS.override.md':'AGENTS.md')},
  {id:'claude',name:'Claude Code',path:path.join(dir('CLAUDE_CONFIG_DIR','.claude'),'CLAUDE.md')},
  {id:'gemini',name:'Gemini CLI',path:path.join(home,'.gemini/GEMINI.md')},
  {id:'opencode',name:'OpenCode',path:path.join(dir('XDG_CONFIG_HOME','.config'),'opencode/AGENTS.md')}
 ];}
 read(file){let stat;try{stat=fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')return {text:'',stat:null};throw e;}if(!stat.isFile()||stat.nlink>1)throw Error('Rules must be a regular file, not a symbolic or hard link.');if(stat.size>1024*1024)throw Error('Rule file is too large to update automatically.');return {text:fs.readFileSync(file,'utf8'),stat};}
 snapshot(){return {rules,agents:this.agents.map(a=>{try{const {text}=this.read(a.path),s=span(text);return {...a,installed:!!s,current:!!s&&text.slice(s.start,s.end)===block,error:''};}catch(e){return {...a,installed:false,current:false,error:e.message};}})};}
 set(id,enabled){const a=this.agents.find(a=>a.id===id);if(!a)throw Error('Unknown AI integration');if(typeof enabled!=='boolean')throw Error('Invalid integration state');const {text,stat}=this.read(a.path),s=span(text);let next=text;if(enabled)next=s?text.slice(0,s.start)+block+text.slice(s.end):text+block;else if(s)next=text.slice(0,s.start)+text.slice(s.end);if(next===text)return this.snapshot();
  fs.mkdirSync(path.dirname(a.path),{recursive:true,mode:0o700});if(stat){fs.mkdirSync(this.backupDir,{recursive:true,mode:0o700});fs.writeFileSync(path.join(this.backupDir,a.id+'-'+randomUUID()+'.md'),text,{mode:0o600,flag:'wx'});}
  const temp=a.path+'.zawo-'+randomUUID();try{fs.writeFileSync(temp,next,{mode:stat?stat.mode&0o777:0o600,flag:'wx'});const check=this.read(a.path);if(check.text!==text||!!check.stat!==!!stat)throw Error('Rule file changed. Retry to preserve the latest edits.');fs.renameSync(temp,a.path);}finally{fs.rmSync(temp,{force:true});}return this.snapshot();
 }
}
module.exports={AgentIntegrations,rules};
