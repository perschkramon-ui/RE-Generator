import { writeFileSync } from 'fs';

const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#1d4ed8"/>
  <text x="50" y="42" font-family="Arial,sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="white">RE</text>
  <text x="50" y="62" font-family="Arial,sans-serif" font-size="11" text-anchor="middle" fill="#93c5fd">Generator</text>
  <rect x="20" y="70" width="60" height="3" rx="1.5" fill="#3b82f6"/>
</svg>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#1d4ed8"/>
  <text x="50" y="67" font-family="Arial,sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="white">R</text>
</svg>`;

writeFileSync('public/icons/icon-512.svg', icon512);
writeFileSync('public/icons/icon-192.svg', icon512);
writeFileSync('public/favicon.svg', favicon);
console.log('Icons generated.');
