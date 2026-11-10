// Actual native interaction against production main/renderer, disposable profile.
const {app}=require('electron');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'harbor-native-autosave-'));
app.setPath('userData',root);
app.on('will-quit',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'preferences.json'),'utf8'));
 const snippets=data.snippets||[];
 const result={native_quit:true,count:snippets.length,name:snippets[0]?.name,command:snippets[0]?.command,passed:snippets.length===1&&snippets[0].name==='Native autosave'&&snippets[0].command==='printf native_quit_flush'};
 fs.writeFileSync(path.join(__dirname,'../logs/autosave-native.json'),JSON.stringify(result,null,2)+'\n');
 fs.rmSync(root,{recursive:true,force:true});
});
console.log('Native autosave fixture uses a disposable profile.');
require('../src/main.cjs');
