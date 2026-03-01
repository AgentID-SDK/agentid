import { describe, it, expect } from 'vitest';
import { generateKeypair, getAgentId } from '../src/identity.js';
import { createManifest } from '../src/manifest.js';
import { signManifest, signMessage } from '../src/signing.js';
import { verifySignedManifest, verifySignedMessage } from '../src/verification.js';

describe('signing and verification', () => {
  const makeManifest = async () => {
    const kp = await generateKeypair();
    const manifest = createManifest({
      agentId: getAgentId(kp.publicKey),
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [
        {
          id: 'payments:send',
          description: 'Send payments',
          constraints: { max_amount_usd: 500 },
        },
      ],
      expiresAt: '2030-01-01T00:00:00Z',
    });
    return { kp, manifest };
  };

  describe('manifest signing', () => {
    it('signs and verifies a manifest', async () => {
      const { kp, manifest } = await makeManifest();
      const signed = await signManifest(manifest, kp);
      const result = await verifySignedManifest(signed);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.trust_level).toBe(0);
      expect(result.agent_id).toBe(getAgentId(kp.publicKey));
      expect(result.manifest?.name).toBe('TestAgent');
    });

    it('rejects tampered payload', async () => {
      const { kp, manifest } = await makeManifest();
      const signed = await signManifest(manifest, kp);

      signed.payload = signed.payload.replace('TestAgent', 'TamperedAgent');
      const result = await verifySignedManifest(signed);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Signature verification failed'))).toBe(true);
    });

    it('rejects tampered signature', async () => {
      const { kp, manifest } = await makeManifest();
      const signed = await signManifest(manifest, kp);

      const sigBytes = Buffer.from(signed.signature, 'base64');
      sigBytes[0] ^= 0xff;
      signed.signature = sigBytes.toString('base64');

      const result = await verifySignedManifest(signed);
      expect(result.valid).toBe(false);
    });

    it('rejects wrong key', async () => {
      const { manifest } = await makeManifest();
      const wrongKp = await generateKeypair();
      const signed = await signManifest(manifest, wrongKp);
      const result = await verifySignedManifest(signed);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match'))).toBe(true);
    });

    it('detects expired manifest', async () => {
      const kp = await generateKeypair();
      const manifest = createManifest({
        agentId: getAgentId(kp.publicKey),
        name: 'TestAgent',
        version: '1.0.0',
        capabilities: [],
        expiresAt: '2020-01-01T00:00:00Z',
      });
      const signed = await signManifest(manifest, kp);
      const result = await verifySignedManifest(signed);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('detects revoked key', async () => {
      const { kp, manifest } = await makeManifest();
      const signed = await signManifest(manifest, kp);
      const agentId = getAgentId(kp.publicKey);

      const result = await verifySignedManifest(signed, {
        revokedKeyIds: new Set([agentId]),
      });

      expect(result.valid).toBe(false);
      expect(result.revoked).toBe(true);
    });
  });

  describe('message signing (handshake)', () => {
    it('signs and verifies a message', async () => {
      const kp = await generateKeypair();
      const agentId = getAgentId(kp.publicKey);
      const nonce = 'test-nonce-12345';
      const manifestRef = 'sha256:abcdef';

      const signed = await signMessage('hello', nonce, kp, manifestRef);
      const result = await verifySignedMessage(signed, agentId);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects wrong agent ID', async () => {
      const kp = await generateKeypair();
      const signed = await signMessage('hello', 'nonce', kp, 'ref');

      const result = await verifySignedMessage(signed, 'aid_ed25519_wrong');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('mismatch'))).toBe(true);
    });

    it('rejects tampered message', async () => {
      const kp = await generateKeypair();
      const signed = await signMessage('hello', 'nonce', kp, 'ref');
      signed.nonce = 'tampered-nonce';

      const result = await verifySignedMessage(signed);
      expect(result.valid).toBe(false);
    });
  });
});
