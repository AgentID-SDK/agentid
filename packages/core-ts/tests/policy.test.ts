import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/policy.js';
import { generateKeypair, getAgentId } from '../src/identity.js';
import { createManifest } from '../src/manifest.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Policy, AgentManifest, TrustLevel } from '../src/types.js';

const VECTORS_PATH = join(__dirname, '../../../spec/test-vectors/vectors.json');

describe('policy evaluation', () => {
  const makeContext = async (overrides: Record<string, unknown> = {}) => {
    const kp = await generateKeypair();
    const manifest = createManifest({
      agentId: getAgentId(kp.publicKey),
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [
        {
          id: 'payments:send',
          description: 'Send payments',
          constraints: { max_amount_usd: 500, require_human_approval_above_usd: 100 },
        },
      ],
      expiresAt: '2030-01-01T00:00:00Z',
    });

    return {
      manifest,
      trustLevel: 0 as TrustLevel,
      action: 'payments:send',
      actionParams: { amount_usd: 50 },
      revoked: false,
      expired: false,
      ...overrides,
    };
  };

  const policy: Policy = {
    policy_version: '0.1',
    rules: [
      {
        action: 'payments:send',
        require: {
          min_trust_level: 0,
          manifest_not_expired: true,
          not_revoked: true,
          capability_declared: 'payments:send',
          constraints_satisfied: true,
        },
        on_fail: 'REJECT',
      },
    ],
    default: 'REJECT',
  };

  it('accepts valid request within constraints', async () => {
    const ctx = await makeContext();
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('ACCEPT');
  });

  it('rejects amount exceeding max', async () => {
    const ctx = await makeContext({ actionParams: { amount_usd: 300_000 } });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('exceeds maximum'))).toBe(true);
  });

  it('rejects amount exceeding human approval threshold', async () => {
    const ctx = await makeContext({ actionParams: { amount_usd: 200 } });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('human approval'))).toBe(true);
  });

  it('rejects expired manifest', async () => {
    const ctx = await makeContext({ expired: true });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('expired'))).toBe(true);
  });

  it('rejects revoked key', async () => {
    const ctx = await makeContext({ revoked: true });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('revoked'))).toBe(true);
  });

  it('rejects undeclared capability', async () => {
    const ctx = await makeContext({ action: 'data:delete' });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
  });

  it('rejects insufficient trust level', async () => {
    const strictPolicy: Policy = {
      policy_version: '0.1',
      rules: [
        {
          action: 'payments:send',
          require: { min_trust_level: 1 },
          on_fail: 'REJECT',
        },
      ],
      default: 'REJECT',
    };
    const ctx = await makeContext();
    const result = evaluatePolicy(ctx, strictPolicy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('Trust level'))).toBe(true);
  });

  it('applies default for unmatched actions', async () => {
    const ctx = await makeContext({ action: 'unknown:action' });
    const result = evaluatePolicy(ctx, policy);
    expect(result.decision).toBe('REJECT');
    expect(result.reasons.some(r => r.includes('default'))).toBe(true);
  });

  describe('test vector consistency', () => {
    it('matches all test vector cases', async () => {
      const vectors = JSON.parse(await readFile(VECTORS_PATH, 'utf-8'));
      const vectorManifest = vectors.manifest.input as AgentManifest;
      const vectorPolicy = vectors.policy_evaluation.policy as Policy;
      const cases = vectors.policy_evaluation.cases;

      for (const tc of cases) {
        const ctx = {
          manifest: vectorManifest,
          trustLevel: tc.trust_level as TrustLevel,
          action: tc.action,
          actionParams: tc.action_params,
          revoked: tc.revoked,
          expired: tc.expired,
        };
        const result = evaluatePolicy(ctx, vectorPolicy);
        expect(result.decision, `Case "${tc.name}" failed`).toBe(tc.expected_decision);
      }
    });
  });
});
