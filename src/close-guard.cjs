'use strict';
class CloseGuard {
 constructor({summary,confirm,close}){Object.assign(this,{summary,confirm,closeOne:close});this.pending=null;}
 async allow(ids){const s=this.summary(ids);if(!s.sessions&&!s.transfers&&!s.tunnels)return true;if(this.pending)return false;this.pending=Promise.resolve().then(()=>this.confirm(s));try{return !!await this.pending;}finally{this.pending=null;}}
 async close(ids){if(!Array.isArray(ids)||ids.length>64||ids.some(id=>typeof id!=='string'))throw Error('Invalid sessions');ids=[...new Set(ids)];if(!await this.allow(ids))return false;for(const id of ids)await this.closeOne(id);return true;}
}
module.exports={CloseGuard};
