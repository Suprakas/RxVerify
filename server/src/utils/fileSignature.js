/**
 * Checks the first bytes of an upload ("magic numbers") so a renamed .exe
 * cannot pass as a .png just because the browser sent image/png.
 */
const SIGNATURES = [
  { mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    test: (b) =>
      b.length > 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
  { mime: 'application/pdf', test: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
];

function detectMimeType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const match = SIGNATURES.find((s) => s.test(buffer));
  return match ? match.mime : null;
}

module.exports = { detectMimeType };
