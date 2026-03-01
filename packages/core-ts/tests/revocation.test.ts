import { describe, it, expect } from 'vitest';
import { generateKeypair, getAgentId } from '../src/identity.js';
import { createRevocation, checkRevocation, loadRevocationList } from '../src/revocation.js';
import { verifyRevocationSignature } from '../src/verification.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

describe('revocation', () => {
  it('creates a signed revocation statement', async () => {
    const kp = await generateKeypair();
    const agentId = getAgentId(kp.publicKey);

    const revocation = await createRevocation(agentId, agentId, 'key_compromise', kp);

    expect(revocation.type).toBe('revocation');
    expect(revocation.agent_id).toBe(agentId);
    expect(revocation.revoked_key_id).toBe(agentId);
    expect(revocation.reason).toBe('key_compromise');
    expect(revocation.signature).toBeTruthy();
  });

  it('revocation signature is verifiable', async () => {
    const kp = await generateKeypair();
    const agentId = getAgentId(kp.publicKey);
    const revocation = await createRevocation(agentId, agentId, 'key_compromise', kp);

    const valid = await verifyRevocationSignature(revocation);
    expect(valid).toBe(true);
  });

  it('rejects tampered revocation', async () => {
    const kp = await generateKeypair();
    const agentId = getAgentId(kp.publicKey);
    const revocation = await createRevocation(agentId, agentId, 'key_compromise', kp);

    revocation.reason = 'tampered_reason';
    const valid = await verifyRevocationSignature(revocation);
    expect(valid).toBe(false);
  });

  it('checks revocation list correctly', async () => {
    const kp = await generateKeypair();
    const agentId = getAgentId(kp.publicKey);
    const revocation = await createRevocation(agentId, agentId, 'key_compromise', kp);

    const { revoked, statement } = checkRevocation(agentId, [revocation]);
    expect(revoked).toBe(true);
    expect(statement).toBeDefined();

    const { revoked: notRevoked } = checkRevocation('aid_ed25519_unknown', [revocation]);
    expect(notRevoked).toBe(false);
  });

  describe('loadRevocationList', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'agentid-revoke-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('loads and verifies a revocation list from file', async () => {
      const kp = await generateKeypair();
      const agentId = getAgentId(kp.publicKey);
      const revocation = await createRevocation(agentId, agentId, 'test', kp);

      const listPath = join(tempDir, 'revocations.json');
      await writeFile(listPath, JSON.stringify([revocation]));

      const list = await loadRevocationList(listPath);
      expect(list).toHaveLength(1);
      expect(list[0].agent_id).toBe(agentId);
    });

    it('filters out invalid signatures when verifying', async () => {
      const kp = await generateKeypair();
      const agentId = getAgentId(kp.publicKey);
      const revocation = await createRevocation(agentId, agentId, 'test', kp);

      const tampered = { ...revocation, reason: 'tampered' };
      const listPath = join(tempDir, 'revocations.json');
      await writeFile(listPath, JSON.stringify([revocation, tampered]));

      const list = await loadRevocationList(listPath, { verifySignatures: true });
      expect(list).toHaveLength(1);
    });

    it('loads all when signature verification is disabled', async () => {
      const kp = await generateKeypair();
      const agentId = getAgentId(kp.publicKey);
      const revocation = await createRevocation(agentId, agentId, 'test', kp);

      const tampered = { ...revocation, reason: 'tampered' };
      const listPath = join(tempDir, 'revocations.json');
      await writeFile(listPath, JSON.stringify([revocation, tampered]));

      const list = await loadRevocationList(listPath, { verifySignatures: false });
      expect(list).toHaveLength(2);
    });
  });
});
