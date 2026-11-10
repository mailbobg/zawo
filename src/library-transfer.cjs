'use strict';
const {randomUUID}=require('node:crypto');
function exportLibrary(data){return {format:'harbor-hosts',version:1,groups:data.groups.map(({id,name})=>({id,name})),hosts:data.hosts.map(h=>Object.fromEntries(['id','label','address','port','username','auth','jumpHostId','groupId','tags'].map(k=>[k,h[k]])))};}
function prepareImport(store,input,validateHost){
 if(!input||input.format!=='harbor-hosts'||input.version!==1||!Array.isArray(input.hosts)||input.hosts.length>5000||!Array.isArray(input.groups)||input.groups.length>1000)throw Error('Choose a Zawo host configuration JSON file (up to 5,000 hosts).');
 const ids=new Map(),groupIds=new Map(),groups=store.data.groups.map(g=>({...g}));
 for(const g of input.groups){if(!g||typeof g.id!=='string'||!g.id||groupIds.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>80||g.name.includes('\0'))throw Error('Invalid or duplicate group');const name=g.name.trim(),existing=groups.find(x=>x.name.toLowerCase()===name.toLowerCase());const id=existing?.id||randomUUID();if(!existing)groups.push({id,name});groupIds.set(g.id,id);}
 for(const h of input.hosts){if(!h||typeof h.id!=='string'||!h.id||ids.has(h.id))throw Error('Invalid or duplicate host ID');ids.set(h.id,randomUUID());}
 const imported=input.hosts.map(h=>{if(h.groupId&&!groupIds.has(h.groupId))throw Error('Imported group reference not found');if(h.jumpHostId&&!ids.has(h.jumpHostId))throw Error('Imported jump host reference not found');return {...validateHost({...h,keyId:'',startupSnippetId:'',id:ids.get(h.id),groupId:groupIds.get(h.groupId)||'',jumpHostId:ids.get(h.jumpHostId)||''}),createdAt:new Date().toISOString()};});
 const hosts=[...store.data.hosts,...imported];for(const h of imported)store.chain(h.id,hosts);
 return {data:{...store.data,groups,hosts},summary:{hosts:imported.length,groups:groups.length-store.data.groups.length}};
}
module.exports={exportLibrary,prepareImport};
