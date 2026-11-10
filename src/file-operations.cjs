'use strict';
const fs=require('node:fs/promises');const sync=require('node:fs');const path=require('node:path');
const name=s=>{if(typeof s!=='string'||!s||s==='.'||s==='..'||/[\/\\\x00-\x1f]/.test(s)||s.length>255)throw Error('Invalid file name');return s;};
const mode=value=>{if(typeof value!=='string'||!/^0?[0-7]{3}$/.test(value))throw Error('Use a three-digit octal permission, for example 644');return parseInt(value,8);};
class LocalFiles{
 constructor(roots){this.roots=roots;this.sep=path;this.grants=roots instanceof Map?roots:new Map();this.ready=roots instanceof Map?Promise.resolve():Promise.all([...roots].map(async r=>{const real=await fs.realpath(r),st=await fs.stat(real);this.grants.set(real,{real,dev:st.dev,ino:st.ino});}));}
 async authorizedRoots(){await this.ready;const roots=[];for(const [r,g] of this.grants){try{const st=await fs.lstat(r);if(st.isSymbolicLink()||!st.isDirectory()||st.dev!==g.dev||st.ino!==g.ino||await fs.realpath(r)!==g.real)continue;roots.push(g.real);}catch{}}return roots;}
 async check(p,missing=false){if(typeof p!=='string'||p.length>4096||!path.isAbsolute(p)||/[\x00-\x1f]/.test(p))throw Error('Invalid local path');const roots=await this.authorizedRoots();const parent=await fs.realpath(path.dirname(p)),actual=path.join(parent,path.basename(p));if(!roots.some(r=>{const rel=path.relative(r,actual);return !rel||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));}))throw Error('Choose this folder with the folder picker to grant access first');try{const st=await fs.lstat(actual);if(st.isSymbolicLink())throw Object.assign(Error('Symbolic links are not supported for file operations'),{code:'SYMLINK'});}catch(e){if(!(missing&&e.code==='ENOENT'))throw e;}return actual;}
 async stat(p){const s=await fs.lstat(await this.check(p));return {isDirectory:s.isDirectory(),isFile:s.isFile(),size:s.size,mode:s.mode,modified:Math.floor(s.mtimeMs/1000),accessed:Math.floor(s.atimeMs/1000)};}
 async exists(p){try{return await this.stat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async list(p){return (await fs.readdir(await this.check(p))).map(name);}
 async mkdir(p){await fs.mkdir(await this.check(p,true));}
 async mutable(p,missing=false){const actual=await this.check(p,missing);if((await this.authorizedRoots()).includes(actual))throw Error('Cannot modify a granted root folder');return actual;}
 async rename(a,b){const src=await this.mutable(a),dest=await this.mutable(b,true);if(await this.exists(dest))throw Error('Destination already exists');await fs.rename(src,dest);}
 async publish(a,b){const src=await this.mutable(a),dest=await this.mutable(b,true);await fs.link(src,dest);await fs.unlink(src);}
 async replace(a,b){await fs.rename(await this.mutable(a),await this.mutable(b,true));}
 async chmod(p,v){await fs.chmod(await this.mutable(p),mode(v));}
 async remove(p){const dest=await this.mutable(p),s=await fs.lstat(dest);if(s.isDirectory())await fs.rmdir(dest);else await fs.unlink(dest);}
 async metadata(p,s){const actual=await this.mutable(p);await fs.chmod(actual,s.mode&0o777);if(Number.isFinite(s.modified))await fs.utimes(actual,s.accessed||s.modified,s.modified);}
 async read(p){return sync.createReadStream(await this.check(p),{flags:sync.constants.O_RDONLY|sync.constants.O_NOFOLLOW});}
 async write(p){return sync.createWriteStream(await this.mutable(p,true),{flags:'wx',mode:0o600});}
}
class RemoteFiles{
 constructor(sftp){this.sftp=sftp;this.sep=path.posix;}
 check(p){if(typeof p!=='string'||!p.startsWith('/')||p.length>4096||/[\x00-\x1f]/.test(p))throw Error('Invalid remote path');return path.posix.normalize(p);}
 call(method,...args){return new Promise((resolve,reject)=>this.sftp[method](...args,(e,r)=>e?reject(e):resolve(r)));}
 async stat(p){const s=await this.call('lstat',this.check(p));if(s.isSymbolicLink())throw Object.assign(Error('Symbolic links are not supported for file operations'),{code:'SYMLINK'});return {isDirectory:s.isDirectory(),isFile:s.isFile(),size:s.size,mode:s.mode,modified:s.mtime,accessed:s.atime};}
 async exists(p){try{return await this.stat(p);}catch(e){if(e.code===2)return null;throw e;}}
 async list(p){return (await this.call('readdir',this.check(p))).filter(e=>!['.','..'].includes(e.filename)).map(e=>name(e.filename));}
 async mkdir(p){await this.call('mkdir',this.check(p));}
 async rename(a,b){if(this.check(a)==='/')throw Error('Cannot modify root');if(await this.exists(b))throw Error('Destination already exists');await this.call('rename',this.check(a),this.check(b));}
 async publish(a,b){if(this.check(b)==='/')throw Error('Cannot modify root');await this.call('rename',this.check(a),this.check(b));}
 async replace(a,b){if(this.check(b)==='/')throw Error('Cannot modify root');if(await this.exists(b)){if(!this.sftp.ext_openssh_rename)throw Error('Server cannot safely replace files');await this.call('ext_openssh_rename',this.check(a),this.check(b));}else await this.call('rename',this.check(a),this.check(b));}
 async chmod(p,v){if(this.check(p)==='/')throw Error('Cannot modify root');await this.stat(p);await this.call('chmod',this.check(p),mode(v));}
 async remove(p){if(this.check(p)==='/')throw Error('Cannot modify root');const s=await this.stat(p);await this.call(s.isDirectory?'rmdir':'unlink',this.check(p));}
 async metadata(p,s){await this.stat(p);await this.call('setstat',this.check(p),{mode:s.mode&0o777,...(Number.isFinite(s.modified)?{atime:s.accessed||s.modified,mtime:s.modified}:{})});}
 async read(p){await this.stat(p);return this.sftp.createReadStream(this.check(p));}
 async write(p){if(await this.exists(p))throw Error('Temporary target already exists');return this.sftp.createWriteStream(this.check(p),{flags:'wx',mode:0o600});}
}
module.exports={LocalFiles,RemoteFiles,name,mode};
