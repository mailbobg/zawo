'use strict';
// One catalog supplies keyboard matching, native menus and user-facing hints.
const shortcuts=[
 {id:'new-tab',label:'New Tab',key:'t',hint:'⌘T',accelerator:'Command+T',group:'Tabs'},
 {id:'quick-connect',label:'Quick Connect',key:'k',hint:'⌘K',accelerator:'Command+K',group:'Tabs'},
 {id:'local',label:'Open Local Terminal',key:'l',hint:'⌘L',accelerator:'Command+L',group:'Tabs'},
 {id:'close-tab',label:'Close Tab',key:'w',hint:'⌘W',accelerator:'Command+W',group:'Tabs'},
 ...Array.from({length:9},(_,i)=>({id:`tab-${i+1}`,label:`Select Tab ${i+1}`,key:String(i+1),hint:`⌘${i+1}`,accelerator:`Command+${i+1}`,group:'Tabs'})),
 {id:'next-tab',label:'Next Tab',key:']',shift:true,hint:'⌘⇧]',accelerator:'Command+Shift+]',group:'Tabs'},
 {id:'previous-tab',label:'Previous Tab',key:'[',shift:true,hint:'⌘⇧[',accelerator:'Command+Shift+[',group:'Tabs'},
 ...['Left','Right','Up','Down'].map((direction,i)=>({id:`focus-${direction.toLowerCase()}`,label:`Focus ${direction} Terminal`,key:`Arrow${direction}`,alt:true,hint:`⌘⌥${['←','→','↑','↓'][i]}`,accelerator:`Command+Alt+${direction}`,group:'Workspace'})),
 {id:'workspace-view',label:'Toggle Workspace View',key:'m',shift:true,hint:'⌘⇧M',accelerator:'Command+Shift+M',group:'Workspace'},
 {id:'find',label:'Find in Terminal',key:'f',hint:'⌘F',accelerator:'Command+F',group:'Terminal'},
 {id:'browser',label:'Show / Hide Browser',key:'b',shift:true,hint:'⌘⇧B',accelerator:'Command+Shift+B',group:'Browser'},
 {id:'help',label:'Keyboard Shortcuts',key:'/',shift:true,hint:'⌘⇧/',accelerator:'Command+Shift+/',group:'Help'}
];
function matchShortcut(e){
 if(!e.metaKey||e.ctrlKey||e.isComposing)return null;
 let key=e.key;
 // Shift changes printable key values; physical codes also survive input layouts.
 if(e.code==='BracketLeft'||key==='{')key='[';
 if(e.code==='BracketRight'||key==='}')key=']';
 if(e.code==='Slash'||key==='?')key='/';
 if(/^Digit[1-9]$/.test(e.code||''))key=e.code.slice(-1);
 if(/^Key[A-Z]$/.test(e.code||''))key=e.code.slice(-1).toLowerCase();
 return shortcuts.find(s=>s.key.toLowerCase()===key?.toLowerCase()&&!!s.shift===e.shiftKey&&!!s.alt===e.altKey)?.id||null;
}
function adjacentPane(layout,id,direction){
 const boxes=[];
 function walk(n,x,y,w,h){if(typeof n==='string'){boxes.push({id:n,x,y,w,h});return;}if(!n)return;const r=n.ratio??.5;if(n.direction==='row'){walk(n.a,x,y,w*r,h);walk(n.b,x+w*r,y,w*(1-r),h);}else{walk(n.a,x,y,w,h*r);walk(n.b,x,y+h*r,w,h*(1-r));}}
 walk(layout,0,0,1,1);const current=boxes.find(p=>p.id===id);if(!current)return null;
 const horizontal=['left','right'].includes(direction),positive=['right','down'].includes(direction);
 const axis=p=>horizontal?p.x+p.w/2:p.y+p.h/2,side=p=>horizontal?p.y:p.x,length=p=>horizontal?p.h:p.w;
 return boxes.filter(p=>p.id!==id&&(positive?axis(p)>axis(current)+1e-8:axis(p)<axis(current)-1e-8)).map(p=>({p,overlap:Math.min(side(p)+length(p),side(current)+length(current))-Math.max(side(p),side(current)),distance:Math.abs(axis(p)-axis(current))+Math.abs(side(p)+length(p)/2-side(current)-length(current)/2)})).sort((a,b)=>Number(b.overlap>1e-8)-Number(a.overlap>1e-8)||a.distance-b.distance)[0]?.p.id||null;
}
module.exports={shortcuts,matchShortcut,adjacentPane};
