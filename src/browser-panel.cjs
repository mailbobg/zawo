'use strict';
const {WebContentsView,session,shell,clipboard}=require('electron');
const {randomUUID}=require('node:crypto');
const {webURL,tunnelURL,omniboxURL,navigationURL}=require('./browser-policy.cjs');
const {BrowserDownloads}=require('./browser-downloads.cjs');
class BrowserPanel {
 constructor({win,service,store}){
  Object.assign(this,{win,service,store,tabs:[],activeId:null,layout:null,opened:false,disposed:false});
  this.session=session.fromPartition('zawo-web-preview');
  this.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));this.session.setPermissionCheckHandler(()=>false);
  this.session.webRequest.onBeforeRequest((d,cb)=>{let ok=false;try{ok=['http:','https:','ws:','wss:','data:','blob:'].includes(new URL(d.url).protocol)||d.url==='about:blank';}catch{}cb({cancel:!ok});});
  this.downloads=new BrowserDownloads({session:this.session,owns:wc=>this.tabs.some(t=>t.view?.webContents===wc),changed:()=>this.send()});
  this.newTab(false);this.onTunnel=e=>this.tunnelChanged(e);service.on('tunnel',this.onTunnel);
  win.on('closed',()=>this.dispose());win.on('resize',()=>{for(const t of this.tabs)t.view?.setVisible(false);this.send('browser-layout');});
 }
 get active(){return this.tabs.find(t=>t.id===this.activeId);}
 get view(){return this.active?.view||null;}get link(){return this.active?.link||null;}get url(){return this.active?.url||'';}get title(){return this.active?.title||'';}get error(){return this.active?.error||'';}get loading(){return !!this.active?.loading;}
 send(kind='browser',extra={}){if(!this.disposed&&!this.win.isDestroyed())this.win.webContents.send('harbor:event',{kind,...(kind==='browser'?this.snapshot():{}),...extra});}
 snapshot(){const t=this.active,contents=t?.view?.webContents,wc=contents&&!contents.isDestroyed()?contents:null;return {opened:this.opened,activeId:this.activeId,url:this.url,title:this.title,error:this.error,loading:this.loading,zoom:wc?wc.getZoomFactor():(t?.zoom||1),canBack:wc?wc.navigationHistory.canGoBack():!!(t?.history?.index>0),canForward:wc?wc.navigationHistory.canGoForward():!!(t?.history&&t.history.index<t.history.entries.length-1),link:t?.link?{id:t.link.id,name:t.link.name,status:t.link.status,ephemeral:!!t.link.ephemeral}:null,tabs:this.tabs.map(({id,url,title,loading,error})=>({id,url,title,loading,error})),downloads:this.downloads.snapshot()};}
 notice(message){this.send('warning',{message});}
 newTab(reveal=true){if(this.tabs.length>=32)throw Error('Close a browser tab before opening another (32 tab limit).');const t={id:randomUUID(),view:null,link:null,url:'',title:'',error:'',loading:false,history:null,zoom:1};this.tabs.push(t);this.activeId=t.id;if(reveal)this.opened=true;this.updateVisibility();this.send();return t;}
 selectTab(id){if(!this.tabs.some(t=>t.id===id))throw Error('Browser tab no longer exists.');this.activeId=id;this.updateVisibility();this.send();}
 closeTab(id){const i=this.tabs.findIndex(t=>t.id===id);if(i<0)throw Error('Browser tab no longer exists.');const [t]=this.tabs.splice(i,1);this.destroyView(t);if(this.activeId===id)this.activeId=this.tabs[Math.min(i,this.tabs.length-1)]?.id||null;if(!this.tabs.length)this.newTab(false);this.updateVisibility();this.send();}
 destroyView(t){const view=t.view;t.view=null;if(view){if(!this.win.isDestroyed())this.win.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close({waitForBeforeUnload:false});}}
 suspend(t){
  const wc=t.view?.webContents;if(!wc||wc.isDestroyed()){this.destroyView(t);t.loading=false;return;}
  t.zoom=wc.getZoomFactor();const entries=wc.navigationHistory.getAllEntries(),index=wc.navigationHistory.getActiveIndex();
  // Chromium keeps lightweight history/page state; the live DOM, JS heap and
  // renderer process are released. A pending navigation resumes its target URL.
  t.history=!wc.isLoadingMainFrame()&&entries[index]?.url===t.url?{entries,index}:null;
  this.destroyView(t);t.loading=false;
 }
 resume(t){
  if(!this.opened||!t||t.view||!t.url||t.error||(t.link&&t.link.status!=='running'))return;
  const history=t.history;t.history=null;const wc=this.ensure(t);wc.setZoomFactor(t.zoom||1);t.loading=true;
  (history?wc.navigationHistory.restore(history):wc.loadURL(t.url)).catch(()=>{});
 }
 ensure(t=this.active){
  if(t.view&&!t.view.webContents.isDestroyed())return t.view.webContents;
  t.view=new WebContentsView({webPreferences:{session:this.session,nodeIntegration:false,nodeIntegrationInSubFrames:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,navigateOnDragDrop:false,backgroundThrottling:true}});
  t.view.setBackgroundColor('#ffffff');t.view.setVisible(false);this.win.contentView.addChildView(t.view);const wc=t.view.webContents,live=()=>!this.disposed&&this.tabs.includes(t)&&t.view?.webContents===wc;
  wc.setWindowOpenHandler(({url})=>{try{const valid=webURL(url);setImmediate(()=>{if(live())try{this.navigate(valid,true,this.newTab());}catch(e){this.notice(e.message);}});}catch{this.notice('This link cannot open in the preview browser.');}return {action:'deny'};});
  const guard=(e,url)=>{try{webURL(url);}catch{e.preventDefault();this.notice('Only HTTP and HTTPS pages can open here.');}};
  wc.on('will-navigate',guard);wc.on('will-redirect',guard);wc.on('will-attach-webview',e=>e.preventDefault());
  wc.on('did-start-loading',()=>{if(!live())return;t.loading=true;t.error='';this.send();});wc.on('did-stop-loading',()=>{if(!live())return;t.loading=false;this.send();});
  wc.on('did-navigate',(_e,url)=>{if(live())this.navigated(t,url);});wc.on('did-navigate-in-page',(_e,url,main)=>{if(main&&live())this.navigated(t,url);});
  wc.on('page-title-updated',(_e,title)=>{if(live()){t.title=title;this.send();}});
  wc.on('did-fail-load',(_e,code,_description,url,main)=>{if(!live()||!main||code===-3)return;t.url=url||t.url;t.loading=false;t.error=code<=-200&&code>=-299?'The certificate could not be verified. Check the HTTPS address or use your system browser.':'Could not load this page. Check the address and forwarding connection, then retry.';this.updateVisibility();this.send();});
  wc.on('render-process-gone',()=>{if(live()){t.loading=false;t.error='The webpage stopped responding. Reload to try again.';this.updateVisibility();this.send();}});
  wc.on('before-input-event',(e,input)=>{if(input.type!=='keyDown'||!(input.meta||input.control))return;const key=input.key.toLowerCase();if(key==='l'){e.preventDefault();this.win.webContents.focus();this.send('browser-address');}else if(key==='t'||key==='w'){e.preventDefault();this.action(key==='t'?'new-tab':'close-tab',t.id).catch(err=>this.notice(err.message));}else if(key==='r'){e.preventDefault();this.action('reload').catch(()=>{});}});
  return wc;
 }
 navigated(t,url){if(!this.tabs.includes(t))return;t.url=url;t.error='';if(t.link&&new URL(url).origin!==t.link.origin)t.link=null;this.updateVisibility();this.send();}
 navigate(input,reveal=true,t=this.active){const url=navigationURL(input);if(t.link&&new URL(url).origin!==t.link.origin)t.link=null;if(reveal)this.opened=true;t.url=url;t.error='';t.title='';t.history=null;if(!this.opened||(!t.view&&t!==this.active)){t.loading=false;this.send();return this.snapshot();}const wc=this.ensure(t);wc.setZoomFactor(t.zoom||wc.getZoomFactor());this.updateVisibility();wc.loadURL(url).catch(()=>{});this.send();return this.snapshot();}
 open(input){this.opened=true;if(input)return this.navigate(input);this.updateVisibility();this.send();return this.snapshot();}
 openCLI({url,forwardId,remoteName}){if(url===null){this.newTab();this.win.webContents.focus();this.send('browser-address');return this.snapshot();}let t=this.tabs.find(t=>t.url===url);if(!t)t=this.active?.url?this.newTab():this.active;this.activeId=t.id;t.link=forwardId?{id:forwardId,name:remoteName+' · CLI preview',status:'running',origin:new URL(url).origin,ephemeral:true}:null;return this.navigate(url,true,t);}
 openTunnel(id){const config=this.store.getTunnel(id),state=this.service.tunnels.snapshot().find(s=>s.id===id),url=tunnelURL(config,state,config.targetPort===443?'https:':'http:');let t=this.tabs.find(t=>t.link?.id===id);if(!t)t=this.active?.url?this.newTab():this.active;this.activeId=t.id;t.link={id,name:config.name,status:state.status,origin:new URL(url).origin};return this.navigate(url,true,t);}
 tunnelChanged(e){for(const t of this.tabs){if(t.link?.id!==e.id)continue;const previous=t.link.status;t.link.status=e.status;
  if(e.status==='running'&&previous!=='running'){try{const old=new URL(t.url),next=new URL(tunnelURL(this.store.getTunnel(e.id),e,old.protocol));next.pathname=old.pathname;next.search=old.search;next.hash=old.hash;t.link.origin=next.origin;this.navigate(next.href,false,t);}catch{}}
  if(e.status!=='running')t.view?.webContents.stop();
 }this.updateVisibility();this.send();}
 setLayout(layout){if(this.disposed||this.win.isDestroyed())return;if(!layout||!['x','y','width','height'].every(k=>Number.isFinite(layout[k])))throw Error('Invalid browser bounds');const scale=this.win.webContents.getZoomFactor(),[w,h]=this.win.getContentSize();const x=Math.max(0,Math.min(w,Math.round(layout.x*scale))),y=Math.max(40,Math.min(h,Math.round(layout.y*scale)));this.layout={x,y,width:Math.max(0,Math.min(w-x,Math.round(layout.width*scale))),height:Math.max(0,Math.min(h-y,Math.round(layout.height*scale))),visible:layout.visible===true};this.updateVisibility();}
 updateVisibility(){if(this.disposed)return;this.resume(this.active);const r=this.layout;for(const t of this.tabs){if(!t.view)continue;const visible=t.id===this.activeId&&this.opened&&r?.visible&&r.width>0&&r.height>0&&!t.error&&(!t.link||t.link.status==='running');if(r)t.view.setBounds({x:r.x,y:r.y,width:r.width,height:r.height});t.view.setVisible(!!visible);}}
 async action(name,arg){const t=this.active,wc=t?.view?.webContents;
  if(typeof name!=='string')throw Error('Invalid browser action');
  if(name==='close'){this.opened=false;for(const tab of this.tabs)this.suspend(tab);this.win.webContents.focus();}
  else if(name==='new-tab'){this.newTab();this.win.webContents.focus();this.send('browser-address');}
  else if(name==='select-tab')this.selectTab(arg);
  else if(name==='close-tab')this.closeTab(arg||this.activeId);
  else if(name==='navigate')return this.navigate(omniboxURL(arg));
  else if(name==='back'){if(wc?.navigationHistory.canGoBack())wc.navigationHistory.goBack();}
  else if(name==='forward'){if(wc?.navigationHistory.canGoForward())wc.navigationHistory.goForward();}
  else if(name==='reload'){if(t?.url){t.error='';if(wc&&!wc.isDestroyed())wc.reload();else t.history=null;this.updateVisibility();}}
  else if(name==='stop')wc?.stop();
  else if(name==='external'){if(t?.url)await shell.openExternal(webURL(t.url));}
  else if(name==='capture-preview'){return {...this.snapshot(),previewImage:wc&&!wc.isDestroyed()&&t.url&&!t.error?(await wc.capturePage()).toDataURL():null};}
  else if(name==='copy-url'){if(t?.url)clipboard.writeText(webURL(t.url));}
  else if(['zoom-in','zoom-out','zoom-reset'].includes(name)){if(t){t.zoom=name==='zoom-reset'?1:Math.max(.5,Math.min(2,Math.round(((wc?wc.getZoomFactor():t.zoom||1)+(name==='zoom-in'?.1:-.1))*10)/10));wc?.setZoomFactor(t.zoom);}}
  else if(name.startsWith('download-'))this.downloads.action(name,arg);
  else if(name==='focus')wc?.focus();
  else throw Error('Unknown browser action');
  this.send();return this.snapshot();
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.service.removeListener('tunnel',this.onTunnel);this.downloads.dispose();for(const t of this.tabs)this.destroyView(t);this.tabs=[];}
}
module.exports={BrowserPanel};
