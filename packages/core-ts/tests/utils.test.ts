import { describe, it, expect } from 'vitest';
import {
  encodeHex,
  decodeHex,
  encodeBase58,
  decodeBase58,
  encodeBase64,
  decodeBase64,
} from '../src/utils.js';

describe('utils', () => {
  describe('hex', () => {
    it('round-trips correctly', () => {
      const original = new Uint8Array([0, 1, 127, 128, 255]);
      const hex = encodeHex(original);
      expect(hex).toBe('00017f80ff');
      expect(decodeHex(hex)).toEqual(original);
    });

    it('rejects odd-length hex', () => {
      expect(() => decodeHex('abc')).toThrow('even length');
    });
  });

  describe('base58', () => {
    it('round-trips a 32-byte key', () => {
      const bytes = new Uint8Array(32);
      bytes[0] = 0xd7;
      bytes[31] = 0xe3;
      const encoded = encodeBase58(bytes);
      const decoded = decodeBase58(encoded);
      expect(decoded.length).toBe(32);
      expect(decoded[0]).toBe(0xd7);
      expect(decoded[31]).toBe(0xe3);
    });

    it('handles leading zeros', () => {
      const bytes = new Uint8Array([0, 0, 0, 1]);
      const encoded = encodeBase58(bytes);
      expect(encoded.startsWith('111')).toBe(true);
      const decoded = decodeBase58(encoded);
      expect(decoded).toEqual(bytes);
    });

    it('rejects invalid characters', () => {
      expect(() => decodeBase58('0OIl')).toThrow('Invalid base58');
    });
  });

  describe('base64', () => {
    it('round-trips correctly', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]);
      const encoded = encodeBase64(original);
      expect(decodeBase64(encoded)).toEqual(original);
    });
  });
});
