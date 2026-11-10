'use strict';
// Convert approved transparent artwork into native macOS icon sizes.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const assets=path.resolve(__dirname,'../assets'),set=path.join(assets,'awzo.iconset');
fs.mkdirSync(set,{recursive:true});
for(const size of [16,32,128,256,512])for(const scale of [1,2]){
 const output=path.join(set,`icon_${size}x${size}${scale===2?'@2x':''}.png`);
 execFileSync('/usr/bin/sips',['-z',String(size*scale),String(size*scale),path.join(assets,'awzo.png'),'--out',output],{stdio:'pipe'});
}
execFileSync('/usr/bin/iconutil',['-c','icns',set,'-o',path.join(assets,'awzo.icns')]);
console.log('Zawo macOS icon generated (16–1024 px)');
