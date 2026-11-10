'use strict';
const {Client}=require('ssh2');const {EventEmitter}=require('node:events');const {createHash}=require('node:crypto');
const error=(message,code='TRANSPORT')=>Object.assign(Error(message),{code});
class Connector {
 constructor(store,confirm,options={}){this.store=store;this.confirm=confirm;this.options=options;this.leases=new Set();}
 async connect(id,credentials={},options={}){
  if(this.leases.size>=32)throw error('Too many connections','LIMIT');
  const chain=this.store.chain(id).map(h=>({...h}));const lease=new EventEmitter();Object.assign(lease,{clients:[],streams:[],host:chain.at(-1),hostIds:chain.map(h=>h.id),closed:false});
  lease.close=reason=>{if(lease.closed)return;lease.closed=true;this.leases.delete(lease);options.signal?.removeEventListener('abort',abort);for(const c of [...lease.clients].reverse())c.destroy();for(const s of lease.streams)s.destroy();lease.emit('closed',reason||error('Connection closed'));};
  const abort=()=>lease.close(error('Connection cancelled','CANCELLED'));this.leases.add(lease);options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
  try{let previous;
   for(const host of chain){
    if(lease.closed)throw error('Connection cancelled','CANCELLED');
    const supplied=host.id===id?credentials:credentials.jumpCredentials?.[host.id];const saved=supplied?.credential?supplied:this.store.credential(host.id);
    if(!saved?.credential)throw error(`Credentials required for ${host.label}`,'AUTH_REQUIRED');
    if(typeof saved.credential!=='string'||saved.credential.length>65536||typeof(saved.passphrase||'')!=='string'||(saved.passphrase||'').length>4096)throw error('Invalid credential','AUTH_REQUIRED');
    let sock;if(previous)sock=await this.forward(previous,host.address,host.port,lease);
    const client=new Client();lease.clients.push(client);client.on('error',()=>{});client.on('close',()=>lease.close(error(`Connection to ${host.label} closed`)));
    await new Promise((resolve,reject)=>{
     let settled=false,failure;const timeout=setTimeout(()=>finish(error(`Connection to ${host.label} timed out`)),this.options.connectTimeout||45000);
     const closed=e=>finish(e);const failed=e=>finish(failure||error(e.message,e.level==='client-authentication'?'AUTH_FAILED':'TRANSPORT'));
     const finish=e=>{if(settled)return;settled=true;clearTimeout(timeout);lease.removeListener('closed',closed);client.removeListener('error',failed);e?reject(e):resolve();};
     lease.once('closed',closed);client.once('error',failed);client.once('ready',()=>finish());
     const endpoint=`${host.address}:${host.port}`;
     try{client.connect({...(sock?{sock}:{host:host.address,port:host.port}),username:host.username,readyTimeout:this.options.connectTimeout||45000,keepaliveInterval:15000,keepaliveCountMax:3,...(host.auth==='key'?{privateKey:saved.credential,passphrase:saved.passphrase||undefined}:{password:saved.credential}),hostVerifier:(key,cb)=>{
      const fingerprint='SHA256:'+createHash('sha256').update(key).digest('base64').replace(/=+$/,'');const known=this.store.fingerprint(endpoint);
      if(known){if(known!==fingerprint)failure=error(`HOST KEY CHANGED for ${endpoint}. Connection blocked. Expected ${known}; received ${fingerprint}.`,'HOST_KEY_CHANGED');return cb(known===fingerprint);}
      if(options.confirmUnknown===false){failure=error(`Verify the host key for ${host.label} by starting this connection manually`,'HOST_KEY_UNTRUSTED');return cb(false);}
      Promise.resolve(this.confirm({endpoint,fingerprint,label:host.label})).then(ok=>{if(lease.closed||settled)return cb(false);if(!ok){failure=error('Host key not trusted; connection cancelled','HOST_KEY_UNTRUSTED');return cb(false);}try{this.store.trust(endpoint,fingerprint);cb(true);}catch(e){failure=error(e.message,'HOST_KEY_CHANGED');cb(false);}}).catch(e=>{failure=error(e.message,'HOST_KEY_UNTRUSTED');cb(false);});
     }});}catch(e){finish(error(e.message,'CONFIG'));}
    });previous=client;
   }lease.client=previous;return lease;
  }catch(e){lease.close(e);throw e;}
 }
 forward(client,address,port,lease){return new Promise((resolve,reject)=>{let done=false;const finish=(e,s)=>{if(done){s?.destroy();return;}done=true;clearTimeout(timer);lease.removeListener('closed',closed);if(e)reject(e);else{lease.streams.push(s);s.on('error',()=>{});resolve(s);}};const closed=e=>finish(e);const timer=setTimeout(()=>finish(error('Jump channel timed out')),this.options.connectTimeout||45000);lease.once('closed',closed);client.forwardOut('127.0.0.1',0,address,port,finish);});}
 hostInUse(id){return [...this.leases].some(l=>l.hostIds.includes(id));}
 closeAll(){for(const lease of this.leases)lease.close(error('Application closed','CANCELLED'));}
}
module.exports={Connector,error};
