const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {AgentIntegrations}=require('../src/agent-integrations.cjs');
function setup(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'zawo-rules-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,manager:new AgentIntegrations({home,env:{}})};}
test('bundled integrations preserve existing instructions, install once, and remove only the managed block',t=>{
 const {home,manager}=setup(t);const file=path.join(home,'.codex/AGENTS.md'),original='# My rules\nKeep this unchanged.\n';fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,original);
 manager.set('codex',true);const first=fs.readFileSync(file,'utf8');assert.ok(first.startsWith(original));assert.match(first,/zawo browser open/);assert.match(first,/打开浏览器/);assert.equal(manager.snapshot().agents.find(a=>a.id==='codex').installed,true);
 const backups=fs.readdirSync(manager.backupDir);manager.set('codex',true);assert.equal(fs.readFileSync(file,'utf8'),first);assert.deepEqual(fs.readdirSync(manager.backupDir),backups);
 fs.appendFileSync(file,'\nLater user instruction.\n');manager.set('codex',false);assert.equal(fs.readFileSync(file,'utf8'),original+'\nLater user instruction.\n');assert.equal(fs.readFileSync(path.join(manager.backupDir,backups[0]),'utf8'),original);
});
test('all supported agents have independent global paths and custom directories are honored',t=>{
 const {home}=setup(t);const manager=new AgentIntegrations({home,env:{CODEX_HOME:path.join(home,'custom-codex'),CLAUDE_CONFIG_DIR:path.join(home,'custom-claude'),XDG_CONFIG_HOME:path.join(home,'xdg')}});
 for(const id of ['codex','claude','gemini','opencode']){manager.set(id,true);const item=manager.snapshot().agents.find(a=>a.id===id);assert.ok(item.installed);assert.ok(fs.existsSync(item.path));}
 assert.equal(manager.snapshot().agents[0].path,path.join(home,'custom-codex/AGENTS.md'));assert.match(manager.snapshot().agents.find(a=>a.id==='opencode').path,/xdg\/opencode\/AGENTS.md$/);
});
test('malformed managed blocks and symlinks cannot overwrite unrelated instructions',t=>{
 const {home,manager}=setup(t);const file=path.join(home,'.claude/CLAUDE.md');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'private original');const target=path.join(home,'.codex/AGENTS.md');fs.mkdirSync(path.dirname(target),{recursive:true});fs.symlinkSync(file,target);assert.throws(()=>manager.set('codex',true),/symbolic|regular/);assert.equal(fs.readFileSync(file,'utf8'),'private original');
 fs.writeFileSync(file,'<!-- Zawo browser integration: start -->\nunfinished');assert.throws(()=>manager.set('claude',true),/incomplete|markers/);assert.match(manager.snapshot().agents.find(a=>a.id==='claude').error,/incomplete|markers/);assert.throws(()=>manager.set('../../bad',true),/Unknown/);
});
