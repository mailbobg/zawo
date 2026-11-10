'use strict';
const fs=require('node:fs'),path=require('node:path');
class EditorDrafts {
 constructor(dir,crypto){this.file=path.join(dir,'editor-drafts.json');this.crypto=crypto;this.data={};if(fs.existsSync(this.file)){const record=JSON.parse(fs.readFileSync(this.file,'utf8'));if(record.version!==1||typeof record.secret!=='string')throw Error('Editor drafts could not be read');this.data=JSON.parse(crypto.decryptString(Buffer.from(record.secret,'base64')));}}
 snapshot(){return structuredClone(this.data);}
 key(key){if(typeof key!=='string'||!/^(host|tunnel|snippet|group|key)-form:[a-zA-Z0-9_-]{1,80}$/.test(key))throw Error('Invalid editor draft');return key;}
 commit(next){if(!this.crypto?.isEncryptionAvailable()||(process.platform==='linux'&&this.crypto.getSelectedStorageBackend?.()==='basic_text'))throw Error('Secure draft storage is unavailable');const payload=JSON.stringify(next);if(Buffer.byteLength(payload)>1048576)throw Error('Editor draft storage is full');const secret=this.crypto.encryptString(payload).toString('base64');const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify({version:1,secret}),{mode:0o600});fs.chmodSync(tmp,0o600);fs.renameSync(tmp,this.file);this.data=next;}
 save(key,fields){this.key(key);if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>64)throw Error('Invalid draft fields');const clean={};for(const [name,value]of Object.entries(fields)){if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(name)||!['string','boolean'].includes(typeof value)||String(value).length>65536)throw Error('Invalid draft field');clean[name]=value;}if(key.startsWith('host-form:')&&clean.saveCredential!==true){delete clean.credential;delete clean.passphrase;}const next={...this.data,[key]:clean};if(Object.keys(next).length>100)throw Error('Too many editor drafts');this.commit(next);return clean;}
 remove(key){this.key(key);if(!Object.hasOwn(this.data,key))return;const next={...this.data};delete next[key];this.commit(next);}
}
module.exports={EditorDrafts};
