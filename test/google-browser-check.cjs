// Bounded live acceptance, excluded from offline regression. Fresh isolated profile.
const fs=require('node:fs'),path=require('node:path');process.argv.push('--self-test');const entry=require.resolve('./integration.cjs');
require.cache[entry]={id:entry,filename:entry,loaded:true,exports:async({window:win,browserPanel:browser})=>{
 if(browser.opened)throw Error('Browser must start hidden');
 browser.open('https://www.google.com/');if(browser.url!=='https://www.google.com/ncr')throw Error('NCR entry not selected');
 const end=Date.now()+25000;while(Date.now()<end){if(!browser.loading&&browser.title==='Google'&&browser.url==='https://www.google.com/')break;await new Promise(r=>setTimeout(r,100));}
 if(browser.url!=='https://www.google.com/'||browser.title!=='Google'||browser.error)throw Error('Fresh Google navigation failed: '+browser.url+' '+browser.error);
 console.log('PASS fresh cookie-free browser opened Google through NCR and landed on https://www.google.com/');
 await browser.action('reload');await new Promise(r=>setTimeout(r,2000));if(browser.url!=='https://www.google.com/')throw Error('Google reload redirected');
 console.log('PASS Google reload retains the main-site domain');
 await new Promise(r=>setTimeout(r,300));fs.writeFileSync(path.join(__dirname,'../shots/google-main-site.png'),(await win.webContents.capturePage()).toPNG());
}};require('../src/main.cjs');
