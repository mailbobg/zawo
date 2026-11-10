'use strict';
function webURL(input){
 if(typeof input!=='string'||input.length>8192||/[\x00-\x20\x7f]/.test(input.trim()))throw Error('Enter a valid HTTP or HTTPS address.');
 let value=input.trim();if(!value)throw Error('Enter a website address.');
 if(!/^[a-z][a-z\d+.-]*:/i.test(value)||/^(localhost|[\w.-]+\.\w+|127\.0\.0\.1):\d+(\/|$)/i.test(value))value=(/^(localhost|127\.|\[::1\])/.test(value)?'http://':'https://')+value;
 let u;try{u=new URL(value);}catch{throw Error('Enter a valid HTTP or HTTPS address.');}
 if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)throw Error('Only HTTP and HTTPS addresses without embedded passwords are supported.');
 return u.href;
}
function tunnelURL(config,state,protocol='http:'){
 if(config?.type!=='local')throw Error('Only local forwarding can open a website on this Mac.');
 if(state?.status!=='running'||!Number.isInteger(state.port)||state.port<1||state.port>65535)throw Error('Start the forwarding rule before opening its website.');
 let host=config.bindAddress;if(host==='0.0.0.0')host='127.0.0.1';if(host==='::')host='::1';if(host.includes(':')&&!host.startsWith('['))host=`[${host}]`;
 return webURL(`${protocol==='https:'?'https:':'http:'}//${host}:${state.port}/`);
}
function omniboxURL(input){
 if(typeof input!=='string'||input.length>8192||/[\x00-\x1f\x7f]/.test(input))throw Error('Enter a website or search term.');
 const value=input.trim();if(!value)throw Error('Enter a website or search term.');
 if(/^[a-z][a-z\d+.-]*:/i.test(value)||/^(localhost|\[::1\])(?:[:/]|$)/i.test(value)||/^[^\s/]+\.[^\s/]+/.test(value))return webURL(value);
 return 'https://www.google.com/search?q='+encodeURIComponent(value);
}
// A fresh preview session has no Google country preference. Its own NCR entry
// establishes the main-site preference without rewriting arbitrary redirects.
function navigationURL(input){
 const url=webURL(input),u=new URL(url);
 if(u.protocol==='https:'&&['google.com','www.google.com'].includes(u.hostname)&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash)return 'https://www.google.com/ncr';
 return url;
}
module.exports={webURL,tunnelURL,omniboxURL,navigationURL};
