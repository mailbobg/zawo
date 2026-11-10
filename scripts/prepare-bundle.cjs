'use strict';
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
module.exports = function prepareBundle(bundle) {
// Cocoa uses localized names in the application menu; Electron crypto reads
// the unlocalized Info.plist identity. Keep those responsibilities separate.
const resources = path.join(bundle, 'Contents/Resources');
for (const language of ['en', 'zh-Hans', 'zh-Hant', 'Base']) {
  const dir = path.join(resources, language + '.lproj');
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'InfoPlist.strings'), '"CFBundleName" = "Zawo";\n"CFBundleDisplayName" = "Zawo";\n');
}
execFileSync('/usr/bin/plutil', ['-replace', 'CFBundleDevelopmentRegion', '-string', 'en', path.join(bundle, 'Contents/Info.plist')]);
// Electron locates helpers using CFBundleName (also its persisted keychain name).
// Match those private paths while keeping the display name and main executable Zawo.
const frameworks = path.join(bundle, 'Contents/Frameworks');
for (const suffix of ['', ' (GPU)', ' (Plugin)', ' (Renderer)']) {
  const visible = 'Zawo Helper' + suffix;
  const legacy = 'Harbor Terminal Helper' + suffix;
  const from = path.join(frameworks, visible + '.app');
  const to = path.join(frameworks, legacy + '.app');
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    fs.renameSync(path.join(to, 'Contents/MacOS', visible), path.join(to, 'Contents/MacOS', legacy));
    const plist = path.join(to, 'Contents/Info.plist');
    for (const [key, value] of [['CFBundleExecutable', legacy], ['CFBundleName', legacy], ['CFBundleDisplayName', visible]]) {
      execFileSync('/usr/bin/plutil', ['-replace', key, '-string', value, plist]);
    }
  }
  if (!fs.existsSync(path.join(to, 'Contents/MacOS', legacy))) throw new Error('Missing Electron helper: ' + legacy);
}
};
