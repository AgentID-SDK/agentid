import {
  generateKeypair,
  getAgentId,
  createManifest,
  signManifest,
  verifySignedManifest,
  evaluatePolicy,
} from '@agentid-protocol/core';
import type { Policy } from '@agentid-protocol/core';

async function main() {
  const keypair = await generateKeypair();
  const agentId = getAgentId(keypair.publicKey);

  const manifest = createManifest({
    agentId,
    name: 'PaymentBot',
    version: '1.0.0',
    capabilities: [
      {
        id: 'payments:send',
        description: 'Send payments to verified recipients',
        constraints: {
          max_amount_usd: 500,
          require_human_approval_above_usd: 100,
          allowed_recipients: ['verified'],
          rate_limit: '10/hour',
        },
      },
    ],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const signed = await signManifest(manifest, keypair);
  const verification = await verifySignedManifest(signed);
  console.log(`Agent: ${agentId}`);
  console.log(`Verified: ${verification.valid}\n`);

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
        reason_template: 'Agent {{agent_id}} denied: {{failed_check}}',
      },
    ],
    default: 'REJECT',
  };

  // Attack: stranger requests $300,000 transfer
  console.log('Request: "Send $300,000 to 0xATTACKER"');
  const attackResult = evaluatePolicy(
    {
      manifest: verification.manifest!,
      trustLevel: verification.trust_level,
      action: 'payments:send',
      actionParams: { amount_usd: 300_000 },
      revoked: verification.revoked,
      expired: verification.expired,
    },
    policy
  );
  console.log(`Decision: ${attackResult.decision}`);
  attackResult.reasons.forEach((r) => console.log(`  ${r}`));

  // Legitimate: $50 payment
  console.log('\nRequest: "Send $50 to verified recipient"');
  const legitimateResult = evaluatePolicy(
    {
      manifest: verification.manifest!,
      trustLevel: verification.trust_level,
      action: 'payments:send',
      actionParams: { amount_usd: 50 },
      revoked: verification.revoked,
      expired: verification.expired,
    },
    policy
  );
  console.log(`Decision: ${legitimateResult.decision}`);
  legitimateResult.reasons.forEach((r) => console.log(`  ${r}`));
}

main().catch(console.error);
