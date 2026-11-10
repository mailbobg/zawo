const {test}=require('node:test');const assert=require('node:assert/strict');
const {leaves,remove,join,insert}=require('../src/workspace.cjs');
test('nested workspace movement preserves leaves and collapses empty branches',()=>{
 const initial=insert(join('a','b'),'b','c','bottom');assert.deepEqual(leaves(initial),['a','b','c']);
 assert.equal(initial.direction,'row');assert.equal(initial.b.direction,'column');
 const moved=insert(remove(initial,'a'),'c','a','left');assert.deepEqual(leaves(moved),['b','a','c']);
 assert.deepEqual(remove(remove(moved,'b'),'a'),'c');assert.equal(remove('c','c'),null);
 assert.deepEqual(leaves(initial),['a','b','c']);
});
test('all four edges order sessions correctly and missing targets leave layout unchanged',()=>{
 for(const edge of ['left','right','top','bottom']){const t=join('a','b',edge);assert.deepEqual(leaves(t),['left','top'].includes(edge)?['b','a']:['a','b']);}
 const t=join('a','b');assert.deepEqual(insert(t,'missing','c'),t);
});
