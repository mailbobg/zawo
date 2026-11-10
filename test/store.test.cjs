const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const corePath=path.join(__dirname,'../src/store.cjs');
test('secure persistent host store exists',()=>assert.ok(fs.existsSync(corePath),'The secure host store has not been implemented'));
if(fs.existsSync(corePath)){
 const {Store,validateHost}=require(corePath);
 const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'harbor-store-'));
 test('host/group edits and deletion survive restart; no-save drops secrets',()=>{const dir=temp();try{const s=new Store(dir,null); const g=s.saveGroup({name:'Lab'}); const h=s.saveHost({label:'Test',address:'127.0.0.1',username:'fixture',port:2222,groupId:g.id,auth:'password',tags:['local'],credential:'NOT-SAVED',saveCredential:false}); assert.equal(new Store(dir,null).snapshot().hosts[0].label,'Test'); assert.ok(!fs.readFileSync(path.join(dir,'vault.json'),'utf8').includes('NOT-SAVED')); s.saveGroup({id:g.id,name:'Renamed'}); assert.equal(new Store(dir,null).snapshot().groups[0].name,'Renamed'); s.deleteGroup(g.id); assert.equal(s.snapshot().hosts[0].groupId,''); s.deleteHost(h.id); assert.equal(new Store(dir,null).snapshot().hosts.length,0);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
 test('credential saving fails closed without encryption and preserves existing file',()=>{const dir=temp();try{const s=new Store(dir,{isEncryptionAvailable:()=>false}); const before=JSON.stringify(s.snapshot()); assert.throws(()=>s.saveHost({label:'x',address:'localhost',username:'u',port:22,auth:'password',saveCredential:true,credential:'secret'}),/encryption/i); assert.equal(JSON.stringify(s.snapshot()),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
 test('rejects unsafe host input and invalid ports',()=>{assert.throws(()=>validateHost({address:'a; touch x',username:'a',port:22}));assert.throws(()=>validateHost({address:'localhost',username:'a',port:0}));assert.throws(()=>validateHost({address:'localhost',username:'a',port:22,auth:'agent'}));});
 test('trusted keys persist and cannot be silently replaced',()=>{const dir=temp();try{const s=new Store(dir,null);s.trust('localhost:22','SHA256:first');assert.equal(new Store(dir,null).fingerprint('localhost:22'),'SHA256:first');assert.throws(()=>s.trust('localhost:22','SHA256:changed'),/changed/i);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
}
