import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const publicDir = path.resolve(process.cwd(), "public");
const iconsDir = path.join(publicDir, "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create clean, beautiful SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#3EDC6B" />
  <g transform="translate(106, 106) scale(0.5859)" fill="none" stroke="#111311" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
    <!-- Cooking Pot Icon (matching Lucide CookingPot icon in Kooking brand) -->
    <!-- Lid handle -->
    <path d="M 220 80 A 36 36 0 0 1 292 80" />
    <!-- Lid top curve -->
    <path d="M 100 160 Q 256 120 412 160" />
    <!-- Pot body -->
    <path d="M 80 180 L 432 180" />
    <path d="M 96 180 L 116 380 Q 120 420 160 420 L 352 420 Q 392 420 396 380 L 416 180" fill="#111311" fill-opacity="0.08" />
    <path d="M 96 180 L 116 380 Q 120 420 160 420 L 352 420 Q 392 420 396 380 L 416 180 Z" />
    <!-- Side handles -->
    <path d="M 80 230 C 40 230 40 290 80 290" />
    <path d="M 432 230 C 472 230 472 290 432 290" />
    <!-- Steam waves -->
    <path d="M 180 50 Q 190 30 180 10" />
    <path d="M 256 45 Q 266 25 256 5" />
    <path d="M 332 50 Q 342 30 332 10" />
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, "icon.svg"), svgContent);
console.log("Created icon.svg");

// 2. Pure Node.js uncompressed / zlib PNG generator
function createSolidPng(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Raw image data with filter byte 0 per scanline
  const scanlineWidth = width * 4;
  const rawData = Buffer.alloc(height * (scanlineWidth + 1));

  // Center logo boundaries in normalized coords
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const lineStart = y * (scanlineWidth + 1);
    rawData[lineStart] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelStart = lineStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded square / circle shape
      const inBox = Math.abs(dx) < radius && Math.abs(dy) < radius;
      const inCorner =
        Math.abs(dx) > radius - 24 && Math.abs(dy) > radius - 24
          ? Math.hypot(Math.abs(dx) - (radius - 24), Math.abs(dy) - (radius - 24)) < 24
          : true;

      if (inBox && inCorner) {
        // Simple silhouette of pot inside
        const potBody = Math.abs(dx) < radius * 0.55 && dy > -radius * 0.1 && dy < radius * 0.6;
        const potLid = Math.abs(dx) < radius * 0.45 && dy >= -radius * 0.35 && dy <= -radius * 0.1;
        const handleL =
          dx < -radius * 0.55 && dx > -radius * 0.72 && Math.abs(dy - radius * 0.2) < radius * 0.15;
        const handleR =
          dx > radius * 0.55 && dx < radius * 0.72 && Math.abs(dy - radius * 0.2) < radius * 0.15;

        if (potBody || potLid || handleL || handleR) {
          // Dark ink pot color (#111311)
          rawData[pixelStart] = 17;
          rawData[pixelStart + 1] = 19;
          rawData[pixelStart + 2] = 17;
          rawData[pixelStart + 3] = 255;
        } else {
          // Brand Green background (#3EDC6B)
          rawData[pixelStart] = 62;
          rawData[pixelStart + 1] = 220;
          rawData[pixelStart + 2] = 107;
          rawData[pixelStart + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pixelStart] = 0;
        rawData[pixelStart + 1] = 0;
        rawData[pixelStart + 2] = 0;
        rawData[pixelStart + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(length + 12);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, length + 8));
  chunk.writeUInt32BE(crc, length + 8);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

fs.writeFileSync(path.join(iconsDir, "icon-192.png"), createSolidPng(192, 192, 62, 220, 107));
fs.writeFileSync(path.join(iconsDir, "icon-512.png"), createSolidPng(512, 512, 62, 220, 107));
fs.writeFileSync(
  path.join(iconsDir, "apple-touch-icon.png"),
  createSolidPng(180, 180, 62, 220, 107),
);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), createSolidPng(32, 32, 62, 220, 107));

console.log(
  "Created real PNG icons: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico",
);
