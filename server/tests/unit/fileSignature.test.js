const { detectMimeType } = require('../../src/utils/fileSignature');
const { PNG_BYTES, PDF_BYTES } = require('../helpers/factory');

describe('detectMimeType', () => {
  test('recognises PNG and PDF by their first bytes', () => {
    expect(detectMimeType(PNG_BYTES)).toBe('image/png');
    expect(detectMimeType(PDF_BYTES)).toBe('application/pdf');
  });

  test('recognises JPEG and WEBP', () => {
    expect(detectMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('image/jpeg');
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    expect(detectMimeType(webp)).toBe('image/webp');
  });

  test('rejects anything else, including a renamed executable', () => {
    expect(detectMimeType(Buffer.from('MZ\x90\x00 this is not an image'))).toBeNull();
    expect(detectMimeType(Buffer.alloc(0))).toBeNull();
    expect(detectMimeType('not a buffer')).toBeNull();
  });
});
