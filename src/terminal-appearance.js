// Kaku's bundled config uses a 3:1 text contrast floor and a bar default.
// Apply the floor to xterm's RGB/256-color renderer too, not just ANSI 0–15.
export function appearanceOptions(theme){
 const kaku=theme?.startsWith('kaku-');
 return {minimumContrastRatio:kaku?3:1,drawBoldTextInBrightColors:!kaku,cursorStyle:kaku?'bar':'block',cursorInactiveStyle:kaku?'none':'outline',cursorWidth:1};
}
export function terminalAppearance(terminal,initial){
 let theme=initial;
 const apply=value=>{theme=value;Object.assign(terminal.options,appearanceOptions(value));};
 apply(initial);
 // DECSCUSR 0 means the terminal's configured default, not an explicit block.
 // xterm 5.5 aliases 0 to 1. Preserve explicit application requests 1–6.
 const reset=terminal.parser.registerCsiHandler({intermediates:' ',final:'q'},params=>{
  if((params[0]||0)!==0||!theme?.startsWith('kaku-'))return false;
  terminal.options.cursorStyle='bar';terminal.options.cursorBlink=true;return true;
 });
 return {apply,dispose(){reset.dispose();}};
}
