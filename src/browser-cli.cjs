'use strict';
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const net=require('node:net');const {randomBytes,randomUUID}=require('node:crypto');const {webURL}=require('./browser-policy.cjs');
const marker='# Zawo browser CLI v1';
function helper(remote=false){return `#!/bin/sh
${marker}
set -eu
if [ "$#" = 1 ] && { [ "$1" = --help ] || [ "$1" = help ]; }; then
  printf '%s\\n' 'Usage: zawo browser open [http-or-https-url]' 'Without a URL, open a new blank tab in the running Zawo right-hand browser.' 'Remote localhost is forwarded through the enabled SSH session.'
  exit 0
fi
if { [ "$#" != 2 ] && [ "$#" != 3 ]; } || [ "$1" != browser ] || [ "$2" != open ]; then
  printf '%s\\n' 'Usage: zawo browser open [http-or-https-url]' >&2; exit 2
fi
if [ "$#" = 3 ]; then
case "$3" in http://*|https://*) ;; *) printf '%s\\n' 'Use a full http:// or https:// URL.' >&2; exit 2 ;; esac
fi
config=\${ZAWO_BRIDGE_CONFIG:-${remote?'"$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)/bridge.conf"':'"$HOME/.config/zawo/bridge.conf"'}}
if [ ! -r "$config" ]; then printf '%s\\n' 'Zawo is not running or CLI access is not enabled. Open Zawo, or enable CLI access in the SSH terminal menu.' >&2; exit 1; fi
body=$(mktemp "\${TMPDIR:-/tmp}/zawo-cli.XXXXXX")
trap 'rm -f "$body"' EXIT HUP INT TERM
if ! status=$(curl --disable --silent --show-error --noproxy '*' --connect-timeout 3 --max-time 20 --config "$config" --header 'Content-Type: text/plain' --data-binary "\${3-}" --output "$body" --write-out '%{http_code}'); then
  printf '%s\\n' 'Cannot reach Zawo. Open the app; for SSH, re-enable CLI access after reconnecting.' >&2; exit 1
fi
if [ "$status" != 200 ]; then cat "$body" >&2; printf '\\n' >&2; exit 1; fi
cat "$body"; printf '\\n'
`;}
function atomic(file,text,mode){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID();try{fs.writeFileSync(temp,text,{mode,flag:'wx'});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}}
function config(port,token){return `url = "http://127.0.0.1:${port}/v1/browser/open"\nheader = "Authorization: Bearer ${token}"\n`;}
function remoteExec(client,command,input='') {return new Promise((resolve,reject)=>{let channel,done=false,output='';const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(output);};const timer=setTimeout(()=>{channel?.close();finish(Error('Remote CLI setup timed out'));},15000);client.exec(command,(err,ch)=>{if(err)return finish(err);channel=ch;ch.on('data',d=>{output+=d;if(output.length>32768){ch.close();finish(Error('Remote CLI output too large'));}});ch.stderr.on('data',()=>{});ch.on('error',finish);ch.on('close',code=>finish(code===0?null:Error('Remote CLI command failed. Check shell and home-directory permissions.')));ch.end(input);});});}
function loopback(host){host=host.toLowerCase().replace(/^\[|\]$/g,'');return host==='localhost'||host==='::1'||host==='::'||host==='0.0.0.0'||/^127\./.test(host);}
class BrowserCLI{
 constructor({home,service,open,closed=()=>{}}){Object.assign(this,{home,service,open,onClosed:closed,scopes:new Map(),sessions:new Map(),pending:new Map(),sockets:new Set(),closing:false,inflight:0});this.configPath=path.join(home,'.config/zawo/bridge.conf');this.command=path.join(home,'.local/bin/zawo');}
 async start(){
  if(fs.existsSync(this.command)&&!fs.readFileSync(this.command,'utf8').includes(marker))throw Error('An unrelated zawo command already exists in ~/.local/bin; it was not overwritten.');
  this.localToken=randomBytes(32).toString('hex');this.scopes.set(this.localToken,{local:true});
  this.server=http.createServer((req,res)=>this.request(req,res));this.server.on('connection',socket=>this.track(this.sockets,socket));this.server.requestTimeout=10000;this.server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(0,'127.0.0.1',resolve);});this.port=this.server.address().port;
  this.localConfig=config(this.port,this.localToken);atomic(this.configPath,this.localConfig,0o600);atomic(this.command,helper(),0o755);return this;
 }
 async request(req,res){
  const reply=(code,value)=>{if(!res.destroyed){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
  if(req.headers.origin)return reply(403,{error:'Browser-origin requests are not allowed'});
  const scope=this.scopes.get((req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):'');if(!scope||scope.closed)return reply(401,{error:'CLI access expired. Re-enable it in Zawo.'});
  if(req.method!=='POST'||req.url!=='/v1/browser/open')return reply(404,{error:'Only browser open is supported'});
  if(this.inflight>=8)return reply(429,{error:'Too many browser requests'});
  this.inflight++;let bytes=0,body='',chunks=[];
  try{
   for await(const chunk of req){bytes+=chunk.length;if(bytes>8192){reply(413,{error:'URL too long'});req.resume();return;}chunks.push(chunk);}
   body=Buffer.concat(chunks).toString('utf8');let url=body===''?null:webURL(body),forward=null;
   if(url&&!scope.local&&loopback(new URL(url).hostname))({url,forward}=await this.forward(scope,url));
   if(scope.closed||this.closing)throw Error('SSH session or application is closed');
   await this.open({url,sourceURL:body,sessionId:scope.id||null,remoteName:scope.name||null,forwardId:forward?.id||null});
   reply(200,url?{opened:true,url,forwarded:!!forward}:{opened:true,newTab:true,forwarded:false});
  }catch(error){reply(400,{error:error.message||'Could not open preview'});}finally{this.inflight--;}
 }
 track(set,socket){set.add(socket);socket.on('error',()=>socket.destroy());socket.on('close',()=>set.delete(socket));return socket;}
 pipe(a,b){a.pipe(b).pipe(a);a.on('close',()=>b.destroy());b.on('close',()=>a.destroy());}
 async enable(id){
  if(this.pending.has(id))return this.pending.get(id);if(this.sessions.has(id))return this.info(this.sessions.get(id));
  const task=this.enableRemote(id).finally(()=>this.pending.delete(id));this.pending.set(id,task);return task;
 }
 async enableRemote(id){
  const entry=this.service.entry(id,'ssh'),scope={id,client:entry.client,name:entry.connection.host.label,token:randomBytes(32).toString('hex'),forwards:new Map(),sockets:new Set(),closed:false,dir:'.local/share/zawo/sessions/'+randomUUID()};
  this.sessions.set(id,scope);this.scopes.set(scope.token,scope);scope.connection=entry.connection;scope.onClose=()=>this.release(scope);entry.connection.once('closed',scope.onClose);
  scope.onTCP=(info,accept,reject)=>{if(scope.closed||info.destPort!==scope.port||info.destIP!=='127.0.0.1')return reject();const remote=this.track(scope.sockets,accept());const local=this.track(scope.sockets,net.connect(this.port,'127.0.0.1'));local.once('connect',()=>this.pipe(local,remote));};
  scope.client.on('tcp connection',scope.onTCP);
  try{
   scope.port=await new Promise((resolve,reject)=>scope.client.forwardIn('127.0.0.1',0,(e,p)=>e?reject(Error('SSH server must allow remote TCP forwarding for CLI access.')):resolve(p)));
   if(scope.closed)throw Error('SSH session closed');
   // Transfer secrets via channel stdin, never a command line or terminal output.
   try{await remoteExec(scope.client,'command -v curl >/dev/null');}catch{throw Error('Remote CLI access requires curl in the remote shell PATH.');}
   const dir='"$HOME/'+scope.dir+'"';
   await remoteExec(scope.client,`umask 077; mkdir -p ${dir}/bin && cat > ${dir}/bin/zawo && chmod 700 ${dir}/bin/zawo`,helper(true));
   await remoteExec(scope.client,`umask 077; cat > ${dir}/bridge.conf && chmod 600 ${dir}/bridge.conf`,config(scope.port,scope.token));
   if(scope.closed)throw Error('SSH session closed');scope.ready=true;return this.info(scope);
  }catch(error){await this.release(scope);throw error;}
 }
 info(scope){return {remote:true,name:scope.name,activation:`export PATH="$HOME/${scope.dir}/bin:$PATH"`,command:`$HOME/${scope.dir}/bin/zawo`,sessionId:scope.id};}
 async forward(scope,input){
  const source=new URL(input),key=source.origin;let forward=scope.forwards.get(key);
  if(!forward){
   if(scope.forwards.size>=16)throw Error('Too many preview ports in this SSH session');
   forward={id:'cli:'+scope.id+':'+randomUUID(),server:null,port:0,pending:null};scope.forwards.set(key,forward);
   forward.pending=(async()=>{
    const host=source.hostname.replace(/^\[|\]$/g,''),target=['localhost','0.0.0.0'].includes(host)?'127.0.0.1':host==='::'?'::1':host,port=Number(source.port)||(source.protocol==='https:'?443:80);
    const server=net.createServer(socket=>{this.track(scope.sockets,socket);const timer=setTimeout(()=>socket.destroy(),10000);socket.once('close',()=>clearTimeout(timer));scope.client.forwardOut('127.0.0.1',0,target,port,(err,ch)=>{clearTimeout(timer);if(err||scope.closed||socket.destroyed){ch?.destroy();socket.destroy();return;}this.track(scope.sockets,ch);this.pipe(socket,ch);});});forward.server=server;
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});forward.port=server.address().port;
    if(scope.closed){server.close();throw Error('SSH session closed');}
   })().catch(error=>{scope.forwards.delete(key);forward.server?.close();throw error;});
  }
  await forward.pending;source.hostname='127.0.0.1';source.port=String(forward.port);return {url:source.href,forward};
 }
 async release(scope){
  if(scope.closed)return;scope.closed=true;this.scopes.delete(scope.token);this.sessions.delete(scope.id);scope.connection.removeListener('closed',scope.onClose);scope.client.removeListener('tcp connection',scope.onTCP);
  for(const f of scope.forwards.values()){f.server?.close();this.onClosed(f.id);}for(const socket of scope.sockets)socket.destroy();scope.sockets.clear();
  if(scope.port&&!scope.connection.closed)await new Promise(resolve=>{const timer=setTimeout(resolve,1500);try{scope.client.unforwardIn('127.0.0.1',scope.port,()=>{clearTimeout(timer);resolve();});}catch{clearTimeout(timer);resolve();}});
 }
 async close(){if(this.closing)return;this.closing=true;await Promise.all([...this.sessions.values()].map(s=>this.release(s)));this.scopes.clear();for(const s of this.sockets)s.destroy();if(this.server)await new Promise(r=>this.server.close(r));if(fs.existsSync(this.configPath)&&fs.readFileSync(this.configPath,'utf8')===this.localConfig)fs.rmSync(this.configPath,{force:true});}
}
module.exports={BrowserCLI,helper,remoteExec,loopback};
