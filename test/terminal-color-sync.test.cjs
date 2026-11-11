const {test}=require('node:test'),assert=require('node:assert/strict');
test('cached light/dark input surfaces map to the current theme, preserving unrelated colors and block cursors',async()=>{
 const {surfaceColors,compatibilityRules}=await import('../src/terminal-color-sync.js');
 assert.deepEqual(surfaceColors('#fffcf0'),['#fffcf0','#f4f1e6','#f9f6eb']);
 assert.deepEqual(surfaceColors('#1c2220'),['#1c2220','#373c3a','#404543']);
 const light={background:'#fffcf0',foreground:'#100f0f'},dark={background:'#15141b',foreground:'#d5d4d6'};
 const rules=compatibilityRules('#pane',[light],dark);
 assert.match(rules,/background-color:#f4f1e6;/);assert.match(rules,/background-color:#313036!important/);assert.match(rules,/color:#d5d4d6!important/);
 assert.match(rules,/:not\(\.xterm-cursor-block\)/);assert.ok(!rules.includes('#ff0000'));
 assert.equal(compatibilityRules('#pane',[light],light),'');
 assert.match(compatibilityRules('#pane',[dark],light),/background-color:#f4f1e6!important/);
 assert.equal(compatibilityRules('#pane',[],dark),'','do not remap programs that never queried a terminal palette');
});
