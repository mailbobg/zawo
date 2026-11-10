const {test}=require('node:test');const assert=require('node:assert/strict');
test('terminal links span wrapped lines and preserve character cell coordinates',async()=>{
 const {terminalWebLinks}=await import('../src/terminal-web-links.js');let provider,opened;
 const lines=['go http://localh','ost:3000/path   '];const terminal={cols:16,buffer:{active:{length:2,getLine:y=>({isWrapped:y===1,getCell:x=>({getWidth:()=>1,getChars:()=>lines[y]?.[x]||' '})})}},registerLinkProvider:p=>provider=p};
 terminalWebLinks(terminal,url=>opened=url);let links;provider.provideLinks(2,result=>links=result);assert.equal(links.length,1);assert.equal(links[0].text,'http://localhost:3000/path');assert.deepEqual(links[0].range,{start:{x:4,y:1},end:{x:13,y:2}});links[0].activate();assert.equal(opened,'http://localhost:3000/path');
});
