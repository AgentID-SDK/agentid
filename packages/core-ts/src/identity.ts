import * as ed25519 from '@noble/ed25519';
import { open, readFile } from 'node:fs/promises';
import type { Keypair } from './types.js';
import { encodeHex, decodeHex, encodeBase58 } from './utils.js';

/** Generate a new Ed25519 keypair. */
export async function generateKeypair(): Promise<Keypair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
  return { publicKey, privateKey };
}

/** Derive a deterministic agent ID from a public key. */
export function getAgentId(publicKey: Uint8Array): string {
  const encoded = encodeBase58(publicKey);
  return `aid_ed25519_${encoded}`;
}

export interface SaveKeypairOptions {
  /** If true, overwrite an existing file. Defaults to false. */
  overwrite?: boolean;
}

/** Save a keypair to disk with restricted file permissions (0600). */
export async function saveKeypair(
  keypair: Keypair,
  path: string,
  options: SaveKeypairOptions = {}
): Promise<void> {
  const data = JSON.stringify({
    publicKey: encodeHex(keypair.publicKey),
    privateKey: encodeHex(keypair.privateKey),
  });

  const flags = options.overwrite ? 'w' : 'wx';
  let fd;
  try {
    fd = await open(path, flags, 0o600);
    await fd.writeFile(data, 'utf-8');
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(
        `Key file already exists at ${path}. Use { overwrite: true } to replace it, ` +
        `or back up the existing key first.`
      );
    }
    throw err;
  } finally {
    await fd?.close();
  }
}

/** Load a keypair from a file path or environment variable (prefix with 'env:'). */
export async function loadKeypair(source: string): Promise<Keypair> {
  let raw: string;

  if (source.startsWith('env:')) {
    const envVar = source.slice(4);
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    raw = value;
  } else {
    raw = await readFile(source, 'utf-8');
  }

  const parsed = JSON.parse(raw);
  if (!parsed.publicKey || !parsed.privateKey) {
    throw new Error('Invalid keypair format: missing publicKey or privateKey');
  }
  return {
    publicKey: decodeHex(parsed.publicKey),
    privateKey: decodeHex(parsed.privateKey),
  };
}
