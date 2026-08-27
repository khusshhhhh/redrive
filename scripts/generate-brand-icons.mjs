import { writeFile } from "node:fs/promises";

import sharp from "sharp";

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3B3B3B"/>
      <stop offset="1" stop-color="#636363"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#tile)"/>
  <path d="M9 64C17 50 24 42 24 31C24 19 31 9 44 0H61C43 14 39 23 40 33C41 45 35 55 29 64Z" fill="#F4F4F4"/>
  <path d="M22 58C29 47 33 39 32 30C31 21 36 14 45 7" fill="none" stroke="#3B3B3B" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 6"/>
  <circle cx="49" cy="13" r="7" fill="#B5B5B5" stroke="#3B3B3B" stroke-width="3"/>
</svg>`);

const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();

// ICO container with a lossless 32px PNG payload for legacy browser support.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const directory = Buffer.alloc(16);
directory.writeUInt8(32, 0);
directory.writeUInt8(32, 1);
directory.writeUInt8(0, 2);
directory.writeUInt8(0, 3);
directory.writeUInt16LE(1, 4);
directory.writeUInt16LE(32, 6);
directory.writeUInt32LE(png32.length, 8);
directory.writeUInt32LE(header.length + directory.length, 12);

await Promise.all([
  writeFile(new URL("../app/favicon.png", import.meta.url), png512),
  writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([header, directory, png32])),
]);

console.log("Generated app/favicon.png and app/favicon.ico from the Redrive brand mark.");
