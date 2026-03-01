const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function decodeHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const val = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(val)) throw new Error(`Invalid hex character at position ${i}`);
    bytes[i / 2] = val;
  }
  return bytes;
}

export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  let num = BigInt('0x' + encodeHex(bytes));
  const result: string[] = [];
  while (num > 0n) {
    const remainder = Number(num % 58n);
    num = num / 58n;
    result.unshift(BASE58_ALPHABET[remainder]);
  }
  for (const byte of bytes) {
    if (byte === 0) result.unshift('1');
    else break;
  }
  return result.join('') || '1';
}

export function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) throw new Error('Empty base58 string');
  let num = 0n;
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(index);
  }

  let leadingZeros = 0;
  for (const char of str) {
    if (char === '1') leadingZeros++;
    else break;
  }

  if (num === 0n) {
    return new Uint8Array(leadingZeros);
  }

  const hex = num.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex;
  const dataBytes = decodeHex(paddedHex);

  if (leadingZeros > 0) {
    const result = new Uint8Array(leadingZeros + dataBytes.length);
    result.set(dataBytes, leadingZeros);
    return result;
  }

  return dataBytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64(str: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'base64'));
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeBase64AsString(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
  return new TextDecoder().decode(decodeBase64(str));
}
