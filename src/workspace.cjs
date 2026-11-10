'use strict';
const leaves = tree => !tree ? [] : typeof tree === 'string' ? [tree] : [...leaves(tree.a), ...leaves(tree.b)];
function remove(tree, id) {
 if (!tree || typeof tree === 'string') return tree === id ? null : tree;
 const a=remove(tree.a,id),b=remove(tree.b,id);
 return !a?b:!b?a:{...tree,a,b};
}
function join(a,b,edge='right') {
 if(!a)return b;if(!b)return a;
 const before=edge==='left'||edge==='top';
 return {direction:edge==='left'||edge==='right'?'row':'column',ratio:.5,a:before?b:a,b:before?a:b};
}
function insert(tree,target,incoming,edge='right') {
 if(!tree)return incoming;
 if(!target||tree===target)return join(tree,incoming,edge);
 if(typeof tree==='string')return tree;
 return {...tree,a:insert(tree.a,target,incoming,edge),b:insert(tree.b,target,incoming,edge)};
}
module.exports={leaves,remove,join,insert};
