import { describe, it, expect } from 'vitest';
import { generateKeypair, getAgentId, saveKeypair, loadKeypair } from '../src/identity.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, stat } from 'node:fs/promises';

describe('identity', () => {
  it('generates a valid Ed25519 keypair', async () => {
    const keypair = await generateKeypair();
    expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keypair.publicKey.length).toBe(32);
    expect(keypair.privateKey.length).toBe(32);
  });

  it('generates unique keypairs', async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
  });

  it('derives a deterministic agent ID from public key', async () => {
    const keypair = await generateKeypair();
    const id1 = getAgentId(keypair.publicKey);
    const id2 = getAgentId(keypair.publicKey);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^aid_ed25519_/);
  });

  it('derives different IDs for different keys', async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    expect(getAgentId(kp1.publicKey)).not.toBe(getAgentId(kp2.publicKey));
  });

  describe('save and load', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'agentid-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('saves and loads a keypair', async () => {
      const keypair = await generateKeypair();
      const path = join(tempDir, 'key.json');
      await saveKeypair(keypair, path);

      const loaded = await loadKeypair(path);
      expect(loaded.publicKey).toEqual(keypair.publicKey);
      expect(loaded.privateKey).toEqual(keypair.privateKey);
    });

    it('saves with restricted permissions (0600)', async () => {
      const keypair = await generateKeypair();
      const path = join(tempDir, 'key.json');
      await saveKeypair(keypair, path);

      const fileStat = await stat(path);
      const mode = fileStat.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('refuses to overwrite existing key by default', async () => {
      const keypair = await generateKeypair();
      const path = join(tempDir, 'key.json');
      await saveKeypair(keypair, path);

      await expect(saveKeypair(keypair, path)).rejects.toThrow(/already exists/);
    });

    it('allows overwrite when explicitly requested', async () => {
      const kp1 = await generateKeypair();
      const kp2 = await generateKeypair();
      const path = join(tempDir, 'key.json');

      await saveKeypair(kp1, path);
      await saveKeypair(kp2, path, { overwrite: true });

      const loaded = await loadKeypair(path);
      expect(loaded.publicKey).toEqual(kp2.publicKey);
    });

    it('loads from environment variable', async () => {
      const keypair = await generateKeypair();
      const data = JSON.stringify({
        publicKey: Array.from(keypair.publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
        privateKey: Array.from(keypair.privateKey).map(b => b.toString(16).padStart(2, '0')).join(''),
      });
      process.env.TEST_AGENTID_KEY = data;

      const loaded = await loadKeypair('env:TEST_AGENTID_KEY');
      expect(loaded.publicKey).toEqual(keypair.publicKey);

      delete process.env.TEST_AGENTID_KEY;
    });

    it('throws on missing environment variable', async () => {
      delete process.env.NONEXISTENT_KEY;
      await expect(loadKeypair('env:NONEXISTENT_KEY')).rejects.toThrow(/not set/);
    });
  });
});
