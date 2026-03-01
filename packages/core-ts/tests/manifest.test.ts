import { describe, it, expect } from 'vitest';
import { createManifest, validateManifest, canonicalizeManifest } from '../src/manifest.js';
import { generateKeypair, getAgentId } from '../src/identity.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentManifest } from '../src/types.js';

const VECTORS_PATH = join(__dirname, '../../../spec/test-vectors/vectors.json');

describe('manifest', () => {
  it('creates a valid manifest', async () => {
    const kp = await generateKeypair();
    const manifest = createManifest({
      agentId: getAgentId(kp.publicKey),
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [{ id: 'data:read', description: 'Read data' }],
      expiresAt: '2030-01-01T00:00:00Z',
    });

    expect(manifest.manifest_version).toBe('0.1');
    expect(manifest.name).toBe('TestAgent');
    expect(manifest.capabilities).toHaveLength(1);
  });

  it('rejects manifest with missing required fields', () => {
    const errors = validateManifest({
      manifest_version: '0.1',
    } as AgentManifest);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Missing required field'))).toBe(true);
  });

  it('rejects invalid agent_id prefix', async () => {
    const errors = validateManifest({
      manifest_version: '0.1',
      agent_id: 'invalid_prefix_123',
      name: 'Test',
      version: '1.0.0',
      capabilities: [],
      expires_at: '2030-01-01T00:00:00Z',
    });
    expect(errors.some(e => e.includes('aid_ed25519_'))).toBe(true);
  });

  it('rejects name longer than 256 characters', async () => {
    const kp = await generateKeypair();
    const errors = validateManifest({
      manifest_version: '0.1',
      agent_id: getAgentId(kp.publicKey),
      name: 'x'.repeat(257),
      version: '1.0.0',
      capabilities: [],
      expires_at: '2030-01-01T00:00:00Z',
    });
    expect(errors.some(e => e.includes('256'))).toBe(true);
  });

  it('rejects invalid dates', async () => {
    const kp = await generateKeypair();
    const errors = validateManifest({
      manifest_version: '0.1',
      agent_id: getAgentId(kp.publicKey),
      name: 'Test',
      version: '1.0.0',
      capabilities: [],
      expires_at: 'not-a-date',
    });
    expect(errors.some(e => e.includes('ISO 8601'))).toBe(true);
  });

  describe('canonicalization', () => {
    it('produces deterministic output', async () => {
      const kp = await generateKeypair();
      const agentId = getAgentId(kp.publicKey);
      const manifest = createManifest({
        agentId,
        name: 'TestAgent',
        version: '1.0.0',
        capabilities: [{ id: 'data:read', description: 'Read data' }],
        expiresAt: '2030-01-01T00:00:00Z',
      });

      const c1 = canonicalizeManifest(manifest);
      const c2 = canonicalizeManifest(manifest);
      expect(c1).toBe(c2);
    });

    it('sorts keys lexicographically', async () => {
      const kp = await generateKeypair();
      const manifest = createManifest({
        agentId: getAgentId(kp.publicKey),
        name: 'Test',
        version: '1.0.0',
        capabilities: [],
        expiresAt: '2030-01-01T00:00:00Z',
      });

      const canonical = canonicalizeManifest(manifest);
      const parsed = JSON.parse(canonical);
      const keys = Object.keys(parsed);
      expect(keys).toEqual([...keys].sort());
    });

    it('omits null/undefined properties', async () => {
      const kp = await generateKeypair();
      const manifest = createManifest({
        agentId: getAgentId(kp.publicKey),
        name: 'Test',
        version: '1.0.0',
        capabilities: [],
        expiresAt: '2030-01-01T00:00:00Z',
      });

      const canonical = canonicalizeManifest(manifest);
      expect(canonical).not.toContain('operator');
      expect(canonical).not.toContain('policy_url');
      expect(canonical).not.toContain('metadata');
    });

    it('matches test vector', async () => {
      const vectors = JSON.parse(await readFile(VECTORS_PATH, 'utf-8'));
      const manifest = vectors.manifest.input as AgentManifest;
      const expected = vectors.manifest.canonicalized;

      const result = canonicalizeManifest(manifest);
      expect(result).toBe(expected);
    });
  });
});
