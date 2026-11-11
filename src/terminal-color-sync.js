// Some TUIs cache OSC 10/11 at startup (including Codex 0.167.1). Their
// truecolor composer/history fills then outlive a terminal palette change.
// Adapt only exact terminal-derived surfaces in xterm 5.5's DOM renderer.
// Buffer bytes, selection, ANSI colors and unrelated truecolor output stay intact.
const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
const hex=values=>'#'+values.map(v=>v.toString(16).padStart(2,'0')).join('');
const light=([r,g,b])=>.299*r+.587*g+.114*b>128;
export function surfaceColors(background){
 const bg=rgb(background),isLight=light(bg),top=isLight?0:255;
 // Codex uses f32 blending then truncates to u8; match its terminal-derived fills.
 const blend=alpha=>hex(bg.map(c=>Math.trunc(Math.fround(Math.fround(top*Math.fround(alpha))+Math.fround(c*Math.fround(1-Math.fround(alpha)))))));
 return [background.toLowerCase(),blend(isLight?.04:.12),blend(isLight?.02:.16)];
}
export function compatibilityRules(selector,observed,current){
 const to=surfaceColors(current.background),rules=new Map();
 for(const old of observed){
  if(old.background===current.background)continue;
  surfaceColors(old.background).forEach((from,i)=>{
   if(from===to[i])return;
   // Attribute matching is intentional: it repaints both existing scrollback
   // and future writes without walking or mutating terminal cells per frame.
   const targets=[`${selector} .xterm-rows span:not(.xterm-cursor-block)[style*="background-color:${from};"]`,`${selector} .xterm-rows span:not(.xterm-cursor-block)[style*="background-color: rgb(${rgb(from).join(', ')});"]`];
   rules.set(from,`${targets.join(',')}{background-color:${to[i]}!important;color:${current.foreground}!important}`);
  });
 }
 return [...rules.values()].join('\n');
}
export function terminalColorSync(terminal,panel,initial){
 let current=initial;const observed=new Map(),style=document.createElement('style');
 style.dataset.terminalColorSync='';panel.append(style);
 const selector=`.terminal-pane[data-session="${CSS.escape(panel.dataset.session)}"]`;
 const update=()=>{style.textContent=compatibilityRules(selector,observed.values(),current);};
 const probe=terminal.parser.registerOscHandler(11,data=>{
  if(data==='?'){observed.set(current.background,{...current});update();}
  return false; // Let xterm send its normal OSC reply to this session only.
 });
 return {apply(theme){current=theme;update();},dispose(){probe.dispose();style.remove();}};
}
