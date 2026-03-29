'use strict';
const zlib = require('zlib');

function crc32(buf) {
  const t = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type);
  const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length);
  const td = Buffer.concat([t, data]);
  const cr = Buffer.allocUnsafe(4); cr.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, cr]);
}

module.exports = (req, res) => {
  const w = Math.min(Math.max(parseInt(req.query.w) || 1, 1), 3000);
  const h = Math.min(Math.max(parseInt(req.query.h) || 1, 1), 3000);

  // IHDR: width, height, 8-bit RGB
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Solid black: h rows of (filter_byte=0) + (w * 3 zero bytes)
  const raw = Buffer.alloc(h * (1 + w * 3), 0);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(png);
};
