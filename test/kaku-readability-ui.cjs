const assert=require('node:assert/strict');
module.exports=async({window,applicationService,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 await click('#local-terminal');await until(()=>js(`!!document.querySelector('.terminal-pane')`));
 const id=await js(`document.querySelector('.terminal-pane').dataset.session`);
 const theme=async value=>{await js(`document.querySelector('.session-tab.active').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:450,clientY:45}))`);await click('[data-menu-action="settings"]');await js(`(()=>{const f=document.querySelector('#terminal-settings');f.elements.theme.value=${JSON.stringify(value)};f.elements.theme.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until(()=>js(`document.body.dataset.terminalTheme===${JSON.stringify(value)}`));await click('#cancel-settings');await js(`document.querySelector('.xterm-helper-textarea').focus()`);window.show();window.focus();};
 const output=async data=>{applicationService.emit('data',{id,data});await new Promise(r=>setTimeout(r,100));};
 const cursor=()=>js(`document.querySelector('.xterm-cursor')?.className||''`);
 const contrast=(a,b)=>{const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 for(const value of ['kaku-light','kaku-dark']){
  await theme(value);
  // Real Codex status colors are outside the 16-color palette; include RGB and 256-color output.
  await output('\x1b[2J\x1b[H\x1b[38;2;255;215;135mMODEL\x1b[0m \x1b[38;5;120mPATH\x1b[0m \x1b[38;5;213mTASK\x1b[0m\r\n\x1b[0 q');
  const colors=await js(`Array.from(document.querySelectorAll('.xterm-rows span')).filter(s=>/MODEL|PATH|TASK/.test(s.textContent)).map(s=>({text:s.textContent,color:getComputedStyle(s).color,bg:getComputedStyle(document.querySelector('.xterm-viewport')).backgroundColor}))`);
  assert.equal(colors.length,3);for(const s of colors)assert.ok(contrast(s.color,s.bg)>=2.95,`${value} ${s.text} has readable contrast: ${contrast(s.color,s.bg)}`);
  console.log(value,JSON.stringify(colors),'cursor',await cursor());assert.match(await cursor(),/xterm-cursor-bar/,'default cursor reset should use Kaku bar');
  await output('\x1b[2 q');assert.match(await cursor(),/xterm-cursor-block/,'explicit application cursor shape is respected');
  await output('\x1b[0 q');assert.match(await cursor(),/xterm-cursor-bar/);
  await js(`document.querySelector('.xterm-helper-textarea').blur()`);
  assert.doesNotMatch(await cursor(),/xterm-cursor-(outline|block|bar|underline)/,'inactive Kaku panes do not show hollow boxes');
  await js(`document.querySelector('.xterm-helper-textarea').focus()`);assert.match(await cursor(),/xterm-cursor-bar/);
 }
 await theme('green');await output('\x1b[0 q');assert.match(await cursor(),/xterm-cursor-block/,'other themes retain their block default');
 await click('.pane-close');await until(()=>!applicationService.sessions.has(id));pass('Kaku truecolor and 256-color text contrast, cursor reset, explicit cursor and inactive-pane behavior');
};
