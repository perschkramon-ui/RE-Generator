const fs = require('fs');

const s192 = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">',
  '<rect width="192" height="192" rx="35" fill="#1d4ed8"/>',
  '<text x="96" y="115" font-family="Arial,sans-serif" font-size="90" font-weight="bold" text-anchor="middle" fill="white">RE</text>',
  '</svg>'
].join('');

const s512 = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
  '<rect width="512" height="512" rx="92" fill="#1d4ed8"/>',
  '<text x="256" y="320" font-family="Arial,sans-serif" font-size="240" font-weight="bold" text-anchor="middle" fill="white">RE</text>',
  '</svg>'
].join('');

const favicon = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 100 100">',
  '<rect width="100" height="100" rx="18" fill="#1d4ed8"/>',
  '<text x="50" y="68" font-family="Arial,sans-serif" font-size="55" font-weight="bold" text-anchor="middle" fill="white">R</text>',
  '</svg>'
].join('');

fs.writeFileSync('public/icons/icon-192.png', Buffer.from(s192));
fs.writeFileSync('public/icons/icon-512.png', Buffer.from(s512));
fs.writeFileSync('public/apple-touch-icon.png', Buffer.from(s192));
fs.writeFileSync('public/favicon.svg', favicon);
console.log('Icons created.');
