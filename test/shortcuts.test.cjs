const {test}=require('node:test');const assert=require('node:assert/strict');const {matchShortcut,adjacentPane}=require('../src/shortcuts.cjs');
test('shortcut matching preserves Mac Control keys and normalizes shifted bracket/input-layout keys',()=>{
 const base={metaKey:true,ctrlKey:false,shiftKey:false,altKey:false};
 assert.equal(matchShortcut({...base,key:'1',code:'Digit1'}),'tab-1');
 assert.equal(matchShortcut({...base,key:'}',code:'BracketRight',shiftKey:true}),'next-tab');
 assert.equal(matchShortcut({...base,key:'Т',code:'KeyT'}),'new-tab');
 for(const key of ['f','k','t','l'])assert.equal(matchShortcut({...base,metaKey:false,ctrlKey:true,key}),null);
 assert.equal(matchShortcut({...base,key:'t',isComposing:true}),null);
 assert.equal(matchShortcut({...base,key:'t',altKey:true}),null);
 assert.equal(matchShortcut({...base,key:'1',shiftKey:true}),null);
});
test('spatial focus follows nested split geometry, not creation order, and stops at edges',()=>{
 const layout={direction:'row',ratio:.4,a:'left',b:{direction:'column',ratio:.5,a:'top',b:'bottom'}};
 assert.equal(adjacentPane(layout,'top','down'),'bottom');assert.equal(adjacentPane(layout,'bottom','up'),'top');
 assert.equal(adjacentPane(layout,'bottom','left'),'left');assert.equal(adjacentPane(layout,'left','right'),'top');
 assert.equal(adjacentPane(layout,'top','up'),null);assert.equal(adjacentPane(layout,'bottom','right'),null);
 assert.equal(adjacentPane('single','single','left'),null);
});
