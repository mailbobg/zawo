'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {bundle, signingIdentity} = require('./sign-release.cjs');
const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist/release');
const profile = process.env.ZAWO_NOTARY_PROFILE;
const run = (command, args) => execFileSync(command, args, {cwd: root, stdio: 'inherit'});
const json = args => JSON.parse(execFileSync('/usr/bin/xcrun', ['notarytool', ...args, '--keychain-profile', profile, '--output-format', 'json'], {encoding: 'utf8'}));

function notarize(file, label) {
  const record = path.join(output, label + '-notarization.json');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  let submission = fs.existsSync(record) ? JSON.parse(fs.readFileSync(record)) : null;
  if (!submission || submission.sha256 !== sha256) {
    submission = {...json(['submit', file]), sha256};
    fs.writeFileSync(record, JSON.stringify(submission, null, 2) + '\n');
  }
  console.log(label, 'notarization submission:', submission.id);
  let result = json(['info', submission.id]);
  if (result.status === 'In Progress') result = json(['wait', submission.id, '--timeout', '10m']);
  fs.writeFileSync(record, JSON.stringify({...submission, ...result}, null, 2) + '\n');
  if (result.status !== 'Accepted') {
    run('/usr/bin/xcrun', ['notarytool', 'log', submission.id, '--keychain-profile', profile, path.join(output, label + '-notary-log.json')]);
    throw Error(label + ' notarization was not accepted: ' + result.status);
  }
  console.log(label, 'notarization Accepted');
}

try {
  if (!profile) throw Error('Set ZAWO_NOTARY_PROFILE to an existing notarytool Keychain profile. No password belongs in this project.');
  json(['history']); // Fail before changing artifacts if credentials or agreements are invalid.
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle]);
  // A stapled application can be reused when resuming after a DMG upload failure.
  let stapled = false;
  try { execFileSync('/usr/bin/xcrun', ['stapler', 'validate', bundle], {stdio: 'pipe'}); stapled = true; } catch {}
  if (!stapled) {
    const zip = path.join(output, pkg.build.productName + '-notary.zip');
    fs.rmSync(zip, {force: true});
    run('/usr/bin/ditto', ['-c', '-k', '--keepParent', bundle, zip]);
    notarize(zip, 'app');
    run('/usr/bin/xcrun', ['stapler', 'staple', bundle]);
  }
  run('/usr/bin/xcrun', ['stapler', 'validate', bundle]);
  run('/usr/sbin/spctl', ['--assess', '--type', 'execute', '--verbose=2', bundle]);
  run(path.join(root, 'node_modules/.bin/electron-builder'), ['--prepackaged', bundle, '--mac', 'dmg', '--arm64', '--publish', 'never', '--config.directories.output=dist/release']);
  const dmg = path.join(output, `${pkg.build.productName}-${pkg.version}-arm64.dmg`);
  run('/usr/bin/codesign', ['--force', '--sign', signingIdentity(), '--timestamp', dmg]);
  notarize(dmg, 'dmg');
  run('/usr/bin/xcrun', ['stapler', 'staple', dmg]);
  run('/usr/bin/xcrun', ['stapler', 'validate', dmg]);
  run('/usr/bin/codesign', ['--verify', '--verbose=2', dmg]);
  run('/usr/sbin/spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=2', dmg]);
  // Builder's update block map predates the final DMG signature/ticket. This app
  // has no auto-updater; do not distribute a stale update artifact.
  fs.rmSync(dmg + '.blockmap', {force: true});
  const hash = crypto.createHash('sha256').update(fs.readFileSync(dmg)).digest('hex');
  fs.writeFileSync(dmg + '.sha256', hash + '  ' + path.basename(dmg) + '\n');
  console.log('Notarized release ready:', dmg);
} catch (error) { console.error(error.message); process.exitCode = 1; }
