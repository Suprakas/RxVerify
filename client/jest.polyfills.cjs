// jsdom doesn't expose these Node globals, but React Router and RTK Query use them.
const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream, TransformStream } = require('stream/web');

Object.assign(globalThis, { TextEncoder, TextDecoder, ReadableStream, TransformStream });
require('whatwg-fetch');

// whatwg-fetch's Response has no .body, but React Router uses .body to recognise
// a Response (for example a redirect() from a loader or middleware).
if (!('body' in Response.prototype)) {
  Object.defineProperty(Response.prototype, 'body', {
    configurable: true,
    get() {
      return this._bodyInit ?? null;
    },
  });
}

// jsdom has no object URLs.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock';
  URL.revokeObjectURL = () => {};
}

// ScrollRestoration calls scrollTo, which jsdom doesn't implement.
window.scrollTo = () => {};
