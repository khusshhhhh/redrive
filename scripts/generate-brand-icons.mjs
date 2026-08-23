import { writeFile } from "node:fs/promises";

import sharp from "sharp";

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#0B3338"/>
  <path d="M19 49V16h15c10 0 16 5 16 13S44 41 34 41H20M35 41l14 12" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="49" cy="15" r="6" fill="#D4A72C" stroke="#0B3338" stroke-width="3"/>
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
