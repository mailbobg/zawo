'use strict';
const fs=require('node:fs');const {clipboard}=require('electron');
module.exports=({store,service,win,dialog})=>{
 const readJSON=async title=>{const r=await dialog.showOpenDialog(win,{title,properties:['openFile'],filters:[{name:'Zawo JSON',extensions:['json']}]});if(r.canceled)return null;if(fs.statSync(r.filePaths[0]).size>5*1024*1024)throw Error('File too large');return JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));};
 const exportJSON=async(name,data)=>{const r=await dialog.showSaveDialog(win,{defaultPath:name,filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return {cancelled:true};fs.writeFileSync(r.filePath,JSON.stringify(data,null,2),{mode:0o600});return {cancelled:false};};
 const keyInUse=id=>store.data.hosts.some(h=>h.keyId===id&&service.hostInUse(h.id));
 return {
 saveKey:input=>{if(input?.id&&keyInUse(input.id))throw Error('Disconnect hosts using this key before editing it');return store.saveKey(input);},
 generateKey:name=>store.saveKey({name,credential:require('./key-manager.cjs').generateKey()}),
 importKey:async({name,passphrase})=>{const r=await dialog.showOpenDialog(win,{title:'Choose a private key',properties:['openFile']});if(r.canceled)return {cancelled:true};if(fs.statSync(r.filePaths[0]).size>65536)throw Error('Key file too large');return store.saveKey({name,passphrase,credential:fs.readFileSync(r.filePaths[0],'utf8')});},
 deleteKey:id=>store.deleteKey(id),copyPublicKey:id=>{clipboard.writeText(store.getKey(id).publicKey);return true;},
 forgetKnown:async({endpoint,fingerprint})=>{if(store.data.hosts.some(h=>`${h.address}:${h.port}`===endpoint&&service.hostInUse(h.id)))throw Error('Disconnect sessions and tunnels using this identity first');if(store.fingerprint(endpoint)!==fingerprint)throw Error('Identity changed; refresh first');const r=await dialog.showMessageBox(win,{type:'warning',message:`Forget the trusted identity for ${endpoint}?`,detail:`${fingerprint}\n\nDo this only after confirming the server’s identity through a trusted source. The next connection will require fingerprint verification again.`,buttons:['Cancel','Forget identity'],defaultId:0,cancelId:0});if(r.response!==1)return {cancelled:true};store.forgetKnown(endpoint,fingerprint);return {cancelled:false};},
 exportKnown:()=>exportJSON('zawo-known-hosts.json',store.exportKnown()),
 importKnown:async()=>{const data=await readJSON('Import known host fingerprints');if(!data)return {cancelled:true};store.prepareKnown(data);const r=await dialog.showMessageBox(win,{type:'warning',message:`Trust ${data.known.length} imported server identities?`,detail:'Only import fingerprints verified through a trusted source. Changed identities are rejected.\n\n'+data.known.slice(0,20).map(k=>k.endpoint+'\n'+k.fingerprint).join('\n')+(data.known.length>20?'\n… see the selected file for the remaining identities':''),buttons:['Cancel','Import verified identities'],defaultId:0,cancelId:0});return r.response===1?store.importKnown(data):{cancelled:true};}
 };
};
