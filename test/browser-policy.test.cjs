const {test}=require('node:test');const assert=require('node:assert/strict');const {webURL,tunnelURL}=require('../src/browser-policy.cjs');
test('browser addresses allow web URLs and localhost, reject privileged schemes and credentials',()=>{
 for(const x of ['file:///etc/passwd','javascript:alert(1)','data:text/html,hello','chrome://settings','https://user:secret@example.com','https://ex ample.com',''])assert.throws(()=>webURL(x));
 assert.equal(webURL('example.com'),'https://example.com/');assert.equal(webURL('localhost:3000/a'),'http://localhost:3000/a');assert.equal(webURL('http://[::1]:3000/'),'http://[::1]:3000/');
});
test('forwarding uses actual bound port and local wildcard addresses',()=>{
 const c={type:'local',bindAddress:'0.0.0.0',bindPort:0};const s={status:'running',port:3456};assert.equal(tunnelURL(c,s),'http://127.0.0.1:3456/');assert.equal(tunnelURL({...c,bindAddress:'::'},s,'https:'),'https://[::1]:3456/');
 for(const type of ['remote','dynamic'])assert.throws(()=>tunnelURL({...c,type},s));assert.throws(()=>tunnelURL(c,{...s,status:'stopped'}));assert.throws(()=>tunnelURL(c,{...s,port:0}));
});
test('omnibox distinguishes search text from URLs without laundering privileged schemes',()=>{
 const {omniboxURL}=require('../src/browser-policy.cjs');
 assert.equal(omniboxURL('electron browser tabs'),'https://www.google.com/search?q=electron%20browser%20tabs');
 assert.equal(omniboxURL('中文搜索'),'https://www.google.com/search?q=%E4%B8%AD%E6%96%87%E6%90%9C%E7%B4%A2');
 assert.equal(omniboxURL('example.com/a'),'https://example.com/a');assert.equal(omniboxURL('localhost:3000/a'),'http://localhost:3000/a');
 for(const input of ['javascript:alert(1)','file:///etc/passwd','https://user:secret@example.com','data:text/html,hi','a\nsecret',''])assert.throws(()=>omniboxURL(input));
});
test('Google homepage uses no-country-redirect while search, other sites and explicit regional URLs remain unchanged',()=>{
 const {navigationURL}=require('../src/browser-policy.cjs');
 for(const input of ['google.com','https://google.com/','https://www.google.com/'])assert.equal(navigationURL(input),'https://www.google.com/ncr');
 for(const input of ['https://www.google.com/search?q=hello','https://www.google.com/?q=hello','https://www.google.com/ncr','https://www.google.com.hk/','https://accounts.google.com/','https://www.google.com.evil.test/','https://www.google.com:8443/','https://example.com/','http://localhost:3000/'])assert.equal(navigationURL(input),input);
 assert.throws(()=>navigationURL('https://user:password@www.google.com/'));
});
