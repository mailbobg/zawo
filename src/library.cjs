'use strict';
function selectHosts(hosts,{sort='newest',tags=[]}={}){const list=hosts.filter(h=>tags.every(t=>(h.tags||[]).includes(t)));return list.sort((a,b)=>{if(sort==='az'||sort==='za')return (sort==='az'?1:-1)*(a.label.localeCompare(b.label,undefined,{numeric:true,sensitivity:'base'})||a.id.localeCompare(b.id));const order=String(a.createdAt||'').localeCompare(String(b.createdAt||''));return (sort==='oldest'?1:-1)*order;});}
module.exports={selectHosts};
