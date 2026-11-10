'use strict';
// Capture the real app with disposable demo data and loopback SSH/SFTP only.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { utils } = require('ssh2');
const { dialog, desktopCapturer, systemPreferences } = require('electron');
const { fixture } = require('../test/fixture.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
process.argv.push('--self-test');
const entry = require.resolve('../test/integration.cjs');
require.cache[entry] = { id: entry, filename: entry, loaded: true, exports: async context => {
  const { window: win, store, applicationService: service, browserPanel: browser } = context;
  const demo = fs.mkdtempSync(path.join('/tmp', 'zawo-demo-'));
  const local = path.join(demo, 'Local'), remote = path.join(demo, 'Remote');
  for (const dir of [local, remote]) {
    fs.mkdirSync(dir);
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'README.md'), '# Demo project\nFiles for the Zawo documentation screenshots.\n');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo-project', private: true }, null, 2));
    fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Hello from Zawo</h1>\n');
  }
  const ssh = await fixture(remote);
  const web = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><title>Project preview</title><style>body{margin:48px 32px;font:16px -apple-system,sans-serif;color:#24342c;background:#f4f5f3}small{color:#397657}h1{font-size:38px;letter-spacing:-1.5px;line-height:1.1;margin:28px 0}p{line-height:1.7;color:#5e6962}section{margin-top:32px;padding:24px;background:white;border-radius:20px}b{display:block;margin-bottom:12px;color:#24714e}</style><small>ZAWO / LIVE PREVIEW</small><h1>Your terminal.<br>Your web workspace.</h1><p>This demo page is served through an active SSH port forward.</p><section><b>Connected</b><p>Keep your shell and project preview side by side.</p></section>');
  });
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const ui = code => win.webContents.executeJavaScript(code, true);
  const click = selector => ui(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const until = async (check, label) => {
    for (let i = 0; i < 240; i++) { if (await check()) return; await wait(50); }
    throw Error('Screenshot setup timed out: ' + label);
  };
  const output = path.resolve(__dirname, '../docs/screenshots');
  fs.mkdirSync(output, { recursive: true });
  const shot = async name => {
    await until(() => ui('document.querySelector("#toast").hidden'), 'toast dismissed');
    await ui('document.activeElement?.blur()');
    await wait(400);
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') {
      throw Error('Native window capture requires macOS Screen Recording permission for Electron.');
    }
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 2560, height: 1600 } });
    const source = sources.find(item => item.id === win.getMediaSourceId());
    if (!source || source.thumbnail.isEmpty()) throw Error('Native window screenshot unavailable');
    fs.writeFileSync(path.join(output, name + '.png'), source.thumbnail.toPNG());
    console.log('CAPTURED ' + name);
  };
  const originalDialog = dialog.showOpenDialog;
  dialog.showOpenDialog = async (window, options) => options?.title === 'Choose a local folder'
    ? { canceled: false, filePaths: [local] } : originalDialog(window, options);
  try {
    const development = store.saveGroup({ name: 'Development' });
    const infrastructure = store.saveGroup({ name: 'Infrastructure' });
    const host = store.saveHost({ label: 'Development server', address: '127.0.0.1', port: ssh.port, username: 'fixture', auth: 'password', saveCredential: true, credential: 'throwaway-password', groupId: development.id, tags: ['web', 'demo'] });
    const gateway = store.saveHost({ label: 'Gateway', address: 'gateway.example.com', username: 'developer', groupId: infrastructure.id, tags: ['jump'] });
    store.saveHost({ label: 'Staging server', address: 'staging.example.com', username: 'developer', jumpHostId: gateway.id, groupId: infrastructure.id, tags: ['staging'] });
    store.trust('127.0.0.1:' + ssh.port, 'SHA256:' + createHash('sha256').update(utils.parseKey(ssh.hostKey).getPublicSSH()).digest('base64').replace(/=+$/, ''));
    const tunnel = store.saveTunnel({ name: 'Project preview', type: 'local', hostId: host.id, bindAddress: '127.0.0.1', bindPort: 0, targetAddress: '127.0.0.1', targetPort: web.address().port, autoReconnect: true });
    await ui(`window.harbor.saveSnippet({name:'Working tree status',command:'git status --short',description:'Review local changes before committing.'})`);
    await ui(`window.harbor.saveSnippet({name:'Listening ports',command:'lsof -nP -iTCP -sTCP:LISTEN',description:'Find development services on this machine.'})`);
    await win.webContents.reload();
    win.setSize(1280, 800); win.show(); win.focus();
    await until(() => ui('!!document.querySelector("#new-host")'), 'host library');
    await shot('hosts');
    await click('[data-view="snippets"]'); await shot('snippets');
    await click('[data-view="sftp"]');
    await click('#choose-local-folder');
    await until(() => ui('document.querySelector("#local-pane").textContent.includes("README.md")'), 'local files');
    await ui(`document.querySelector('#sftp-host').value=${JSON.stringify(host.id)};document.querySelector('#sftp-connect-form').requestSubmit()`);
    await until(() => ui('document.querySelector("#remote-pane").textContent.includes("README.md")'), 'remote files');
    await shot('sftp');
    await click('#disconnect-sftp');
    await click('[data-view="forwarding"]');
    await click('[data-tunnel-browser]');
    await until(() => browser.link?.id === tunnel.id && !browser.loading && browser.title === 'Project preview', 'forwarded page');
    await browser.action('close');
    await shot('port-forwarding');
    service.options.cwd = local;
    service.options.localEnv = { ...service.options.localEnv, PS1: 'demo@zawo % ', PROMPT: 'demo@zawo % ' };
    for (let i = 0; i < 2; i++) {
      await click('#new-tab'); await click('#new-local-session');
      await until(() => service.sessions.size === i + 1, 'terminal ' + i);
    }
    await click('[data-tab]');
    await ui(`(()=>{const source=document.querySelectorAll('.session-tab')[1],target=document.querySelector('.terminal-pane'),s=source.getBoundingClientRect(),t=target.getBoundingClientRect(),base={bubbles:true,pointerId:8,isPrimary:true,pointerType:'mouse',button:0};source.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:s.x+80,clientY:s.y+15}));document.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:t.right-4,clientY:t.y+t.height/2}));})()`);
    await until(() => ui('document.querySelectorAll(".terminal-pane").length===2'), 'split workspace');
    const ids = [...service.sessions.keys()];
    service.write(ids[0], "clear; printf 'Zawo development workspace\\n\\n'; ls -1\r");
    service.write(ids[1], "clear; printf 'Independent shell session\\n\\n'; printf 'Current directory: '; basename \"$PWD\"; printf '\\nProject files: '; find . -type f | wc -l\r");
    await wait(700); await shot('terminal-split');
    await browser.openTunnel(tunnel.id);
    await until(() => browser.view?.getVisible() && !browser.loading, 'browser beside terminal');
    await shot('browser');
  } finally {
    dialog.showOpenDialog = originalDialog;
    browser.dispose(); service.closeAll(); await ssh.close();
    web.closeAllConnections(); await new Promise(resolve => web.close(resolve));
    fs.rmSync(demo, { recursive: true, force: true });
  }
} };
require('../src/main.cjs');
