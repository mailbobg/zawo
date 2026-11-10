const assert=require('node:assert/strict');
module.exports=async({window,until,pass})=>{
 const js=c=>window.webContents.executeJavaScript(c,true),click=s=>js(`document.querySelector(${JSON.stringify(s)}).click()`);
 await click('[data-view="hosts"]');await click('#host-options');assert.equal(await js(`document.querySelector('#host-menu').hidden`),false);
 await click('#create-group');assert.equal(await js(`!document.querySelector('#drawer-layer').hidden&&!!document.querySelector('#group-form')`),true);await click('#cancel-group');
 await click('#host-options');await click('#manage-groups');assert.equal(await js(`document.body.dataset.view`),'groups');
 await click('[data-view="hosts"]');await click('#host-options');await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);assert.equal(await js(`document.querySelector('#host-menu').hidden`),true);
 await click('#new-host');
 const select=async(selector,index)=>{assert.ok(await js(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});s.click();if(!s.isConnected)return false;s.selectedIndex=${index};s.dispatchEvent(new Event('change',{bubbles:true}));const v=s.value;s.blur();return s.isConnected&&document.querySelector(${JSON.stringify(selector)}).value===v;})()`),'select node and value survive click/change: '+selector);};
 for(const [name,index]of [['auth',1],['groupId',1],['jumpHostId',1]])await select(`#host-form [name="${name}"]`,index);
 assert.equal(await js(`document.querySelector('#host-form [name="credential"]').tagName`),'TEXTAREA');await select('#host-form [name="auth"]',0);assert.equal(await js(`document.querySelector('#host-form [name="credential"]').type`),'password');await click('[data-autosave-discard]');await until(()=>js(`document.querySelector('#drawer-layer').hidden`));
 await click('[data-view="forwarding"]');await click('#new-tunnel');await select('#tunnel-form [name="hostId"]',1);
 for(const type of ['remote','dynamic','local']){await click(`[data-forward-type="${type}"]`);assert.equal(await js(`document.querySelector('#tunnel-form [name="type"]').value`),type);}
 await click('#cancel-tunnel');await click('[data-view="sftp"]');await until(()=>js(`!!document.querySelector('#sftp-host')`));await select('#sftp-host',1);await click('[data-view="hosts"]');
 pass('host action menu and all host/auth/group/jump/forwarding/SFTP selectors retain nodes and selected values');
};
