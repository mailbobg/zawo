const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Catch a library editor becoming a blocking popup or covering the list.
module.exports = async ({ window, until, pass }) => {
  const js = code => window.webContents.executeJavaScript(code, true);
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const initial = await js('window.harbor.snapshot()');
  const cases = [
    ['snippets', '#new-snippet', '#snippet-form'],
    ['keychain', '#new-key', '#key-form'],
    ['keychain', '#generate-key', '#key-form'],
    ['hosts', '#sidebar-add-group', '#group-form'],
    ['hosts', '#new-host', '#host-form'],
    ['forwarding', '#new-tunnel', '#tunnel-form'],
  ];
  for (const [view, opener, form] of cases) {
    await click(`[data-view="${view}"]`);
    await until(() => js(`!!document.querySelector(${JSON.stringify(opener)})`));
    await click(opener);
    assert.equal(await js('!!document.querySelector("dialog[open]")'), false, `${opener} must not block the library with a modal`);
    assert.equal(await js(`!!document.querySelector('#drawer-layer ${form}')`), true, `${form} is docked`);
    window.setSize(1280, 800);
    await js('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    fs.writeFileSync(path.join(__dirname, '../shots/editor-parity-' + opener.slice(1) + '.png'), (await window.webContents.capturePage()).toPNG());
    for (const width of [1280, 900, 820]) {
      window.setSize(width, 700);
      await js('new Promise(resolve => requestAnimationFrame(resolve))');
      const b = await js(`(() => {const d=document.querySelector('.drawer').getBoundingClientRect(),m=document.querySelector('#management').getBoundingClientRect(),f=document.querySelector('.drawer-footer').getBoundingClientRect();return {dock:d.left>=m.right-1,right:d.right<=innerWidth,bottom:f.bottom<=innerHeight,visible:f.height>0,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
      assert.deepEqual(b, { dock:true, right:true, bottom:true, visible:true, overflow:false }, `${opener} fits ${width}px`);
    }
    window.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});
    window.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});
    await until(() => js('document.querySelector("#drawer-layer").hidden'));
    assert.equal(await js(`!!document.querySelector(${JSON.stringify(form)})`), false, 'closed editor releases draft fields');
  }
  window.setSize(1280, 800);
  await click('[data-view="snippets"]');
  await click('#new-snippet');
  await click('[data-view="keychain"]');
  assert.equal(await js('document.querySelector("#drawer-layer").hidden'), true, 'navigation stays accessible and closes the editor');
  const after = await js('window.harbor.snapshot()');
  for (const key of ['snippets','groups','keys','hosts','tunnels']) assert.deepEqual(after[key], initial[key], `${key}: opening and cancelling never saves`);
  await click('#new-key');
  await js(`(() => {const f=document.querySelector('#key-form');f.elements.name.value='Invalid fixture';f.elements.credential.value='not-a-private-key';f.requestSubmit();})()`);
  await until(() => js(`!!document.querySelector('#key-error')?.textContent`));
  assert.equal(await js('document.querySelector("#drawer-layer").hidden'), false, 'validation errors stay in the editor');
  await click('[data-autosave-discard]');await until(()=>js('document.querySelector("#drawer-layer").hidden'));
  assert.equal(await js('!!document.querySelector("[name=credential]")'), false, 'closing clears key input from the page');
  await click('[data-view="snippets"]');
  await click('#new-snippet');
  await js(`(() => {const f=document.querySelector('#snippet-form');f.elements.name.value='Panel fixture';f.elements.command.value='printf panel';f.requestSubmit();})()`);
  await until(() => js(`document.querySelector('#drawer-layer').hidden && !!document.querySelector('[data-edit-snippet]')`));
  const snippet = await js(`window.harbor.snapshot().then(s=>s.snippets.find(x=>x.name==='Panel fixture'))`);
  await click(`[data-edit-snippet="${snippet.id}"]`);
  assert.equal(await js(`document.querySelector('#snippet-form [name=command]').value`), 'printf panel');
  await js(`document.querySelector('#snippet-form [name=command]').value='printf edited';document.querySelector('#snippet-form').requestSubmit()`);
  await until(() => js('document.querySelector("#drawer-layer").hidden'));
  assert.equal(await js(`window.harbor.snapshot().then(s=>s.snippets.find(x=>x.id===${JSON.stringify(snippet.id)}).command)`), 'printf edited');
  await js(`window.harbor.deleteSnippet(${JSON.stringify(snippet.id)})`);
  await click('[data-view="hosts"]');
  pass('all library editors dock without blocking or covering content; Escape/navigation close untouched editors');
  pass('docked editors retain validation errors, clear closed key fields, and save/edit snippets through real IPC');
};
