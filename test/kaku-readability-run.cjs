process.argv.push('--self-test');
const file=require.resolve('./integration.cjs');
require.cache[file]={id:file,filename:file,loaded:true,exports:async ctx=>{
 const until=async fn=>{const end=Date.now()+12000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out');};
 await require('./kaku-readability-ui.cjs')({...ctx,until,pass:console.log});
}};
require('../src/main.cjs');
