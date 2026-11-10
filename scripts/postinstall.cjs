const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
// Newer npm versions may suppress dependency install scripts. Run Electron's
// official installer explicitly only if its standard runtime is missing.
const electronRoot=path.dirname(require.resolve('electron/package.json'));
const marker=path.join(electronRoot,'path.txt');
const runtimeReady=()=>fs.existsSync(marker)&&fs.existsSync(path.join(electronRoot,'dist',fs.readFileSync(marker,'utf8').trim()));
if(!runtimeReady())execFileSync(process.execPath,[path.join(electronRoot,'install.js')],{stdio:'inherit'});
if(!runtimeReady())throw new Error('Electron runtime is incomplete. Use Node.js 24 LTS and rerun npm ci.');
// node-pty 1.1 supplies an ABI-stable Node-API Apple Silicon prebuild.
const helper=path.join(__dirname,'../node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper');
if(process.platform==='darwin'&&process.arch==='arm64'&&fs.existsSync(helper))fs.chmodSync(helper,0o755);
console.log('Zawo native runtime ready');
