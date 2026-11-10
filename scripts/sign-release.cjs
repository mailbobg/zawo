'use strict';
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const {signAsync} = require('@electron/osx-sign');
const pkg = require('../package.json');
const bundle = path.resolve(__dirname, '../dist/release/mac-arm64', pkg.build.productName + '.app');

function signingIdentity() {
  const identities = execFileSync('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], {encoding: 'utf8'});
  const names = [...identities.matchAll(/"(Developer ID Application: [^"]+)"/g)].map(m => m[1]);
  const selected = process.env.ZAWO_SIGN_IDENTITY || (names.length === 1 ? names[0] : '');
  if (!names.includes(selected)) throw Error('Set ZAWO_SIGN_IDENTITY to a valid Developer ID Application identity in this Mac’s Keychain.');
  return selected;
}

async function sign() {
  const identity = signingIdentity();
  require('./prepare-bundle.cjs')(bundle);
  // Sign nested frameworks and native modules before the outer bundle. Use the
  // Electron-maintained per-helper entitlements and secure timestamp defaults.
  await signAsync({app: bundle, identity, platform: 'darwin', type: 'distribution',
    version: pkg.devDependencies.electron, preAutoEntitlements: false,
    preEmbedProvisioningProfile: false, optionsForFile: () => ({hardenedRuntime: true}),
    ignore: file => {
      if (fs.statSync(file).isDirectory()) return false;
      // The signer also discovers binary data such as Chromium locale .pak
      // files and Windows prebuilds. Only Mach-O code needs an inner signature;
      // ordinary resources are sealed by their containing bundle signature.
      const header = Buffer.alloc(4), fd = fs.openSync(file, 'r');
      try { fs.readSync(fd, header, 0, 4, 0); } finally { fs.closeSync(fd); }
      return !['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca'].includes(header.toString('hex'));
    }});
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundle], {stdio: 'inherit'});
  console.log('Developer ID signed:', bundle, '\nNotarization still required. Run npm run notarize:release.');
}
if (require.main === module) sign().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = {bundle, signingIdentity};
