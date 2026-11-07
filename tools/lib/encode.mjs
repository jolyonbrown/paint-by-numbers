// Compact binary encoding used in puzzle files: LEB128 varints (zigzag for signed), stored as base64.
// The matching decoder is js/codec.js in the app.

export class VarintWriter {
  constructor() { this.buf = new Uint8Array(1 << 16); this.len = 0; }
  byte(b) {
    if (this.len === this.buf.length) { const nb = new Uint8Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; }
    this.buf[this.len++] = b;
  }
  u(v) { // unsigned
    while (v >= 0x80) { this.byte((v & 0x7f) | 0x80); v = Math.floor(v / 128); }
    this.byte(v);
  }
  s(v) { this.u(v < 0 ? -2 * v - 1 : 2 * v); } // zigzag signed
  bytes() { return this.buf.subarray(0, this.len); }
  base64() { return toBase64(this.bytes()); }
}

export const toBase64 = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
