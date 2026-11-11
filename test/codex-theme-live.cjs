// Interactive diagnostic using a fresh Codex process; never submits the draft.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.argv.push('--self-test');
const file=require.resolve('./integration.cjs');
require.cache[file]={id:file,filename:file,loaded:true,exports:async({window,applicationService})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async f=>{const end=Date.now()+45000;while(Date.now()<end){if(await f())return;await wait(50);}throw Error('Codex startup timed out');};
 const setTheme=async value=>{await js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);await js(`document.querySelector('[data-menu-action="settings"]').click()`);await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(value)};f.elements.theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until(()=>js(`document.body.dataset.terminalTheme===${JSON.stringify(value)}`));await js(`document.querySelector('#cancel-settings').click()`);await js(`document.querySelector('.xterm-helper-textarea').focus()`);window.focus();};
 await js(`document.querySelector('#local-terminal').click()`);await until(()=>applicationService.sessions.size===1);await setTheme(process.argv.includes('--start-dark')?'kaku-dark':'kaku-light');
 const id=[...applicationService.sessions.keys()][0];let queries=0,colors=new Set();
 applicationService.on('data',e=>{if(e.id!==id)return;queries+=(e.data.match(/\x1b\]11;\?/g)||[]).length;for(const m of e.data.matchAll(/\x1b\[([0-9;:]*48[;:]2[;:][0-9;:]*)m/g))colors.add(m[1]);});
 applicationService.write(id,'cd ~ && env -u NO_COLOR -u FORCE_COLOR codex --no-alt-screen\r');
 window.show();window.focus();
 await until(()=>js(`document.querySelector('.xterm-accessibility-tree').textContent.includes('Ask Codex to do anything')||document.querySelector('.xterm-accessibility-tree').textContent.includes('for shortcuts')`));
 applicationService.write(id,'ZAWO_THEME_DRAFT');await wait(600);
 const sample=async name=>{await wait(400);fs.writeFileSync(path.join(__dirname,'../shots/'+name+'.png'),(await window.webContents.capturePage()).toPNG());const rows=await js(`(()=>{const counts={};for(const s of document.querySelectorAll('.xterm-rows span[style]')){const key=s.style.backgroundColor;if(key){const rendered=getComputedStyle(s).backgroundColor;const pair=key+' -> '+rendered;counts[pair]=(counts[pair]||0)+1;}}return counts;})()`);const appearance=await js(`Array.from(document.querySelectorAll('.xterm-rows span')).filter(s=>s.textContent.includes('Fast')||s.textContent.includes('shortcuts')||s.className.includes('cursor')).map(s=>({text:s.textContent,classes:s.className,color:getComputedStyle(s).color,style:s.getAttribute('style')}))`);console.log(JSON.stringify({name,queries,backgrounds:rows,sgrBackgrounds:[...colors],appearance}));};
 await sample('codex-theme-before');
 assert.match(await js(`document.querySelector('.xterm-cursor')?.className||''`),/xterm-cursor-bar/,'real Codex uses configured Kaku bar after its cursor reset');
 for(const [theme,expected] of [['dark','rgb(55, 60, 58)'],['kaku-dark','rgb(49, 48, 54)'],['kaku-light','rgb(244, 241, 230)']]){
  await setTheme(theme);await wait(250);
  const fill=await js(`Array.from(document.querySelectorAll('.xterm-rows span')).find(s=>s.textContent.includes('ZAWO_THEME_DRAFT'))`+`.style.backgroundColor`);
  const rendered=await js(`getComputedStyle(Array.from(document.querySelectorAll('.xterm-rows span')).find(s=>s.textContent.includes('ZAWO_THEME_DRAFT'))).backgroundColor`);
  assert.equal(rendered,expected,theme+' composer tracks terminal palette');assert.ok(fill);
  assert.ok(await js(`document.querySelector('.xterm-accessibility-tree').textContent.includes('ZAWO_THEME_DRAFT')`));
  await sample('codex-theme-'+theme);
 }
 console.log('PASS real Codex theme switches preserve draft and update cached composer fills');
 if(process.argv.includes('--verify'))return;
 console.log('CODEX THEME DIAGNOSTIC READY');await new Promise(()=>{});
}};
require('../src/main.cjs');
